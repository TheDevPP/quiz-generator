# Quiz Generator

> Name: TBD — to be updated before launch

A health education quiz platform for teenagers and youth in Myanmar, focused on adolescent health and STD education. All content is reviewed by a volunteer doctor and health professional team before going live.

Built using Claude Code MCP servers, skills, and subagents.

## Target Audience

**Teenagers and youth in Myanmar.** All question language, answer options, and explanations must be written in:
- Plain, non-clinical, peer-appropriate language
- No shame-based framing, especially for STD content
- Normalize topics; do not sensationalize

The health-question-generation skill enforces this tone explicitly.

## Question Categories

The quiz supports exactly three categories. These are the only categories; the quiz UI allows users to select one before starting.

- **Adolescent Health**
- **General Health**
- **Sexual and Reproductive Health (SRH)**

## Tech Stack

- **Frontend:** Plain HTML/CSS/JS (no framework) — quiz UI for end users
- **Admin UI:** Separate plain HTML/CSS/JS — for doctor/health team review
- **Backend:** Node.js/Express server (`server/index.js`) — coordinates all components, handles Claude API calls, serves admin UI
- **Data source (health):** Admin-uploaded reference documents (PDFs, Word files) stored in Cloudflare R2
- **AI workflows:** Claude Code skill for health question generation, subagent for doctor review queue
- **Runtime API:** Claude API (not Claude Code) for health question generation from reference chunks

## Project Structure

```
.claude/
  skills/
    health-question-generation/SKILL.md  # Skill: source chunk → teen-appropriate health Q&A
  agents/
    doctor-review-queue.md               # Subagent: manages review workflow for generated health Q&A
mcp/
  server.js                              # MCP server: R2 document tools (extract_reference, list_references)
server/
  index.js                               # Backend server: Claude API calls, R2 coordination, REST endpoints, admin UI serving
admin/
  index.html                             # Admin UI for doctor/health team
  style.css                              # Admin styles
  app.js                                 # Admin logic
index.html                               # Quiz UI (end users)
style.css                                # Quiz styles
app.js                                   # Quiz logic and state management
```

## Components

### Backend Server (`server/index.js`)

A lightweight Node.js/Express server responsible for:

- Handling all Claude API calls for health question generation — the API key lives server-side only, never exposed to the frontend or admin UI
- Coordinating between the MCP server, Cloudflare R2, and the review queue database
- Serving the admin UI with shared-password protection
- Exposing simple REST endpoints that the quiz frontend and admin UI communicate with — no external API is called directly from either UI

### MCP Server (`mcp/server.js`)

Handles R2 document interactions. The frontend and admin UI never call external services directly.

**R2 document tools:**
- `extract_reference(file_path)` — Extracts and chunks text from a PDF or Word document stored in Cloudflare R2. Returns an array of `{ chunk_text, source_page, source_doc }`.
- `list_references()` — Returns metadata list of uploaded reference documents.

**When to use the MCP server:**
- Uploading, listing, or extracting text from reference documents in R2
- Any time the app needs data from Cloudflare R2

The MCP server is the *only* way to talk to Cloudflare R2. Do not call the R2 API directly from the frontend, admin UI, or other scripts.

### Health Question Generation Skill (`.claude/skills/health-question-generation/SKILL.md`)

Encodes how to generate multiple-choice questions from a source chunk extracted from a reference document.

**Rules enforced by this skill:**
- Teen-appropriate, non-clinical, peer-appropriate language
- One correct answer with a 2–3 sentence plain-language explanation
- Three plausible incorrect answers
- Source-grounded only — no invented medical facts not present in the chunk
- Flag any chunk that is too ambiguous to generate a reliable question from
- STD-specific tone: normalize, don't sensationalize; no shame-based framing
- Questions must not contradict or go beyond what the reference handbook says

**When to invoke the health-question-generation skill:**
- During the question generation workflow (called as the system prompt for Claude API runtime calls)
- When reviewing whether a generated question meets quality and tone standards

### Doctor Review Queue Subagent (`.claude/agents/doctor-review-queue.md`)

Manages the review workflow for AI-generated health questions. The doctor interacts through the admin web UI, not Claude Code directly. This subagent defines the logic and rules of the review process.

**Input:** A pending Q&A set with its source chunk.

**Output:** One of:
- **Approved** — question enters the quiz pool with status `verified`
- **Edited-then-approved** — doctor modifies the question/answers/explanation, then approves
- **Rejected** — question is discarded with a reason

**When to delegate to the doctor-review-queue subagent:**
- When the admin UI submits a review decision on a pending Q&A set
- When validating that an edited question still meets quality and tone standards before final approval

## Workflows

### Workflow: One Quiz Question

1. **Select category** — User picks one of the three categories in the quiz UI
2. **Fetch** — Backend serves a `status: "verified"` health question from the selected category
3. **Present** — Display the question in the UI
4. **Answer** — User selects an answer; record correct/incorrect
5. **Repeat** — Fetch the next verified question from the same category

### Workflow: Health Question Generation

1. **Upload** — Admin uploads a reference document (PDF/Word) via admin UI; stored in Cloudflare R2
2. **Extract** — Call `extract_reference` MCP tool to chunk the document into `{ chunk_text, source_page, source_doc }`
3. **Generate** — For each chunk, call Claude API (runtime, not Claude Code) with the chunk as input and the health-question-generation skill's rules as the system prompt. Each call produces a multiple-choice question with explanation.
4. **Store** — Generated Q&A sets are saved with `status: "pending_review"`, linked to the source chunk that produced them
5. **Review** — Doctor uses the admin UI to review each Q&A set. They see the question, answers, explanation, and source chunk side by side. Each set is approved, edited-then-approved, or rejected with a reason.
6. **Publish** — Approved questions enter the quiz pool with `status: "verified"` and become available to end users

### Workflow: Doctor Review (admin UI)

1. Doctor opens admin UI, authenticates with shared admin password
2. Views list of pending Q&A sets, each showing the generated question alongside the source chunk
3. For each set: approves as-is, edits then approves, or rejects with a reason
4. The doctor-review-queue subagent enforces review rules and validates edits

## Privacy

No user data is collected at any point. The app records nothing about who uses it, what questions they answer, or how they perform. This is stated explicitly in the quiz UI.

## Reference Handbook

The reference handbook has been used in health education for 3 years by a strong professional team. Treat its content as the **authoritative source**. Generated questions must not contradict or go beyond what the handbook says.

## Admin UI

A separate web interface for the doctor/health team, distinct from the quiz frontend.

**Capabilities:**
- Upload reference documents (PDFs, Word files) to Cloudflare R2
- Trigger question generation from a selected document
- Review pending Q&A sets — see question, answers, explanation, and source chunk side by side
- Approve, edit-then-approve, or reject each Q&A set

**Authentication:** Simple shared admin password (v1). No complex auth needed given the small trusted team.

## Development Notes

- The frontend is static HTML/CSS/JS — no build step, no bundler
- The admin UI is also static HTML/CSS/JS — separate from the quiz frontend
- The backend server (`server/index.js`) handles all Claude API calls — the API key is never exposed to any UI
- All R2 interactions go through the MCP server — no direct R2 access from frontend or admin UI
- Health question generation uses Claude API (runtime calls), not Claude Code — the skill rules are passed as the system prompt
