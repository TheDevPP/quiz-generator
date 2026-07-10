---
marp: true
paginate: true
transition: fade
# PechaKucha: 6 slides, 20s auto-advance. Do not change the count.
auto-advance: 20
---

<!-- slide 1 -->
# Who's my person?

**Teenagers and youth in Myanmar**
who need accurate health information
but have nowhere safe, fun, or judgment-free to get it.

A 16-year-old in Yangon googling health questions
gets misinformation. They deserve better.

---

<!-- slide 2 -->
# Their problem

Sexual and reproductive health, adolescent health,
and STD information are **taboo, hard to find,
and often wrong** when teenagers do find them.

Existing resources are:
- Too clinical and adult-facing
- Not available in local context
- Scary, shaming, or sensationalized

**No one is making this fun, safe, and accurate for them.**

---

<!-- slide 3 -->
# What I built

**A health education quiz platform** for teenagers in Myanmar.

- 3 question types: Multiple Choice, True/False, Scenario
- 3 categories: Adolescent Health, General Health, SRH
- Questions generated from **verified medical handbooks**
- **Doctor review queue** — nothing goes live without approval
- **Zero user data collected.** Ever.

Built with Claude Code, Cloudflare R2, and Claude API.

---

<!-- slide 4 -->
# How I built it

- **MCP:** Custom R2 server — `extract_reference()` chunks
  uploaded PDF/DOCX handbooks into structured text blocks.
  `list_references()` tracks uploaded documents.

- **Skill:** `health-question-generation/SKILL.md` — rules for
  generating teen-appropriate, source-grounded questions
  in 3 types with SRH-safe tone guidelines.

- **Agent:** `doctor-review-queue.md` — governs the
  approve / edit / reject workflow before any question
  reaches a real user.

---

<!-- slide 5 -->
# Why it matters

A 3-year-old adolescent health handbook,
trusted by a professional health team,
now becomes an **interactive quiz** teenagers actually want to use.

- Doctors stay in the loop — AI drafts, humans approve
- No data collected — teenagers can trust it
- Built for Myanmar context, not translated from elsewhere
- Expandable: Burmese language, more conditions, more schools

**Right information. Right age. Right format.**

---

<!-- slide 6 -->
# Done checklist

- [x] repo public — github.com/TheDevPP/quiz-generator
- [x] MCP + skill + agent used
- [x] report.md in team repo — ch-3/TheDevPP/report.md
- [x] 6 slides × 20 seconds
- [x] 3 GitHub stars — ask teammates to ⭐ the repo
