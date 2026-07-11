// DOM refs
const screens = {
  category: document.getElementById("screen-category"),
  quiz: document.getElementById("screen-quiz"),
  error: document.getElementById("screen-error"),
};

const els = {
  categoryBtns: document.querySelectorAll(".category-btn"),
  btnBack: document.getElementById("btn-back"),
  categoryTag: document.getElementById("category-tag"),
  scenarioBlock: document.getElementById("scenario-block"),
  questionText: document.getElementById("question-text"),
  answers: document.getElementById("answers"),
  feedback: document.getElementById("feedback"),
  feedbackResult: document.getElementById("feedback-result"),
  feedbackExplanation: document.getElementById("feedback-explanation"),
  btnNext: document.getElementById("btn-next"),
  errorText: document.getElementById("error-text"),
  btnErrorBack: document.getElementById("btn-error-back"),
  loading: document.getElementById("loading"),
  completionMessage: document.getElementById("completion-message"),
};

// State
const state = {
  category: null,
  question: null,
  answered: false,
  seenIds: [],
};

// Helpers
function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.add("hidden"));
  screens[name].classList.remove("hidden");
}

function showLoading(show) {
  els.loading.classList.toggle("hidden", !show);
}

function showError(message) {
  els.errorText.textContent = message;
  showScreen("error");
}

// API
async function fetchQuestion(category) {
  const exclude = state.seenIds.join(",");
  const url =
    `/api/quiz/question?category=${encodeURIComponent(category)}${exclude ? `&exclude=${exclude}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("No questions available for this category yet.");
    }
    throw new Error(`Something went wrong (${res.status}). Please try again.`);
  }
  return res.json();
}

async function submitAnswer(questionId, answer) {
  const res = await fetch("/api/quiz/answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question_id: questionId, answer }),
  });
  if (!res.ok) throw new Error("Failed to submit answer.");
  return res.json();
}

// Rendering
function renderQuestion(q) {
  state.question = q;
  state.answered = false;
  if (!state.seenIds.includes(q.id)) state.seenIds.push(q.id);

  els.categoryTag.textContent = q.category;

  // Scenario rendering
  if (q.question_type === "scenario") {
    const idx = q.question_text.indexOf("\n\n");
    if (idx !== -1) {
      els.scenarioBlock.textContent = q.question_text.slice(0, idx);
      els.scenarioBlock.classList.remove("hidden");
      els.questionText.textContent = q.question_text.slice(idx + 2);
    } else {
      els.scenarioBlock.classList.add("hidden");
      els.questionText.textContent = q.question_text;
    }
  } else {
    els.scenarioBlock.classList.add("hidden");
    els.questionText.textContent = q.question_text;
  }

  // Build options
  const isTrueFalse = q.question_type === "true_or_false";
  const options = [
    q.option_a && { label: "A", text: q.option_a },
    q.option_b && { label: "B", text: q.option_b },
    !isTrueFalse && q.option_c && { label: "C", text: q.option_c },
    !isTrueFalse && q.option_d && { label: "D", text: q.option_d },
  ].filter(Boolean);

  els.answers.innerHTML = "";
  for (const opt of options) {
    const btn = document.createElement("button");
    btn.className = "answer-btn";
    btn.dataset.answer = opt.label;
    btn.innerHTML =
      `<span class="label">${opt.label}</span><span class="text">${opt.text}</span>`;
    btn.addEventListener("click", () => handleAnswer(opt.label));
    els.answers.appendChild(btn);
  }

  els.feedback.classList.add("hidden");
  els.btnNext.classList.add("hidden");
}

async function handleAnswer(answerText) {
  if (state.answered) return;
  state.answered = true;

  const q = state.question;
  const buttons = els.answers.querySelectorAll(".answer-btn");

  buttons.forEach((b) => {
    b.disabled = true;
    if (b.dataset.answer === answerText) {
      b.classList.add("selected");
    }
  });

  try {
    const result = await submitAnswer(q.id, answerText);

    buttons.forEach((b) => {
      b.classList.remove("selected");
      if (b.dataset.answer === result.correct_answer) {
        b.classList.add("correct");
      } else if (b.dataset.answer === answerText && !result.correct) {
        b.classList.add("incorrect");
      }
    });

    els.feedbackResult.textContent = result.correct ? "Correct!" : "Not quite.";
    els.feedbackResult.className =
      `feedback-result ${result.correct ? "is-correct" : "is-incorrect"}`;
    els.feedbackExplanation.textContent = result.explanation;
    els.feedback.classList.remove("hidden");
    els.btnNext.classList.remove("hidden");
  } catch (err) {
    state.answered = false;
    buttons.forEach((b) => {
      b.disabled = false;
      b.classList.remove("selected");
    });
    showError(err.message);
  }
}

// Event handlers
els.categoryBtns.forEach((btn) => {
  btn.addEventListener("click", async () => {
    state.category = btn.dataset.category;
    els.completionMessage.classList.add("hidden");
    showLoading(true);
    try {
      const question = await fetchQuestion(state.category);
      showScreen("quiz");
      renderQuestion(question);
    } catch (err) {
      showError(err.message);
    } finally {
      showLoading(false);
    }
  });
});

els.btnBack.addEventListener("click", () => {
  showScreen("category");
});

els.btnNext.addEventListener("click", async () => {
  showLoading(true);
  try {
    const question = await fetchQuestion(state.category);
    if (question.reset) {
      state.seenIds = [];
      showScreen("category");
      els.completionMessage.classList.remove("hidden");
      return;
    }
    renderQuestion(question);
  } catch (err) {
    showError(err.message);
  } finally {
    showLoading(false);
  }
});

els.btnErrorBack.addEventListener("click", () => {
  showScreen("category");
});
