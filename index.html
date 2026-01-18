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
let timeLeft = 0;
let timerInterval = null;
let selectedOption = null;
let isTeamVerified = false;
let quizStarted = false;
let questionStartTime = null;

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
let questionEl, timerEl, scoreEl, optionsEls;

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
  waitingScreen = document.getElementById("WaitingScreen");
  quizScreen = document.getElementById("quiz-container");

  passcodeInput = document.getElementById("passcode-input");
  passcodeBtn = document.getElementById("passcode-btn");
  passcodeError = document.getElementById("passcode-error");

  questionEl = document.getElementById("question");
  timerEl = document.getElementById("timer");
  scoreEl = document.getElementById("live-score");
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
function showScreen(screenToShow) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
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
  isTeamVerified = true;

  showScreen(waitingScreen);

  if (quizStarted) {
    startQuiz();
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
    quizStarted = snap.val() === true;
    if (isTeamVerified && quizStarted) {
      startQuiz();
    } else if (!quizStarted) {
      showScreen(waitingScreen);
    }
  });

  onValue(ref(db, "admin/currentQuestionIndex"), snap => {
    const newIndex = snap.val() || 0;
    if (currentQuestionIndex !== newIndex) {
      currentQuestionIndex = newIndex;
      if (isTeamVerified && quizStarted) {
        loadQuestion();
      }
    }
  });

  onValue(ref(db, "admin/questionStartTime"), snap => {
    const newStartTime = snap.val();
    if (newStartTime && newStartTime !== questionStartTime) {
      questionStartTime = newStartTime;
      if (isTeamVerified && quizStarted) {
        startTimer();
      }
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
  loadQuestion();
}

function loadQuestion() {
  if (currentQuestionIndex >= questions.length) {
    showWaitingScreen("Round completed. Waiting for admin decision...");
    return;
  }

  selectedOption = null;
  clearInterval(timerInterval);
  timeLeft = 0;
  timerEl.innerText = `Time 0s`;

  optionsEls.forEach(btn => {
    btn.disabled = false;
    btn.classList.remove("selected", "correct", "wrong");
    btn.onclick = () => {
      if (timeLeft > 0) {
        optionsEls.forEach(o => o.classList.remove("selected"));
        btn.classList.add("selected");
        selectedOption = btn.innerText;
      }
    };
  });

  const q = questions[currentQuestionIndex];
  const shuffled = shuffleOptions(q.options);

  questionEl.innerText = q.question;
  scoreEl.innerText = `Score: ${score}`;

  optionsEls.forEach((btn, i) => {
    btn.innerText = shuffled[i];
  });

  if (questionStartTime) {
    startTimer();
  }
}

/********************************
 * TIMER
 ********************************/
function startTimer() {
  clearInterval(timerInterval);
  const now = Date.now();
  const elapsed = Math.floor((now - questionStartTime) / 1000);
  timeLeft = Math.max(0, 30 - elapsed);

  if (timeLeft <= 0) {
    handleTimeUp();
    return;
  }

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
  clearInterval(timerInterval);
  timeLeft = 0;
  timerEl.innerText = `Time 0s`;

  const q = questions[currentQuestionIndex];

  optionsEls.forEach(btn => {
    btn.disabled = true;
    if (btn.innerText === q.answer) {
      btn.classList.add("correct");
    } else if (btn.innerText === selectedOption) {
      btn.classList.add("wrong");
    }
  });

  if (selectedOption === q.answer) {
    score += 10;
  } else {
    score -= 5;
  }

  scoreEl.innerText = `Score: ${score}`;
  await update(ref(db, `teams/${teamId}`), { score });
}

/********************************
 * WAITING SCREEN
 ********************************/
function showWaitingScreen(msg) {
  showScreen(quizScreen);
  document.querySelector(".options").style.display = "none";
  questionEl.innerText = msg;
  timerEl.innerText = "";
  scoreEl.innerText = "";
}
