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
 * GLOBAL STATE
 ********************************/
let questions = [];
let questionsLoaded = false;

let currentQuestionIndex = -1;
let score = 0;
let selectedOption = null;
let timerInterval = null;

let isTeamVerified = false;

/********************************
 * TEAM ID
 ********************************/
const params = new URLSearchParams(window.location.search);
const teamId = params.get("team");

/********************************
 * ELEMENTS
 ********************************/
let passcodeScreen, waitingScreen, quizScreen;
let passcodeInput, passcodeBtn, passcodeError;
let questionEl, feedbackEl, timerEl, scoreEl, optionsEls;

/********************************
 * INIT
 ********************************/
window.addEventListener("DOMContentLoaded", init);

function init() {
  setupElements();
  showScreen(passcodeScreen);

  fetchQuestions();
  listenQuizStart();
  listenQuestionChange();
}

/********************************
 * SETUP ELEMENTS
 ********************************/
function setupElements() {
  passcodeScreen = document.getElementById("passcode-box");
  waitingScreen = document.getElementById("WaitingScreen");
  quizScreen = document.getElementById("quiz-UI");

  passcodeInput = document.getElementById("passcode-input");
  passcodeBtn = document.getElementById("passcode-btn");
  passcodeError = document.getElementById("passcode-error");

  questionEl = document.getElementById("question");
  feedbackEl = document.getElementById("feedback");
  timerEl = document.getElementById("timer");
  scoreEl = document.getElementById("live-score");
  optionsEls = document.querySelectorAll(".option");

  passcodeBtn.disabled = true;

  passcodeInput.addEventListener("input", () => {
    passcodeBtn.disabled = passcodeInput.value.trim().length !== 6;
    passcodeError.innerText = "";
  });

  passcodeBtn.addEventListener("click", handlePasscodeSubmit);
}

/********************************
 * SCREEN CONTROL
 ********************************/
function showScreen(screen) {
  document.querySelectorAll(".screen").forEach(s =>
    s.classList.remove("active")
  );
  screen.classList.add("active");
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

  if (!snap.exists() || snap.val().passcode !== entered) {
    passcodeError.innerText = "❌ Incorrect passcode";
    return;
  }

  score = snap.val().score || 0;
  isTeamVerified = true;

  // Check admin state immediately
  const adminSnap = await get(ref(db, "admin/quizStarted"));
  if (adminSnap.exists() && adminSnap.val() === true) {
    showScreen(quizScreen);
  } else {
    showScreen(waitingScreen);
  }

  // 🔥 IMPORTANT: sync current question for late login / refresh
  await syncCurrentQuestion();
}

/********************************
 * FETCH QUESTIONS
 ********************************/
function fetchQuestions() {
  fetch("questions.json")
    .then(res => res.json())
    .then(data => {
      questions = data;
      questionsLoaded = true;

      // If question index already known, render immediately
      if (isTeamVerified && currentQuestionIndex >= 0) {
        loadQuestion();
      }
    })
    .catch(err => {
      console.error("Questions load error:", err);
    });
}

/********************************
 * ADMIN LISTENERS
 ********************************/
function listenQuizStart() {
  onValue(ref(db, "admin/quizStarted"), snap => {
    if (snap.val() === true && isTeamVerified) {
      showScreen(quizScreen);
    }
  });
}

function listenQuestionChange() {
  onValue(ref(db, "admin/currentQuestionIndex"), snap => {
    if (!snap.exists() || !isTeamVerified) return;

    currentQuestionIndex = snap.val();

    if (questionsLoaded) {
      loadQuestion();
    }
  });
}

/********************************
 * MANUAL SYNC FOR LATE LOGIN
 ********************************/
async function syncCurrentQuestion() {
  const snap = await get(ref(db, "admin/currentQuestionIndex"));
  if (!snap.exists()) return;

  currentQuestionIndex = snap.val();

  if (questionsLoaded) {
    loadQuestion();
  }
}

/********************************
 * QUIZ ENGINE
 ********************************/
function loadQuestion() {
  if (!questionsLoaded || !questions.length) return;

  // 🔥 CRITICAL SAFETY CHECK
  if (
    currentQuestionIndex < 0 ||
    currentQuestionIndex >= questions.length
  ) {
    questionEl.innerText = "You joined late. Quiz is already completed.";
    scoreEl.innerText = `Score: ${score}`;
    feedbackEl.innerText = "";
    document.querySelector(".options").style.display = "none";
    clearInterval(timerInterval);
    return;
  }

  selectedOption = null;
  feedbackEl.innerText = "";
  document.querySelector(".options").style.display = "flex";

  const q = questions[currentQuestionIndex];
  const shuffled = [...q.options].sort(() => Math.random() - 0.5);

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
 * TIMER (SYNCED WITH ADMIN)
 ********************************/
function startTimer() {
  clearInterval(timerInterval);

  onValue(ref(db, "admin/questionStartTime"), snap => {
    if (!snap.exists()) return;

    const startTime = snap.val();

    timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const timeLeft = Math.max(30 - elapsed, 0);

      timerEl.innerText = `Time ${timeLeft}s`;

      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        handleTimeUp();
      }
    }, 1000);
  });
}

/********************************
 * TIME UP (AUTO-SKIP)
 ********************************/
async function handleTimeUp() {
  const teamRef = ref(db, `teams/${teamId}`);
  const snap = await get(teamRef);

  const lastAnswered = snap.val()?.lastAnsweredQuestion ?? -1;
  if (currentQuestionIndex <= lastAnswered) return;

  const q = questions[currentQuestionIndex];

  if (!selectedOption) {
    score -= 5;
  } else if (selectedOption === q.answer) {
    score += 10;
  } else {
    score -= 5;
  }

  await update(teamRef, {
    score,
    lastAnsweredQuestion: currentQuestionIndex
  });
}
