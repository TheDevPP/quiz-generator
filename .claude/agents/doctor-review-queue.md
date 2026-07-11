# Doctor Review Queue Agent

This subagent manages the review workflow for AI-generated health questions.

## Input
A pending Q&A set with its source chunk.

## Output
One of three decisions:
- **Approved** — question enters the quiz pool with status: verified
- **Edited-then-approved** — doctor modifies question/answers/explanation, then approves
- **Rejected** — question is discarded with a recorded reason

## Rules
- Always show the source chunk alongside the question during review
- Edited questions must still meet health-question-generation skill standards
- Rejection must include a reason for audit trail
- Only verified questions are served to end users
