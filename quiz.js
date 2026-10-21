
"use strict";

// Demo password only. Change it before local testing if desired.
// Client-side passwords are NOT secure for a public website.
const DEMO_ADMIN_PASSWORD = "LFAdmin2026!";

const $ = (id) => document.getElementById(id);

const screens = {
  welcome: $("welcomeScreen"),
  quiz: $("quizScreen"),
  result: $("resultScreen"),
  admin: $("adminScreen")
};

const STORAGE_KEY = "jsQuizAppQuestionsV1";

let questions = loadQuestions();
let currentIndex = 0;
let score = 0;
let secondsLeft = 30;
let timerId = null;
let selectedAnswer = null;
let answerHistory = [];
let student = {};
let quizFinished = false;
let adminAuthenticated = false;

function loadQuestions() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved !== null) {
      const parsed = JSON.parse(saved);

      if (Array.isArray(parsed) && parsed.every(isValidQuestion)) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn("Could not load saved questions.", error);
  }

  return window.defaultQuestions.map((q) => ({ ...q, options: [...q.options] }));
}

function isValidQuestion(q) {
  return q &&
    Number.isInteger(q.id) &&
    typeof q.question === "string" &&
    q.question.trim().length > 0 &&
    Array.isArray(q.options) &&
    q.options.length === 4 &&
    q.options.every((option) =>
      typeof option === "string" && option.trim().length > 0
    ) &&
    Number.isInteger(q.answer) &&
    q.answer >= 0 &&
    q.answer <= 3;
}

function saveQuestions() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
    return true;
  } catch (error) {
    console.error("Could not save questions.", error);
    return false;
  }
}

