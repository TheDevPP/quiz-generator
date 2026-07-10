#!/usr/bin/env node

import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { S3Client, GetObjectCommand, ListObjectsV2Command, HeadObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { z } from "zod";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

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

// --- Helpers ---

async function streamToBuffer(stream) {
  if (stream instanceof Buffer) return stream;
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

async function downloadFromR2(key) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const response = await R2.send(command);
  return streamToBuffer(response.Body);
}

function getFileExtension(key) {
  const parts = key.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

function chunkText(text, maxChunkSize = 1500) {
  // Split by paragraphs first, then merge small paragraphs into chunks
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const chunks = [];
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (currentChunk.length + trimmed.length + 2 > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = "";
    }
    currentChunk += (currentChunk ? "\n\n" : "") + trimmed;
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  // If a single paragraph exceeds maxChunkSize, split by sentences
  const result = [];
  for (const chunk of chunks) {
    if (chunk.length <= maxChunkSize) {
      result.push(chunk);
    } else {
      const sentences = chunk.match(/[^.!?]+[.!?]+\s*/g) || [chunk];
      let sentenceChunk = "";
      for (const sentence of sentences) {
        if (sentenceChunk.length + sentence.length > maxChunkSize && sentenceChunk.length > 0) {
          result.push(sentenceChunk.trim());
          sentenceChunk = "";
        }
        sentenceChunk += sentence;
      }
      if (sentenceChunk.trim().length > 0) {
        result.push(sentenceChunk.trim());
      }
    }
  }

  return result;
}

// --- Text Extraction ---

async function extractPdf(buffer) {
  const parser = new PDFParse({ data: buffer });
  const [textResult, infoResult] = await Promise.all([
    parser.getText(),
    parser.getInfo({ parsePageInfo: true }),
  ]);
  await parser.destroy();
  return {
    text: textResult.text,
    pageCount: infoResult.total || 0,
    info: infoResult.info || {},
  };
}

async function extractDocx(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return {
    text: result.value,
    warnings: result.messages || [],
  };
}

async function extractText(key) {
  const ext = getFileExtension(key);
  const buffer = await downloadFromR2(key);

  if (ext === "pdf") {
    return extractPdf(buffer);
  } else if (ext === "docx") {
    return extractDocx(buffer);
  } else {
    throw new Error(`Unsupported file type: .${ext}. Only PDF and DOCX are supported.`);
  }
}

// --- MCP Server ---

const server = new McpServer({
  name: "quiz-generator-r2",
  version: "1.0.0",
});

server.tool(
  "extract_reference",
  "Extract and chunk text from a PDF or Word document stored in Cloudflare R2. Returns an array of { chunk_text, source_page, source_doc }.",
  {
    file_path: z
      .string()
      .describe("The R2 object key (file path) of the document to extract, e.g. 'handbooks/health-guide.pdf'"),
    max_chunk_size: z
      .number()
      .int()
      .min(200)
      .max(5000)
      .default(1500)
      .optional()
      .describe("Maximum characters per chunk (default: 1500)"),
  },
  async ({ file_path, max_chunk_size }) => {
    try {
      // Verify file exists
      try {
        await R2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: file_path }));
      } catch (err) {
        if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
          return {
            content: [{ type: "text", text: `File not found in R2: ${file_path}` }],
            isError: true,
          };
        }
        throw err;
      }

      const extracted = await extractText(file_path);
      const chunks = chunkText(extracted.text, max_chunk_size || 1500);

      const result = chunks.map((chunk, index) => ({
        chunk_text: chunk,
        source_page: extracted.pageCount ? `chunk ${index + 1} of ${chunks.length}` : undefined,
        source_doc: file_path,
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Failed to extract reference: ${err.message}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "list_references",
  "Returns metadata list of uploaded reference documents in Cloudflare R2.",
  {},
  async () => {
    try {
      const command = new ListObjectsV2Command({ Bucket: BUCKET });
      const response = await R2.send(command);

      const files = (response.Contents || []).map((obj) => ({
        key: obj.Key,
        size: obj.Size,
        lastModified: obj.LastModified?.toISOString(),
        type: getFileExtension(obj.Key),
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(files, null, 2) }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Failed to list references: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// --- Exports (for use by server/index.js) ---

export { downloadFromR2, extractText, chunkText };

// --- Start ---

const transport = new StdioServerTransport();
await server.connect(transport);
