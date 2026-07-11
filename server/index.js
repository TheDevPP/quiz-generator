#!/usr/bin/env node

import "dotenv/config";
import express from "express";
import Database from "better-sqlite3";
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { fileURLToPath } from "url";
import { dirname, join, extname } from "path";
import { randomUUID } from "crypto";
import multer from "multer";
import { Readable } from "stream";
import Anthropic from "@anthropic-ai/sdk";
import { extractText, chunkText } from "../mcp/server.js";
import { readFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- R2 Client ---

const R2 = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME;

// --- SQLite Database ---

const DB_PATH = join(__dirname, "..", "data", "quiz.db");

// Ensure data directory exists
import { mkdirSync } from "fs";
mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    r2_key TEXT NOT NULL UNIQUE,
    file_type TEXT NOT NULL,
    uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL CHECK (category IN ('Adolescent Health', 'General Health', 'Sexual and Reproductive Health')),
    question_text TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    explanation TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'verified', 'rejected')),
    question_type TEXT CHECK (question_type IN ('multiple_choice', 'true_or_false', 'scenario')),
    source_chunk TEXT,
    source_doc_id TEXT,
    rejection_reason TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    reviewed_at TEXT,
    FOREIGN KEY (source_doc_id) REFERENCES documents(id)
  );

  CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
  CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category);
`);

// Migration: add question_type column if it doesn't exist (for existing databases)
try {
  db.prepare("SELECT question_type FROM questions LIMIT 1").get();
} catch {
  db.exec("ALTER TABLE questions ADD COLUMN question_type TEXT CHECK (question_type IN ('multiple_choice', 'true_or_false', 'scenario'))");
}

// --- Multer for file uploads ---

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".pdf", ".docx"];
    const ext = extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}. Only PDF and DOCX are allowed.`));
    }
  },
});

// --- Express App ---

const app = express();
app.use(express.json());

// Serve static files
app.use(express.static(join(__dirname, "..")));

const PORT = process.env.PORT || 3000;

// --- Helper: stream to buffer ---

async function streamToBuffer(stream) {
  if (stream instanceof Buffer) return stream;
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

// --- Helper: simple auth middleware ---

function adminAuth(req, res, next) {
  const password = req.headers["x-admin-password"] || req.query.password;
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// --- Anthropic Client ---

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// --- Health Question Generation Skill (system prompt) ---

const SKILL_PROMPT = readFileSync(
  join(__dirname, "..", ".claude", "skills", "health-question-generation", "SKILL.md"),
  "utf-8"
);

// ============================================================
// Health Check
// ============================================================

app.get("/health", async (_req, res) => {
  const checks = { server: "ok", r2: null, database: null };

  // Database check
  try {
    db.prepare("SELECT 1").get();
    checks.database = "ok";
  } catch (err) {
    checks.database = `error: ${err.message}`;
  }

  // R2 check
  try {
    await R2.send(new HeadBucketCommand({ Bucket: BUCKET }));
    checks.r2 = "ok";
  } catch (err) {
    checks.r2 = `error: ${err.message}`;
  }

  const healthy = checks.r2 === "ok" && checks.database === "ok";
  res.status(healthy ? 200 : 503).json(checks);
});

// ============================================================
// Documents (admin only)
// ============================================================

// List uploaded documents
app.get("/api/documents", adminAuth, (_req, res) => {
  const docs = db.prepare("SELECT * FROM documents ORDER BY uploaded_at DESC").all();
  res.json(docs);
});

// Upload a document to R2 and record in DB
app.post("/api/documents/upload", adminAuth, upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file provided" });
  }

  const ext = extname(req.file.originalname).toLowerCase();
  const id = randomUUID();
  const r2Key = `references/${id}${ext}`;

  try {
    // Upload to R2
    await R2.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: r2Key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      })
    );

    // Record in database
    db.prepare(
      "INSERT INTO documents (id, filename, r2_key, file_type) VALUES (?, ?, ?, ?)"
    ).run(id, req.file.originalname, r2Key, ext.replace(".", ""));

    res.status(201).json({ id, filename: req.file.originalname, r2_key: r2Key });
  } catch (err) {
    res.status(500).json({ error: `Upload failed: ${err.message}` });
  }
});

