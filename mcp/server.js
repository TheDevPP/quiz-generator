#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_BASE = "https://opentdb.com/api.php";

// HTML entity map for decoding Open Trivia DB responses
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
  // URL-decode first (Open Trivia DB url3986 encoding)
  let decoded = decodeURIComponent(str);
  // Replace named HTML entities
  for (const [entity, char] of Object.entries(HTML_ENTITIES)) {
    decoded = decoded.replaceAll(entity, char);
  }
  // Replace numeric decimal entities: &#123;
  decoded = decoded.replace(/&#(\d+);/g, (_, code) =>
    String.fromCharCode(Number(code))
  );
  // Replace numeric hex entities: &#x1F;
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
  return decoded;
}

// Response code meanings from Open Trivia DB
const RESPONSE_CODES = {
  0: "Success",
  1: "No Results - the API doesn't have enough questions for the query",
  2: "Invalid Parameter - contains an invalid parameter",
  3: "Token Not Found - session token does not exist",
  4: "Token Empty - all questions have been exhausted for the session",
  5: "Rate Limit - too many requests, wait 5 seconds",
};

const server = new McpServer({
  name: "quiz-generator",
  version: "1.0.0",
});

server.tool(
  "get_questions",
  "Fetch trivia questions from Open Trivia DB. Returns an array of questions with decoded text, correct answer, and incorrect answers.",
  {
    amount: z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(10)
      .describe("Number of questions to fetch (1-50)"),
    category: z
      .number()
      .int()
      .min(9)
      .max(32)
      .optional()
      .describe(
        "Category ID (9=General Knowledge, 10=Books, 11=Film, 12=Music, 14=Television, 15=Video Games, 17=Science & Nature, 18=Computers, 19=Mathematics, 20=Mythology, 21=Sports, 22=Geography, 23=History, 24=Politics, 25=Art, 26=Celebrities, 27=Animals, 28=Vehicles, 29=Comics, 30=Gadgets, 31=Anime & Manga, 32=Cartoon & Animations)"
      ),
    difficulty: z
      .enum(["easy", "medium", "hard"])
      .optional()
      .describe("Difficulty level"),
    type: z
      .enum(["multiple", "boolean"])
      .optional()
      .describe("Question type: multiple (4 options) or boolean (true/false)"),
  },
  async ({ amount, category, difficulty, type }) => {
    const params = new URLSearchParams({ amount: String(amount) });
    if (category !== undefined) params.set("category", String(category));
    if (difficulty !== undefined) params.set("difficulty", difficulty);
    if (type !== undefined) params.set("type", type);
    // Use url3986 encoding to avoid encoding issues
    params.set("encode", "url3986");

    const url = `${API_BASE}?${params.toString()}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        return {
          content: [
            {
              type: "text",
              text: `Open Trivia DB returned HTTP ${response.status}: ${response.statusText}`,
            },
          ],
          isError: true,
        };
      }

      const data = await response.json();

      if (data.response_code !== 0) {
        const reason =
          RESPONSE_CODES[data.response_code] || `Unknown code ${data.response_code}`;
        return {
          content: [
            {
              type: "text",
              text: `Open Trivia DB error (code ${data.response_code}): ${reason}`,
            },
          ],
          isError: true,
        };
      }

      const questions = data.results.map((q) => ({
        question: decodeText(q.question),
        correct_answer: decodeText(q.correct_answer),
        incorrect_answers: q.incorrect_answers.map(decodeText),
        category: decodeText(q.category),
        difficulty: q.difficulty,
        type: q.type,
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(questions, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to fetch from Open Trivia DB: ${err.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