function showScreen(name) {
  Object.values(screens).forEach((screen) => {
    screen.classList.add("hidden");
  });

  screens[name].classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function shuffleQuestions(list) {
  const shuffled = list.map((q) => ({
    ...q,
    options: [...q.options]
  }));

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

function startQuiz(event) {
  event.preventDefault();

  if (questions.length === 0) {
    alert("No questions are available. Please contact the administrator.");
    return;
  }

  student = {
    name: $("studentName").value.trim(),
    email: $("studentEmail").value.trim(),
    course: $("studentCourse").value
  };

  if (!student.name || !student.email || !student.course) {
    alert("Please complete all the student details.");
    return;
  }

  questions = loadQuestions();
  if (questions.length === 0) {
    alert("The quiz currently has no questions.");
    return;
  }

  questions = shuffleQuestions(questions);
  currentIndex = 0;
  score = 0;
  answerHistory = [];
  quizFinished = false;

  $("greeting").textContent = "Good luck, " + student.name + "!";
  $("reviewArea").replaceChildren();
  $("reviewArea").classList.add("hidden");
  $("reviewBtn").textContent = "Review Answers";

  showScreen("quiz");
  renderQuestion();
}

function renderQuestion() {
  clearInterval(timerId);

  if (currentIndex >= questions.length) {
    finishQuiz();
    return;
  }

  selectedAnswer = null;
  secondsLeft = 30;

  const question = questions[currentIndex];

  $("questionCounter").textContent =
    `Question ${currentIndex + 1} of ${questions.length}`;

  const percent = Math.round(
    (currentIndex / questions.length) * 100
  );

  $("progressPercent").textContent = percent + "%";
  $("progressBar").style.width = percent + "%";
  $("questionText").textContent = question.question;
  $("feedback").textContent = "";
  $("nextBtn").disabled = true;

  $("nextBtn").textContent =
    currentIndex === questions.length - 1
      ? "View Results →"
      : "Next Question →";

  const optionsBox = $("options");
  optionsBox.replaceChildren();

  question.options.forEach((option, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "option-btn";

    const number = document.createElement("span");
    number.className = "option-number";
    number.textContent = String(index + 1);

    const label = document.createElement("span");
    label.textContent = option;

    button.append(number, label);
    button.addEventListener("click", () => selectAnswer(index));
    optionsBox.appendChild(button);
  });

  updateTimerDisplay();
  timerId = setInterval(() => {
    secondsLeft--;
    updateTimerDisplay();

    if (secondsLeft <= 0) {
      clearInterval(timerId);
      if (selectedAnswer === null) {
        recordAnswer(null);
      }
      lockQuestion(true);
    }
  }, 1000);
}

function updateTimerDisplay() {
  $("timer").textContent = secondsLeft + "s";
  $("timer").classList.toggle("warning", secondsLeft <= 10);
}

function selectAnswer(index) {
  if (selectedAnswer !== null || quizFinished) return;

  selectedAnswer = index;
  recordAnswer(index);
  lockQuestion(false);
}

function recordAnswer(answer) {
  const question = questions[currentIndex];

  if (answer === question.answer) {
    score++;
  }

  answerHistory[currentIndex] = {
    question: question.question,
    options: [...question.options],
    correctAnswer: question.answer,
    selectedAnswer: answer
  };
}

function lockQuestion(timedOut) {
  clearInterval(timerId);

  const question = questions[currentIndex];
  const buttons = $("options").querySelectorAll(".option-btn");

  buttons.forEach((button, index) => {
    button.disabled = true;

    if (index === question.answer) {
      button.classList.add("correct");
    }

    if (selectedAnswer === index && index !== question.answer) {
      button.classList.add("wrong");
    }
  });

  if (timedOut) {
    $("feedback").textContent =
      "Time is up! The correct answer is highlighted.";
  } else if (selectedAnswer === question.answer) {
    $("feedback").textContent = "Correct answer! Well done.";
    $("feedback").style.color = "var(--success)";
  } else {
    $("feedback").textContent = "Incorrect answer. Check the highlighted answer.";
    $("feedback").style.color = "var(--danger)";
  }

  $("nextBtn").disabled = false;
}

function nextQuestion() {
  if (selectedAnswer === null &&
      !answerHistory[currentIndex]) {
    return;
  }

  currentIndex++;

  if (currentIndex >= questions.length) {
    finishQuiz();
  } else {
    renderQuestion();
  }
}

function finishQuiz() {
  clearInterval(timerId);
  quizFinished = true;

  showScreen("result");

  const total = questions.length;
  const percentage = Math.round((score / total) * 100);

  let grade;

  if (percentage >= 80) {
    grade = "Excellent!";
  } else if (percentage >= 50) {
    grade = "Good Job!";
  } else {
    grade = "Need More Practice";
  }

  $("resultHeading").textContent = "Quiz Completed!";
  $("studentSummary").textContent =
    `${student.name} · ${student.course}`;

  $("scoreText").textContent = `${score}/${total}`;
  $("gradeText").textContent = `${grade} — ${percentage}%`;

  $("progressBar").style.width = "100%";
  $("progressPercent").textContent = "100%";
}

function showReview() {
  const area = $("reviewArea");

  if (!area.classList.contains("hidden")) {
    area.classList.add("hidden");
    $("reviewBtn").textContent = "Review Answers";
    return;
  }

  area.replaceChildren();

  answerHistory.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = "review-item";

    const title = document.createElement("h3");
    title.textContent = `Q${index + 1}. ${item.question}`;
    card.appendChild(title);

    item.options.forEach((option, optionIndex) => {
      const line = document.createElement("p");
      line.textContent = `${optionIndex + 1}. ${option}`;

      if (optionIndex === item.correctAnswer) {
        line.classList.add("review-correct");
        line.textContent += " — Correct answer";
      }

      if (
        optionIndex === item.selectedAnswer &&
        optionIndex !== item.correctAnswer
      ) {
        line.classList.add("review-wrong");
        line.textContent += " — Your answer";
      }

      card.appendChild(line);
    });

    if (item.selectedAnswer === null) {
      const skipped = document.createElement("p");
      skipped.textContent = "You did not answer this question.";
      card.appendChild(skipped);
    }

    area.appendChild(card);
  });

  area.classList.remove("hidden");
  $("reviewBtn").textContent = "Hide Review";
}

// Admin panel
function openAdmin() {
  clearInterval(timerId);
  showScreen("admin");

  $("adminLoginForm").classList.toggle(
    "hidden", adminAuthenticated
  );
  $("adminTools").classList.toggle(
    "hidden", !adminAuthenticated
  );

  if (adminAuthenticated) {
    renderAdminQuestions();
  }
}

function loginAdmin(event) {
  event.preventDefault();

  const enteredPassword = $("adminPassword").value;

  if (enteredPassword !== DEMO_ADMIN_PASSWORD) {
    $("adminPassword").value = "";
    alert("Incorrect password. Please try again.");
    return;
  }

  adminAuthenticated = true;
  $("adminPassword").value = "";
  $("adminLoginForm").classList.add("hidden");
  $("adminTools").classList.remove("hidden");
  renderAdminQuestions();
}

function logoutAdmin() {
  adminAuthenticated = false;
  $("adminLoginForm").reset();
  $("questionForm").reset();
  $("editQuestionId").value = "";
  $("adminTools").classList.add("hidden");
  $("adminLoginForm").classList.remove("hidden");
  showScreen("welcome");
}