// List files in R2 bucket (raw)
app.get("/api/documents/r2-list", adminAuth, async (_req, res) => {
  try {
    const response = await R2.send(new ListObjectsV2Command({ Bucket: BUCKET }));
    const files = (response.Contents || []).map((obj) => ({
      key: obj.Key,
      size: obj.Size,
      lastModified: obj.LastModified?.toISOString(),
    }));
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: `Failed to list R2 objects: ${err.message}` });
  }
});

// Generate questions from a document (admin only)
app.post("/api/documents/:id/generate", adminAuth, async (req, res) => {
  const doc = db.prepare("SELECT * FROM documents WHERE id = ?").get(req.params.id);
  if (!doc) {
    return res.status(404).json({ error: "Document not found" });
  }

  // Extract and chunk the document
  let chunks;
  try {
    const extracted = await extractText(doc.r2_key);
    chunks = chunkText(extracted.text).map((chunk, index, arr) => ({
      chunk_text: chunk,
      source_page: `chunk ${index + 1} of ${arr.length}`,
      source_doc: doc.filename,
    }));
  } catch (err) {
    return res.status(500).json({ error: `Extraction failed: ${err.message}` });
  }

  const summary = {
    document_id: doc.id,
    filename: doc.filename,
    total_chunks: chunks.length,
    generated: { multiple_choice: 0, true_or_false: 0, scenario: 0 },
    skipped: [],
    stored: 0,
  };

  const insertStmt = db.prepare(
    `INSERT INTO questions (id, category, question_text, correct_answer, explanation, option_a, option_b, option_c, option_d, question_type, source_chunk, source_doc_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (let i = 0; i < chunks.length; i++) {
    const { chunk_text, source_page, source_doc } = chunks[i];

    // Skip chunks that are too short
    if (chunk_text.length < 100) {
      summary.skipped.push({ chunk: i + 1, reason: "chunk_too_short" });
      continue;
    }

    // Call Claude API
    let responseText;
    try {
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: SKILL_PROMPT,
        messages: [
          {
            role: "user",
            content: `Generate a quiz question from this source chunk.\n\nSource document: ${source_doc}\nSource page: ${source_page}\n\nChunk:\n${chunk_text}`,
          },
        ],
      });
      responseText = message.content[0]?.text;
    } catch (err) {
      summary.skipped.push({ chunk: i + 1, reason: `api_error: ${err.message}` });
      continue;
    }

    // Parse the JSON response
    let qa;
    try {
      // Strip markdown code fences if present
      const cleaned = responseText.replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?```\s*$/m, "").trim();
      qa = JSON.parse(cleaned);
    } catch (err) {
      summary.skipped.push({ chunk: i + 1, reason: `invalid_json: ${err.message}` });
      continue;
    }

    // Skip flagged chunks
    if (qa.flagged) {
      summary.skipped.push({ chunk: i + 1, reason: qa.flag_reason || "flagged_by_model" });
      continue;
    }

    // Validate required fields
    const validTypes = ["multiple_choice", "true_or_false", "scenario"];
    if (!qa.question_type || !validTypes.includes(qa.question_type)) {
      summary.skipped.push({ chunk: i + 1, reason: `invalid_question_type: ${qa.question_type}` });
      continue;
    }

    if (!qa.category || !qa.explanation || !qa.correct || !qa.options) {
      summary.skipped.push({ chunk: i + 1, reason: "missing_required_fields" });
      continue;
    }

    // Build question_text and options based on type
    let question_text;
    if (qa.question_type === "true_or_false") {
      question_text = qa.statement;
    } else if (qa.question_type === "scenario") {
      question_text = `${qa.scenario}\n\n${qa.question}`;
    } else {
      question_text = qa.question;
    }

    const optionKeys = Object.keys(qa.options);
    if (optionKeys.length < 4 && qa.question_type !== "true_or_false") {
      summary.skipped.push({ chunk: i + 1, reason: "insufficient_options" });
      continue;
    }

    const id = randomUUID();
    try {
      insertStmt.run(
        id,
        qa.category,
        question_text,
        qa.correct,
        qa.explanation,
        qa.options.A || "",
        qa.options.B || "",
        qa.options.C || "",
        qa.options.D || "",
        qa.question_type,
        chunk_text,
        doc.id
      );
      summary.generated[qa.question_type]++;
      summary.stored++;
    } catch (err) {
      summary.skipped.push({ chunk: i + 1, reason: `db_error: ${err.message}` });
    }
  }

  res.status(201).json(summary);
});

