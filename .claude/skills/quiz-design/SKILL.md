# Quiz Design Skill

Transform raw Open Trivia DB questions into polished, display-ready multiple-choice questions.

## Input

You receive one or more raw question objects from the Open Trivia DB MCP server. Each has this shape:

```json
{
  "category": "Science & Nature",
  "type": "multiple",
  "difficulty": "medium",
  "question": "What planet is known as the Red Planet?",
  "correct_answer": "Mars",
  "incorrect_answers": ["Venus", "Jupiter", "Saturn"]
}
```

## Instructions

For **each** raw question, run through every step below in order. If any step produces a reject, skip that question and fetch a replacement — do not present broken questions to the user.

### Step 1: Decode HTML Entities

Open Trivia DB returns HTML-encoded strings. Decode **all** HTML entities in every text field before doing anything else.

Common encodings you will encounter:

| Encoded | Decoded |
|---------|---------|
| `&amp;` | `&` |
| `&lt;` | `<` |
| `&gt;` | `>` |
| `&quot;` | `"` |
| `&#039;` or `&apos;` | `'` |
| `&ldquo;` / `&rdquo;` | `"` / `"` |
| `&hellip;` | `…` |
| `&shy;` | (remove) |

Apply decoding to:
- `question`
- `correct_answer`
- every entry in `incorrect_answers`

After decoding, verify no residual `&…;` sequences remain. If one does, decode it too (the list above is not exhaustive).

### Step 2: Build the Answer Array and Shuffle

1. Create an array containing the correct answer and all incorrect answers.
2. Shuffle the array so the correct answer lands in a **random** position.
3. Assign each answer a label: `A`, `B`, `C`, `D` (for 4 options) or `A`, `B`, `C`, `D`, `E` (if there are 5, which is rare).

**Shuffling rules:**
- Use a random permutation — do not sort, do not keep the correct answer in a fixed slot.
- After shuffling, record which label holds the correct answer (e.g., `"C"`). This is the `correct_label`.

### Step 3: Quality Gate — Reject Bad Questions

Inspect the question and answers. **Reject** the question (and request a replacement) if **any** of these are true:

| Condition | Example | Why reject |
|-----------|---------|------------|
| Question contains "all of the above" or "none of the above" | "Which of the above is correct?" | Not a knowledge test — it's a logic puzzle |
| Any answer option is a duplicate of another (after decoding) | Two options both say "Paris" | Confusing, breaks the 4-option format |
| The question is empty or just whitespace after decoding | | No content to present |
| The question contains `<a ` or `<img ` or other HTML tags | | Raw HTML leaked through; needs re-fetch |
| The correct answer is a substring of the question itself | Q: "What is the capital of France?" A: "France" | The answer is given away |
| The question is phrased ambiguously such that more than one answer could reasonably be correct | "What is the largest planet?" (could mean largest known vs. largest in our solar system) | Users will argue, not learn |
| An answer option is excessively long (> 200 chars) compared to the others | One option is a paragraph | Likely a parsing error or junk data |

If a question fails the gate, **do not present it**. Fetch a new one.

### Step 4: Consistency Check — Difficulty Within Session

If this question is part of an ongoing quiz session:

1. Note the difficulty levels of questions already presented in this session (easy / medium / hard).
2. The new question's difficulty should fall within **one step** of the session's running difficulty. For example:
   - If the session has been "medium," accept easy or hard, but not a jump from easy → hard without a medium in between.
   - If the session has been "easy," accept medium but reject hard.
3. If the difficulty is out of range, fetch a replacement at the correct difficulty level.

The difficulty-calibrator subagent may have recommended a specific level — treat that as the target. This step catches cases where the API returns a question at the wrong difficulty despite the request parameter.

### Step 5: Final Output Format

Produce a clean object for each accepted question:

```json
{
  "question": "What planet is known as the Red Planet?",
  "category": "Science & Nature",
  "difficulty": "medium",
  "options": {
    "A": "Venus",
    "B": "Mars",
    "C": "Jupiter",
    "D": "Saturn"
  },
  "correct_label": "B"
}
```

Requirements for the output:
- `question` is decoded, trimmed, and ends with a `?` if it doesn't already.
- `options` keys are uppercase letters starting from `A`.
- `correct_label` matches the key in `options` whose value is the decoded correct answer.
- No HTML entities remain anywhere in the output.
- No answer option text is duplicated.
- The correct answer position varies across questions in the same session (track this — if two consecutive questions both have the correct answer at `A`, re-shuffle the second one).

## Quick Reference Checklist

Before presenting any question, confirm:

- [ ] All HTML entities decoded (question + all answers)
- [ ] Answers shuffled, correct answer not in a predictable position
- [ ] No "all/none of the above" phrasing
- [ ] No duplicate answer options
- [ ] Question is non-empty and contains no raw HTML
- [ ] Answer not given away in the question text
- [ ] Difficulty consistent with the session
- [ ] Correct answer position differs from the previous question
- [ ] Output matches the final format spec above
