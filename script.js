/********************************
 * FIREBASE IMPORTS
 ********************************/
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getDatabase, ref, get, update, onValue } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

/********************************
 * FIREBASE CONFIG (ROOM-SPECIFIC)
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
 * TEAM IDENTIFICATION
 ********************************/
const params = new URLSearchParams(window.location.search);
const teamId = params.get("team");

if (!teamId) {
  document.body.innerHTML = "<h2>Invalid team link</h2>";
  throw new Error("Team ID missing");
}

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
 * ELEMENTS
 ********************************/
const passcodeBox = document.getElementById("passcode-box");
const quizContainer = document.querySelector(".quiz-container");
const questionEl = document.getElementById("question");
const feedbackEl = document.getElementById("feedback");
const timerEl = document.getElementById("timer");
const scoreEl = document.getElementById("live-score");
const optionsEls = document.querySelectorAll(".option");

/********************************
 * UI STATE FUNCTIONS (FIXED)
 ********************************/
function showPasscodeScreen() {
  passcodeBox.classList.add("show");
  quizContainer.classList.remove("show");
}

function showWaitingScreen(msg) {
  passcodeBox.classList.remove("show");
  quizContainer.classList.add("show");
  document.querySelector(".options").style.display = "none";
  questionEl.innerText = msg;
  feedbackEl.innerText = "";
}

function showQuizScreen() {
  passcodeBox.classList.remove("show");
  quizContainer.classList.add("show");
  document.querySelector(".options").style.display = "flex";
}

function showQualifiedScreen() {
  passcodeBox.classList.remove("show");
  quizContainer.classList.add("show");
  document.querySelector(".options").style.display = "none";
  questionEl.innerText = "🎉 You are qualified to the next round!";
  feedbackEl.innerText = "";
  clearInterval(timerInterval);
}

/********************************
 * PASSCODE LOGIC
 ********************************/
document.getElementById("passcode-btn").onclick = async () => {
  const entered = document.getElementById("passcode-input").value.trim();
  const teamRef = ref(db, `teams/${teamId}`);

  const snap = await get(teamRef);
  if (!snap.exists()) {
    document.getElementById("passcode-error").innerText = "Invalid team";
    return;
  }

  if (snap.val().passcode !== entered) {
    document.getElementById("passcode-error").innerText = "❌ Incorrect passcode";
    return;
  }

  score = snap.val().score || 0;
  showWaitingScreen("Waiting for admin to start the game...");
};

/********************************
 * FETCH QUESTIONS
 ********************************/
fetch("questions.json")
  .then(res => res.json())
  .then(data => (questions = data));

/********************************
 * ADMIN LISTENERS
 ********************************/
onValue(ref(db, "admin/quizStarted"), snap => {
  if (snap.val() === true) {
    showQuizScreen();
    startQuiz();
  }
});

onValue(ref(db, `teams/${teamId}/qualified`), snap => {
  if (snap.val() === true) {
    showQualifiedScreen();
  }
});

/********************************
 * QUIZ ENGINE
 ********************************/
function shuffleOptions(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function startQuiz() {
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
    btn.classList.remove("selected", "correct");

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
  timerEl.innerText = `Time: ${timeLeft}s`;

  timerInterval = setInterval(() => {
    timeLeft--;
    timerEl.innerText = `Time: ${timeLeft}s`;

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      handleTimeUp();
    }
  }, 1000);
}

/********************************
 * TIME UP HANDLER
 ********************************/
async function handleTimeUp() {
  const q = questions[currentQuestionIndex];

  optionsEls.forEach(o => (o.disabled = true));

  if (!selectedOption) {
    score -= 5;
    feedbackEl.innerText = `⏱️ Skipped\nCorrect answer: ${q.answer}`;
  } else if (selectedOption === q.answer) {
    score += 10;
    feedbackEl.innerText = "✅ Correct!";
  } else {
    score -= 5;
    feedbackEl.innerText = "❌ Wrong!";
  }

  scoreEl.innerText = `Score: ${score}`;
  await update(ref(db, `teams/${teamId}`), { score });

  setTimeout(() => {
    currentQuestionIndex++;
    loadQuestion();
  }, 1500);
}

/********************************
 * INIT
 ********************************/
window.addEventListener("DOMContentLoaded", () => {
  showPasscodeScreen();
});