// ============================================================
// Questions
// ============================================================

// Get questions by status (admin) or only verified (public)
app.get("/api/quiz/question", (req, res) => {
  const { category, exclude } = req.query;
  const excludeIds = exclude ? exclude.split(",").filter(Boolean) : [];

  let sql = "SELECT id, category, question_text, question_type, option_a, option_b, option_c, option_d FROM questions WHERE status = 'verified'";
  const params = [];

  if (category) {
    sql += " AND category = ?";
    params.push(category);
  }

  if (excludeIds.length > 0) {
    const placeholders = excludeIds.map(() => "?").join(",");
    sql += ` AND id NOT IN (${placeholders})`;
    params.push(...excludeIds);
  }

  sql += " ORDER BY RANDOM() LIMIT 1";
  let question = db.prepare(sql).get(...params);

  if (!question) {
    // All questions seen — reset and start over
    let resetSql = "SELECT id, category, question_text, question_type, option_a, option_b, option_c, option_d FROM questions WHERE status = 'verified'";
    const resetParams = [];
    if (category) {
      resetSql += " AND category = ?";
      resetParams.push(category);
    }
    resetSql += " ORDER BY RANDOM() LIMIT 1";
    question = db.prepare(resetSql).get(...resetParams);
    if (!question) {
      return res.status(404).json({ error: "No questions available" });
    }
    return res.json({ ...question, reset: true });
  }

  res.json(question);
});

// Get a single question by ID
app.get("/api/questions/:id", (req, res) => {
  const question = db.prepare("SELECT * FROM questions WHERE id = ?").get(req.params.id);
  if (!question) return res.status(404).json({ error: "Question not found" });
  res.json(question);
});

