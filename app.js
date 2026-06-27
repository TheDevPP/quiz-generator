// ============================================================
// Quiz Generator — app.js
// Quiz logic, state management, UI rendering
// ============================================================

// --- DOM refs ---

const screens = {
  start: document.getElementById("screen-start"),
  quiz: document.getElementById("screen-quiz"),
  results: document.getElementById("screen-results"),
};

const els = {
  category: document.getElementById("category"),
  difficulty: document.getElementById("difficulty"),
  amount: document.getElementById("amount"),
  btnStart: document.getElementById("btn-start"),
  progress: document.getElementById("progress"),
  score: document.getElementById("score"),
  difficultyBadge: document.getElementById("difficulty-badge"),
  categoryLabel: document.getElementById("category-label"),
  questionText: document.getElementById("question-text"),
  answers: document.getElementById("answers"),
  feedback: document.getElementById("feedback"),
  feedbackText: document.getElementById("feedback-text"),
  btnNext: document.getElementById("btn-next"),
  finalScore: document.getElementById("final-score"),
  finalDetail: document.getElementById("final-detail"),
  btnRestart: document.getElementById("btn-restart"),
  loading: document.getElementById("loading"),
};

// --- Quiz state ---

let state = {
  questions: [],           // fetched + processed questions
  currentIndex: 0,         // current question index
  score: 0,                // correct answers count
  totalQuestions: 10,      // how many in this session
  currentDifficulty: "medium",
  recentAnswers: [],       // ["correct", "incorrect", ...] oldest to newest
  answered: false,         // has the current question been answered
  settings: {
    category: "",
    difficulty: "medium",
    amount: 10,
  },
};

// --- Difficulty Calibrator (client-side port of the subagent logic) ---

function calibrateDifficulty(recentAnswers, currentDifficulty) {
  // Rule 1: not enough data
  if (recentAnswers.length < 2) {
    return { recommendation: "same", reason: "Not enough answer history to adjust difficulty." };
  }

  const last3 = recentAnswers.slice(-3);
  const last2 = recentAnswers.slice(-2);

  // Rule 2: last 3 all correct → harder
  if (last3.length >= 3 && last3.every((a) => a === "correct")) {
    if (currentDifficulty === "hard") {
      return { recommendation: "same", reason: "Already at the hardest level; maintaining difficulty." };
    }
    return { recommendation: "harder", reason: "Three correct answers in a row — ready for a challenge." };
  }

  // Rule 3: last 2 both incorrect → easier
  if (last2.every((a) => a === "incorrect")) {
    if (currentDifficulty === "easy") {
      return { recommendation: "same", reason: "Already at the easiest level; maintaining difficulty." };
    }
    return { recommendation: "easier", reason: "Two incorrect answers in a row — easing off to rebuild confidence." };
  }

  // Rule 4: mixed
  return { recommendation: "same", reason: "Performance is mixed; keeping the current difficulty." };
}

function applyRecommendation(recommendation, currentDifficulty) {
  if (recommendation === "harder") {
    if (currentDifficulty === "easy") return "medium";
    if (currentDifficulty === "medium") return "hard";
  }
  if (recommendation === "easier") {
    if (currentDifficulty === "hard") return "medium";
    if (currentDifficulty === "medium") return "easy";
  }
  return currentDifficulty;
}

// --- Quiz Design Skill (client-side port) ---

function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function processQuestion(raw, previousCorrectLabel) {
  // Step 1: decode (already done server-side, but ensure no residual)
  const question = raw.question.trim();
  const correct = raw.correct_answer.trim();
  const incorrects = raw.incorrect_answers.map((a) => a.trim());

  // Step 3: quality gate
  const qLower = question.toLowerCase();
  if (!question) return null;
  if (qLower.includes("all of the above") || qLower.includes("none of the above")) return null;
  if (qLower.includes("<a ") || qLower.includes("<img ")) return null;

  const allAnswers = [correct, ...incorrects];
  const uniqueCheck = new Set(allAnswers.map((a) => a.toLowerCase()));
  if (uniqueCheck.size !== allAnswers.length) return null;

  // Check if correct answer is substring of question
  if (qLower.includes(correct.toLowerCase()) && correct.length > 3) return null;

  // Check for excessively long answers
  if (allAnswers.some((a) => a.length > 200)) return null;

  // Step 2: shuffle
  let shuffled = shuffleArray(allAnswers);

  // Ensure correct answer not in same position as previous question
  const correctIdx = shuffled.indexOf(correct);
  const letters = ["A", "B", "C", "D", "E"];
  let correctLabel = letters[correctIdx];

  if (previousCorrectLabel && correctLabel === previousCorrectLabel && shuffled.length > 1) {
    // Re-shuffle until it's different
    for (let attempt = 0; attempt < 10; attempt++) {
      shuffled = shuffleArray(allAnswers);
      correctLabel = letters[shuffled.indexOf(correct)];
      if (correctLabel !== previousCorrectLabel) break;
    }
  }

  const options = {};
  shuffled.forEach((ans, i) => {
    options[letters[i]] = ans;
  });

  return {
    question: question.endsWith("?") ? question : question + "?",
    category: raw.category,
    difficulty: raw.difficulty,
    options,
    correct_label: correctLabel,
  };
}

