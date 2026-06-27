#!/usr/bin/env node

import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const API_BASE = "https://opentdb.com/api.php";

// --- HTML entity decoding (shared logic with mcp/server.js) ---

const HTML_ENTITIES = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#039;": "'",
  "&apos;": "'",
  "&ldquo;": "“",
  "&rdquo;": "”",
  "&lsquo;": "‘",
  "&rsquo;": "’",
  "&ndash;": "–",
  "&mdash;": "—",
  "&hellip;": "…",
  "&nbsp;": " ",
  "&eacute;": "é",
  "&egrave;": "è",
  "&uuml;": "ü",
  "&ouml;": "ö",
  "&auml;": "ä",
  "&szlig;": "ß",
};

function decodeText(str) {
  if (typeof str !== "string") return str;
  let decoded = decodeURIComponent(str);
  for (const [entity, char] of Object.entries(HTML_ENTITIES)) {
    decoded = decoded.replaceAll(entity, char);
  }
  decoded = decoded.replace(/&#(\d+);/g, (_, code) =>
    String.fromCharCode(Number(code))
  );
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
  return decoded;
}

// --- Response codes ---

const RESPONSE_CODES = {
  0: "Success",
  1: "No Results - the API doesn't have enough questions for the query",
  2: "Invalid Parameter - contains an invalid parameter",
  3: "Token Not Found - session token does not exist",
  4: "Token Empty - all questions have been exhausted for the session",
  5: "Rate Limit - too many requests, wait 5 seconds",
};

// --- Static files ---

app.use(express.static(__dirname));

// --- API endpoint ---

app.get("/api/questions", async (req, res) => {
  const amount = Math.min(50, Math.max(1, parseInt(req.query.amount) || 10));
  const category = req.query.category;
  const difficulty = req.query.difficulty;
  const type = req.query.type;

  const params = new URLSearchParams({ amount: String(amount), encode: "url3986" });
  if (category) params.set("category", category);
  if (difficulty) params.set("difficulty", difficulty);
  if (type) params.set("type", type);

  const url = `${API_BASE}?${params.toString()}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return res.status(502).json({
        error: `Open Trivia DB returned HTTP ${response.status}: ${response.statusText}`,
      });
    }

    const data = await response.json();

    if (data.response_code !== 0) {
      const reason =
        RESPONSE_CODES[data.response_code] || `Unknown code ${data.response_code}`;
      return res.status(502).json({
        error: `Open Trivia DB error (code ${data.response_code}): ${reason}`,
      });
    }

    const questions = data.results.map((q) => ({
      question: decodeText(q.question),
      correct_answer: decodeText(q.correct_answer),
      incorrect_answers: q.incorrect_answers.map(decodeText),
      category: decodeText(q.category),
      difficulty: q.difficulty,
      type: q.type,
    }));

    res.json(questions);
  } catch (err) {
    res.status(502).json({
      error: `Failed to fetch from Open Trivia DB: ${err.message}`,
    });
  }
});

// --- Start ---

app.listen(PORT, () => {
  console.log(`Quiz Generator running at http://localhost:${PORT}`);
});
