/********************************
 * FIREBASE IMPORTS
 ********************************/
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getDatabase, ref, get, update, onValue } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

/********************************
 * FIREBASE CONFIG
 ********************************/
const firebaseConfig = {
  apiKey: "AIzaSyCFE2GuML1GCaWPoGHmoiFfKX_WW55kktY",
  authDomain: "quiz-room-08.firebaseapp.com",
  databaseURL: "https://quiz-room-08-default-rtdb.firebaseio.com",
  projectId: "quiz-room-08",
  storageBucket: "quiz-room-08.firebasestorage.app",
  messagingSenderId: "62287969743",
  appId: "1:62287969743:web:47bf77b38dde3fb7b626ba"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
signInAnonymously(auth);

/********************************
 * WAIT FOR DOM
 ********************************/
window.addEventListener("DOMContentLoaded", init);

/********************************
 * GLOBAL STATE
 ********************************/
let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let timeLeft = 30;
let timerInterval = null;
let selectedOption = null;

/********************************
 * TEAM ID
 ********************************/
const params = new URLSearchParams(window.location.search);
const teamId = params.get("team");

/********************************
 * ELEMENTS
 ********************************/
let passcodeScreen, quizScreen;
let passcodeInput, passcodeBtn, passcodeError;
let questionEl, feedbackEl, timerEl, scoreEl, optionsEls;

/********************************
 * INIT
 ********************************/
function init() {
  setupElements();
  showScreen(passcodeScreen);
  fetchQuestions();
  setupAdminListeners();
}

/********************************
 * SETUP ELEMENTS
 ********************************/
function setupElements() {
  passcodeScreen = document.getElementById("passcode-box");
  quizScreen = document.getElementById("quiz-container");

  passcodeInput = document.getElementById("passcode-input");
  passcodeBtn = document.getElementById("passcode-btn");
  passcodeError = document.getElementById("passcode-error");

  questionEl = document.getElementById("question");
  feedbackEl = document.getElementById("feedback");
  timerEl = document.getElementById("timer");
  scoreEl = document.getElementById("live-score");
  optionsEls = document.querySelectorAll(".option");

  passcodeBtn.addEventListener("click", handlePasscodeSubmit);
}

/********************************
 * SCREEN CONTROL (IMPORTANT)
 ********************************/
function showScreen(screenToShow) {
  document.querySelectorAll(".screen").forEach(s =>
    s.classList.remove("active")
  );
  screenToShow.classList.add("active");
}

/********************************
 * PASSCODE LOGIC
 ********************************/
async function handlePasscodeSubmit() {
  const entered = passcodeInput.value.trim();
  passcodeError.innerText = "";

  if (!teamId) {
    passcodeError.innerText = "Invalid team link";
    return;
  }

  const teamRef = ref(db, `teams/${teamId}`);
  const snap = await get(teamRef);

  if (!snap.exists()) {
    passcodeError.innerText = "Invalid team";
    return;
  }

  if (snap.val().passcode !== entered) {
    passcodeError.innerText = "❌ Incorrect passcode";
    return;
  }

  score = snap.val().score || 0;
  showWaitingScreen("Waiting for admin to start the game...");
}

/********************************
 * WAITING SCREEN
 ********************************/
function showWaitingScreen(msg) {
  showScreen(quizScreen);
  document.querySelector(".options").style.display = "none";
  questionEl.innerText = msg;
  feedbackEl.innerText = "";
}

/********************************
 * FETCH QUESTIONS
 ********************************/
function fetchQuestions() {
  fetch("questions.json")
    .then(res => res.json())
    .then(data => questions = data);
}

/********************************
 * ADMIN LISTENERS
 ********************************/
function setupAdminListeners() {
  onValue(ref(db, "admin/quizStarted"), snap => {
    if (snap.val() === true) {
      startQuiz();
    }
  });
}

/********************************
 * QUIZ ENGINE
 ********************************/
function shuffleOptions(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function startQuiz() {
  showScreen(quizScreen);
  document.querySelector(".options").style.display = "flex";
  currentQuestionIndex = 0;
  loadQuestion();
}

function loadQuestion() {
  if (currentQuestionIndex >= questions.length) {
    showWaitingScreen("Round completed. Waiting for admin decision...");
    return;
  }

  selectedOption = null;
  feedbackEl.innerText = "";

  const q = questions[currentQuestionIndex];
  const shuffled = shuffleOptions(q.options);

  questionEl.innerText = q.question;
  scoreEl.innerText = `Score: ${score}`;

  optionsEls.forEach((btn, i) => {
    btn.innerText = shuffled[i];
    btn.disabled = false;
    btn.classList.remove("selected");

    btn.onclick = () => {
      optionsEls.forEach(o => o.classList.remove("selected"));
      btn.classList.add("selected");
      selectedOption = btn.innerText;
    };
  });

  startTimer();
}

/********************************
 * TIMER
 ********************************/
function startTimer() {
  clearInterval(timerInterval);
  timeLeft = 30;
  timerEl.innerText = `Time ${timeLeft}s`;

  timerInterval = setInterval(() => {
    timeLeft--;
    timerEl.innerText = `Time ${timeLeft}s`;

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      handleTimeUp();
    }
  }, 1000);
}

/********************************
 * TIME UP
 ********************************/
async function handleTimeUp() {
  const q = questions[currentQuestionIndex];

  optionsEls.forEach(o => o.disabled = true);

  if (!selectedOption) {
    score -= 5;
    feedbackEl.innerText = `⏱️ Skipped\nCorrect answer: ${q.answer}`;
  } else if (selectedOption === q.answer) {
    score += 10;
    feedbackEl.innerText = "✅ Correct!";
  } else {
    score -= 5;
    feedbackEl.innerText = `❌ Wrong!\nCorrect answer: ${q.answer}`;
  }

  scoreEl.innerText = `Score: ${score}`;
  await update(ref(db, `teams/${teamId}`), { score });

  setTimeout(() => {
    currentQuestionIndex++;
    loadQuestion();
  }, 1500);
}