// --- API ---

async function fetchQuestions(category, difficulty, amount) {
  const params = new URLSearchParams({ amount: String(amount) });
  if (category) params.set("category", category);
  if (difficulty) params.set("difficulty", difficulty);

  const res = await fetch(`/api/questions?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to fetch questions" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// --- UI helpers ---

function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.add("hidden"));
  screens[name].classList.remove("hidden");
}

function showLoading(show) {
  els.loading.classList.toggle("hidden", !show);
}

function renderQuestion() {
  const q = state.questions[state.currentIndex];
  if (!q) return;

  els.progress.textContent = `Question ${state.currentIndex + 1} / ${state.totalQuestions}`;
  els.score.textContent = `Score: ${state.score}`;

  // Difficulty badge
  els.difficultyBadge.textContent = q.difficulty;
  els.difficultyBadge.className = `badge badge-${q.difficulty}`;

  els.categoryLabel.textContent = q.category;
  els.questionText.textContent = q.question;

  // Render answer buttons
  els.answers.innerHTML = "";
  for (const [label, text] of Object.entries(q.options)) {
    const btn = document.createElement("button");
    btn.className = "answer-btn";
    btn.dataset.label = label;
    btn.innerHTML = `<span class="label">${label}</span><span class="text">${text}</span>`;
    btn.addEventListener("click", () => handleAnswer(label));
    els.answers.appendChild(btn);
  }

  els.feedback.classList.add("hidden");
  state.answered = false;
}

function handleAnswer(selectedLabel) {
  if (state.answered) return;
  state.answered = true;

  const q = state.questions[state.currentIndex];
  const isCorrect = selectedLabel === q.correct_label;

  // Record in history
  state.recentAnswers.push(isCorrect ? "correct" : "incorrect");
  if (isCorrect) state.score++;

  // Update score display
  els.score.textContent = `Score: ${state.score}`;

  // Highlight answers
  const buttons = els.answers.querySelectorAll(".answer-btn");
  buttons.forEach((btn) => {
    btn.disabled = true;
    const label = btn.dataset.label;
    if (label === q.correct_label) {
      btn.classList.add("correct");
    } else if (label === selectedLabel && !isCorrect) {
      btn.classList.add("incorrect");
    }
  });

  // Show feedback
  els.feedbackText.textContent = isCorrect
    ? "Correct! 🎉"
    : `Incorrect. The answer was ${q.correct_label}: ${q.options[q.correct_label]}.`;
  els.feedback.classList.remove("hidden");

  // If last question, change button text
  if (state.currentIndex >= state.totalQuestions - 1) {
    els.btnNext.textContent = "See Results";
  } else {
    els.btnNext.textContent = "Next Question";
  }
}

function showResults() {
  const pct = Math.round((state.score / state.totalQuestions) * 100);
  els.finalScore.textContent = `${state.score} / ${state.totalQuestions}`;

  let message;
  if (pct === 100) message = "Perfect score! Outstanding! 🏆";
  else if (pct >= 80) message = "Great job! You really know your trivia! 🌟";
  else if (pct >= 60) message = "Good effort! Keep practicing! 👍";
  else if (pct >= 40) message = "Not bad — there's room to improve! 📚";
  else message = "Keep trying — you'll get better! 💪";

  els.finalDetail.textContent = `${pct}% correct. ${message}`;
  showScreen("results");
}

// --- Event handlers ---

els.btnStart.addEventListener("click", async () => {
  const category = els.category.value;
  const difficulty = els.difficulty.value || "medium";
  const amount = parseInt(els.amount.value);

  state.settings = { category, difficulty, amount };
  state.totalQuestions = amount;
  state.currentDifficulty = difficulty;
  state.score = 0;
  state.currentIndex = 0;
  state.recentAnswers = [];
  state.questions = [];

  showLoading(true);

  try {
    // Fetch extra questions to have replacements for rejected ones
    const fetchAmount = Math.min(50, amount + 10);
    const raw = await fetchQuestions(category, difficulty, fetchAmount);

    // Process through quiz-design skill
    let lastCorrectLabel = null;
    const processed = [];
    for (const q of raw) {
      const result = processQuestion(q, lastCorrectLabel);
      if (result) {
        lastCorrectLabel = result.correct_label;
        processed.push(result);
        if (processed.length >= amount) break;
      }
    }

    if (processed.length === 0) {
      alert("No valid questions found. Try different settings.");
      showLoading(false);
      return;
    }

    state.questions = processed;
    state.totalQuestions = processed.length;

    showScreen("quiz");
    renderQuestion();
  } catch (err) {
    alert(`Error: ${err.message}`);
  } finally {
    showLoading(false);
  }
});

els.btnNext.addEventListener("click", () => {
  // Calibrate difficulty for next question
  const calibration = calibrateDifficulty(state.recentAnswers, state.currentDifficulty);
  state.currentDifficulty = applyRecommendation(calibration.recommendation, state.currentDifficulty);

  state.currentIndex++;

  if (state.currentIndex >= state.totalQuestions) {
    showResults();
    return;
  }

  renderQuestion();
});

els.btnRestart.addEventListener("click", () => {
  showScreen("start");
});