// Create a new question (pending_review) — admin only
app.post("/api/questions", adminAuth, (req, res) => {
  const {
    category,
    question_text,
    correct_answer,
    explanation,
    option_a,
    option_b,
    option_c,
    option_d,
    question_type,
    source_chunk,
    source_doc_id,
  } = req.body;

  const validCategories = [
    "Adolescent Health",
    "General Health",
    "Sexual and Reproductive Health",
  ];

  if (!category || !validCategories.includes(category)) {
    return res.status(400).json({
      error: `Invalid category. Must be one of: ${validCategories.join(", ")}`,
    });
  }

  if (!question_text || !correct_answer || !explanation || !option_a || !option_b || !option_c || !option_d) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const validTypes = ["multiple_choice", "true_or_false", "scenario"];
  if (question_type && !validTypes.includes(question_type)) {
    return res.status(400).json({
      error: `Invalid question_type. Must be one of: ${validTypes.join(", ")}`,
    });
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO questions (id, category, question_text, correct_answer, explanation, option_a, option_b, option_c, option_d, question_type, source_chunk, source_doc_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, category, question_text, correct_answer, explanation, option_a, option_b, option_c, option_d, question_type || null, source_chunk || null, source_doc_id || null);

  res.status(201).json({ id, status: "pending_review" });
});

// Bulk create questions — admin only
app.post("/api/questions/bulk", adminAuth, (req, res) => {
  const { questions } = req.body;
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: "Provide an array of questions" });
  }

  const insert = db.prepare(
    `INSERT INTO questions (id, category, question_text, correct_answer, explanation, option_a, option_b, option_c, option_d, question_type, source_chunk, source_doc_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const insertMany = db.transaction((items) => {
    const ids = [];
    for (const q of items) {
      const id = randomUUID();
      insert.run(
        id,
        q.category,
        q.question_text,
        q.correct_answer,
        q.explanation,
        q.option_a,
        q.option_b,
        q.option_c,
        q.option_d,
        q.question_type || null,
        q.source_chunk || null,
        q.source_doc_id || null
      );
      ids.push(id);
    }
    return ids;
  });

  try {
    const ids = insertMany(questions);
    res.status(201).json({ created: ids.length, ids });
  } catch (err) {
    res.status(500).json({ error: `Bulk insert failed: ${err.message}` });
  }
});

// Review a question (admin only) — approve, reject, or edit
app.patch("/api/questions/:id/review", adminAuth, (req, res) => {
  const { action, rejection_reason, edits } = req.body;
  const validActions = ["approve", "reject", "edit"];

  if (!action || !validActions.includes(action)) {
    return res.status(400).json({ error: `Invalid action. Must be one of: ${validActions.join(", ")}` });
  }

  const question = db.prepare("SELECT * FROM questions WHERE id = ?").get(req.params.id);
  if (!question) return res.status(404).json({ error: "Question not found" });

  if (question.status !== "pending_review") {
    return res.status(400).json({ error: `Cannot review question with status '${question.status}'` });
  }

  if (action === "approve") {
    db.prepare("UPDATE questions SET status = 'verified', reviewed_at = datetime('now') WHERE id = ?").run(req.params.id);
    res.json({ id: req.params.id, status: "verified" });
  } else if (action === "reject") {
    if (!rejection_reason) {
      return res.status(400).json({ error: "rejection_reason is required" });
    }
    db.prepare(
      "UPDATE questions SET status = 'rejected', rejection_reason = ?, reviewed_at = datetime('now') WHERE id = ?"
    ).run(rejection_reason, req.params.id);
    res.json({ id: req.params.id, status: "rejected" });
  } else if (action === "edit") {
    if (!edits || typeof edits !== "object") {
      return res.status(400).json({ error: "edits object is required" });
    }

    const allowedFields = [
      "question_text",
      "correct_answer",
      "explanation",
      "option_a",
      "option_b",
      "option_c",
      "option_d",
      "category",
    ];

    const setClauses = [];
    const params = [];

    for (const [field, value] of Object.entries(edits)) {
      if (allowedFields.includes(field) && value !== undefined) {
        setClauses.push(`${field} = ?`);
        params.push(value);
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: "No valid fields to edit" });
    }

    setClauses.push("status = 'verified'");
    setClauses.push("reviewed_at = datetime('now')");
    params.push(req.params.id);

    db.prepare(`UPDATE questions SET ${setClauses.join(", ")} WHERE id = ?`).run(...params);
    res.json({ id: req.params.id, status: "verified", edited: Object.keys(edits) });
  }
});

// ============================================================
// Quiz (public)
// ============================================================

// Submit an answer and get the result
app.post("/api/quiz/answer", (req, res) => {
  const { question_id, answer } = req.body;

  if (!question_id || !answer) {
    return res.status(400).json({ error: "question_id and answer are required" });
  }

  const question = db.prepare(
    "SELECT id, correct_answer, explanation FROM questions WHERE id = ? AND status = 'verified'"
  ).get(question_id);

  if (!question) {
    return res.status(404).json({ error: "Question not found" });
  }

  const correct = answer === question.correct_answer;
  res.json({
    correct,
    correct_answer: question.correct_answer,
    explanation: question.explanation,
  });
});

// ============================================================
// Stats (admin)
// ============================================================

app.get("/api/stats", adminAuth, (_req, res) => {
  const total = db.prepare("SELECT COUNT(*) as count FROM questions").get().count;
  const pending = db.prepare("SELECT COUNT(*) as count FROM questions WHERE status = 'pending_review'").get().count;
  const verified = db.prepare("SELECT COUNT(*) as count FROM questions WHERE status = 'verified'").get().count;
  const rejected = db.prepare("SELECT COUNT(*) as count FROM questions WHERE status = 'rejected'").get().count;
  const docs = db.prepare("SELECT COUNT(*) as count FROM documents").get().count;

  const byCategory = db.prepare(
    "SELECT category, status, COUNT(*) as count FROM questions GROUP BY category, status"
  ).all();

  res.json({ total, pending, verified, rejected, documents: docs, byCategory });
});

// --- Start ---

app.listen(PORT, () => {
  console.log(`Quiz Generator server running at http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  db.close();
  process.exit(0);
});
process.on("SIGTERM", () => {
  db.close();
  process.exit(0);
});
