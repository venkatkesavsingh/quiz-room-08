/********************************
 * FIREBASE IMPORTS
 ********************************/
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getDatabase, ref, get, onValue } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";
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
let currentQuestionIndex = 0;
let score = 0;
let selectedOption = null;
let timerInterval = null;
let timeLeft = 30;
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
let questionEl, timerEl, scoreEl, optionsEls, questionNumberEl;

/********************************
 * INIT
 ********************************/
window.addEventListener("DOMContentLoaded", init);

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
  waitingScreen = document.getElementById("WaitingScreen");
  quizScreen = document.getElementById("quiz-UI");

  passcodeInput = document.getElementById("passcode-input");
  passcodeBtn = document.getElementById("passcode-btn");
  passcodeError = document.getElementById("passcode-error");

  questionEl = document.getElementById("question");
  timerEl = document.getElementById("timer");
  scoreEl = document.getElementById("live-score");
  questionNumberEl = document.getElementById("question-number");
  optionsEls = document.querySelectorAll(".option");

  passcodeBtn.disabled = true;

  passcodeInput.addEventListener("input", () => {
    const value = passcodeInput.value.trim();
    passcodeBtn.disabled = value.length !== 6;
    passcodeError.innerText = "";

    if (value.length === 6) {
      passcodeInput.classList.add("filled");
      passcodeInput.blur();
    } else {
      passcodeInput.classList.remove("filled");
    }
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
 * PASSCODE LOGIN
 ********************************/
async function handlePasscodeSubmit() {
  const entered = passcodeInput.value.trim();
  passcodeError.innerText = "";

  if (!teamId) {
    passcodeError.innerText = "Invalid team link";
    return;
  }

  const snap = await get(ref(db, `teams/${teamId}`));

  if (!snap.exists()) {
    passcodeError.innerText = "Invalid team";
    return;
  }

  if (snap.val().passcode !== entered) {
    passcodeError.innerText = "❌ Incorrect passcode";
    return;
  }

  score = snap.val().score || 0;
  isTeamVerified = true;

  showScreen(waitingScreen);

  const adminSnap = await get(ref(db, "admin"));
  if (adminSnap.exists() && adminSnap.val().quizStarted === true) {
    showScreen(quizScreen);
  }
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
      showScreen(quizScreen);
    }
  });

  onValue(ref(db, "admin/currentQuestionIndex"), snap => {
    const index = snap.val();
    if (index === null || !questions.length) return;

    currentQuestionIndex = index;
    loadQuestion();
  });

  onValue(ref(db, "admin/questionStartTime"), snap => {
    const startTime = snap.val();
    if (!startTime) return;

    startTimer(startTime);
  });
}

/********************************
 * QUIZ ENGINE
 ********************************/
function shuffleOptions(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function resetOptionStyles() {
  optionsEls.forEach(btn => {
    btn.style.backgroundColor = "";
    btn.style.color = "";
    btn.disabled = false;
    btn.classList.remove("selected");
  });
}

function markCorrectAndWrong(correctAnswer) {
  optionsEls.forEach(btn => {
    if (btn.innerText === correctAnswer) {
      btn.style.backgroundColor = "#4CAF50"; // green
      btn.style.color = "#fff";
    }

    if (btn.classList.contains("selected") && btn.innerText !== correctAnswer) {
      btn.style.backgroundColor = "#E53935"; // red
      btn.style.color = "#fff";
    }

    btn.disabled = true;
  });
}

function loadQuestion() {
  const q = questions[currentQuestionIndex];
  if (!q) return;

  selectedOption = null;
  resetOptionStyles();

  questionNumberEl.innerText = `Question: ${currentQuestionIndex + 1}`;
  questionEl.innerText = q.question;
  scoreEl.innerText = `Score: ${score}`;

  const shuffled = shuffleOptions(q.options);

  optionsEls.forEach((btn, i) => {
    btn.innerText = shuffled[i];

    btn.onclick = () => {
      if (!isTeamVerified || timeLeft <= 0) return;

      optionsEls.forEach(o => {
        o.classList.remove("selected");
        o.style.backgroundColor = "";
        o.style.color = "";
      });

      btn.classList.add("selected");
      btn.style.backgroundColor = "#BDBDBD"; // grey
      btn.style.color = "#000";

      selectedOption = btn.innerText;
    };
  });
}

/********************************
 * GLOBAL TIMER (REFRESH SAFE)
 ********************************/
function startTimer(startTime) {
  clearInterval(timerInterval);

  function tick() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    timeLeft = Math.max(30 - elapsed, 0);
    timerEl.innerText = `Time ${timeLeft}s`;

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      const correct = questions[currentQuestionIndex]?.answer;
      if (correct) {
        markCorrectAndWrong(correct);
      }
    }
  }

  tick();
  timerInterval = setInterval(tick, 1000);
}