function renderAdminQuestions() {
  const list = $("questionList");
  list.replaceChildren();

  const searchTerm = $("questionSearch").value.trim().toLowerCase();

  const filtered = questions.filter((q) =>
    q.question.toLowerCase().includes(searchTerm)
  );

  const count = document.createElement("p");
  count.textContent = `${filtered.length} question(s) shown.`;
  list.appendChild(count);

  if (filtered.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No matching questions found.";
    list.appendChild(empty);
  }

  filtered.forEach((q) => {
    const card = document.createElement("article");
    card.className = "question-item";

    const title = document.createElement("h4");
    title.textContent = q.question;
    card.appendChild(title);

    const correct = document.createElement("p");
    correct.textContent = "Correct answer: " + q.options[q.answer];
    card.appendChild(correct);

    const actions = document.createElement("div");
    actions.className = "admin-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "secondary-btn";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => editQuestion(q.id));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "danger-btn";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => deleteQuestion(q.id));

    actions.append(editButton, deleteButton);
    card.appendChild(actions);
    list.appendChild(card);
  });
}

function editQuestion(id) {
  const question = questions.find((q) => q.id === id);
  if (!question) return;

  $("editQuestionId").value = String(question.id);
  $("questionInput").value = question.question;

  question.options.forEach((option, index) => {
    $(`option${index + 1}`).value = option;
  });

  $("correctAnswer").value = String(question.answer);
  $("adminMessage").textContent = "Editing question. Make your changes below.";
  $("questionForm").scrollIntoView({ behavior: "smooth" });
}

function resetQuestionForm() {
  $("questionForm").reset();
  $("editQuestionId").value = "";
  $("adminMessage").textContent = "";
}

function saveQuestion(event) {
  event.preventDefault();

  if (!adminAuthenticated) return;

  const idValue = $("editQuestionId").value;

  const newQuestion = {
    id: idValue ? Number(idValue) : Date.now(),
    question: $("questionInput").value.trim(),
    options: [
      $("option1").value.trim(),
      $("option2").value.trim(),
      $("option3").value.trim(),
      $("option4").value.trim()
    ],
    answer: Number($("correctAnswer").value)
  };

  if (!isValidQuestion(newQuestion)) {
    $("adminMessage").textContent =
      "Please provide a question and four valid options.";
    return;
  }

  const previous = questions;

  if (idValue) {
    questions = questions.map((q) =>
      q.id === newQuestion.id ? newQuestion : q
    );
  } else {
    questions = [...questions, newQuestion];
  }

  if (!saveQuestions()) {
    questions = previous;
    $("adminMessage").textContent =
      "Could not save. Browser storage may be unavailable.";
    return;
  }

  $("adminMessage").textContent = idValue
    ? "Question updated successfully."
    : "New question added successfully.";

  resetQuestionForm();
  renderAdminQuestions();
}

function deleteQuestion(id) {
  if (!adminAuthenticated) return;

  if (questions.length <= 1) {
    alert("At least one question must remain in the question bank.");
    return;
  }

  if (!confirm("Are you sure you want to delete this question?")) {
    return;
  }

  const previous = questions;
  questions = questions.filter((q) => q.id !== id);

  if (!saveQuestions()) {
    questions = previous;
    alert("Could not save the changes.");
    return;
  }

  $("adminMessage").textContent = "Question deleted.";
  renderAdminQuestions();
}

// Events
$("studentForm").addEventListener("submit", startQuiz);
$("nextBtn").addEventListener("click", nextQuestion);
$("reviewBtn").addEventListener("click", showReview);

$("restartBtn").addEventListener("click", () => {
  $("studentForm").reset();
  showScreen("welcome");
});

$("adminToggle").addEventListener("click", openAdmin);
$("adminLoginForm").addEventListener("submit", loginAdmin);
$("adminLogout").addEventListener("click", logoutAdmin);
$("questionForm").addEventListener("submit", saveQuestion);
$("cancelEdit").addEventListener("click", resetQuestionForm);
$("questionSearch").addEventListener("input", renderAdminQuestions);

$("backBtn").addEventListener("click", () => {
  showScreen("welcome");
});

document.addEventListener("keydown", (event) => {
  if (
    screens.quiz.classList.contains("hidden") ||
    event.repeat ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey
  ) {
    return;
  }

  if (["1", "2", "3", "4"].includes(event.key)) {
    selectAnswer(Number(event.key) - 1);
  }
});
