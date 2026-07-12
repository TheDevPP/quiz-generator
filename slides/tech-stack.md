---
marp: true
paginate: true
transition: fade
---

<!-- slide 1 -->

# Tech Stack
## Quiz Generator — Health Education Platform

A doctor-reviewed health quiz for teenagers in Myanmar.
Built with Claude Code, MCP, skills, and subagents.

---

<!-- slide 2 -->

# Stack

| Layer | Technology |
|---|---|
| **Frontend** | Plain HTML / CSS / JS — no framework |
| **Backend** | Node.js + Express |
| **Database** | SQLite (better-sqlite3) |
| **Document Storage** | Cloudflare R2 (S3-compatible) |
| **AI Generation** | Anthropic Claude API (claude-sonnet-4-6) |
| **MCP Protocol** | @modelcontextprotocol/sdk |
| **PDF Parsing** | pdf-parse + mammoth (.docx) |
| **Deployment** | Render (free tier) |

---

<!-- slide 3 -->

# Agents

### `doctor-review-queue.md`
`.claude/agents/doctor-review-queue.md`

Governs the review workflow for every AI-generated health question.

**Input:** A pending Q&A set + its source chunk

**Output:** One of three decisions:
- ✅ **Approved** → status: verified → enters quiz pool
- ✏️ **Edited then approved** → doctor modifies, then approves
- ❌ **Rejected** → discarded with a recorded reason

Nothing reaches a teenager without passing this gate.

---

<!-- slide 4 -->

# Skills

### `health-question-generation/SKILL.md`
`.claude/skills/health-question-generation/SKILL.md`

Rules Claude API follows when generating questions from a source chunk.

**Three question types — chosen by content:**

| Type | When | Format |
|---|---|---|
| Multiple Choice | Facts, definitions | Question + 4 options |
| True or False | Myths, misconceptions | Statement + T/F |
| Scenario | Behaviors, actions | Real-life situation + 4 options |

**Always:** teen-appropriate language · source-grounded only · 2-3 sentence explanation · no shame framing for SRH content

---

<!-- slide 5 -->

# Methodology

**How the project was built:**

1. Started with a working trivia quiz (MCP + skill + subagent foundation)
2. Upgraded CLAUDE.md first — defined the new architecture before touching code
3. Built backend-first: MCP server → Express API → generation endpoint → admin UI → quiz frontend
4. Each layer tested independently before the next was added
5. Git commit at every working checkpoint
6. Manual bug fixes debugged by reading actual diffs, not guessing

**AI tools used throughout:**
- Claude Code — primary agentic coding tool
- Claude API (runtime) — health question generation
- OpenCode — frontend UI work during API key downtime

---

<!-- slide 6 -->

# Trigger + Commands

### How to fire the Skill
The health-question-generation skill fires as the **system prompt** in every Claude API runtime call during question generation.

**Trigger:** Admin clicks "Generate Questions" in admin UI for a selected document

**Command (backend):**
```bash
POST /api/documents/:id/generate
Header: X-Admin-Password: <password>
```

### How to fire the Subagent
The doctor-review-queue subagent fires when the admin UI submits a review decision.

**Trigger:** Doctor clicks Approve / Edit / Reject on a pending question

**Command (backend):**
```bash
PATCH /api/questions/:id/review
Header: X-Admin-Password: <password>
Body: { "action": "approve" | "reject" | "edit", ... }
```

---

<!-- slide 7 -->

# Content Pipeline

```
Admin uploads handbook PDF/DOCX
        ↓
MCP server: extract_reference() chunks the document
        ↓
Backend calls Claude API per chunk
(health-question-generation SKILL as system prompt)
        ↓
Questions stored: status = pending_review
        ↓
Doctor reviews in admin UI
(doctor-review-queue SUBAGENT governs rules)
        ↓
Approved → status = verified → quiz pool
        ↓
Teenagers play — zero data collected
```
