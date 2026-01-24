/********************************
 * FIREBASE IMPORTS
 ********************************/
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getDatabase, ref, get, onValue, update } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";
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
let timeLeft = 0;
let score = 0;
let selectedOption = null;
let answerRevealed = false;

let isTeamVerified = false;
let quizStarted = false;
let waitingRoomOpen = false;
let level = 1;
let isQualified = false;

/********************************
 * TEAM ID
 ********************************/
const teamId = new URLSearchParams(window.location.search).get("team");

/********************************
 * ELEMENTS
 ********************************/
let passcodeScreen, waitingScreen, quizScreen, waitingScreen2, qualifiedWaitingScreen;
let passcodeInput, passcodeBtn, passcodeError;
let questionEl, timerEl, scoreEl, optionsEls, questionNumberEl, levelBannerEl;

/********************************
 * INIT
 ********************************/
window.addEventListener("DOMContentLoaded", init);

function init() {
  setupElements();
  showScreen(passcodeScreen);
  fetchQuestions();
  setupDatabaseListeners();
  restoreGameState(); 
}

/********************************
 * SETUP ELEMENTS
 ********************************/
function setupElements() {
  passcodeScreen = document.getElementById("passcode-box");
  waitingScreen = document.getElementById("WaitingScreen");
  quizScreen = document.getElementById("quiz-UI");
  waitingScreen2 = document.getElementById("WaitingScreen2");
  qualifiedWaitingScreen = document.getElementById("qualifiedWaitingScreen");

  passcodeInput = document.getElementById("passcode-input");
  passcodeBtn = document.getElementById("passcode-btn");
  passcodeError = document.getElementById("passcode-error");

  questionEl = document.getElementById("question");
  timerEl = document.getElementById("timer");
  scoreEl = document.getElementById("live-score");
  questionNumberEl = document.getElementById("question-number");
  optionsEls = document.querySelectorAll(".option");
  levelBannerEl = document.querySelector(".Level-1-banner");

  passcodeBtn.disabled = true;

  passcodeInput.addEventListener("input", () => {
    const v = passcodeInput.value.trim();
    passcodeBtn.disabled = v.length !== 6;
    passcodeError.innerText = "";

    if (v.length === 6) {
      passcodeInput.classList.add("filled");
      passcodeInput.blur();
    } else {
      passcodeInput.classList.remove("filled");
    }
  });

  passcodeBtn.addEventListener("click", verifyPasscode);
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
 * PASSCODE VERIFICATION
 ********************************/
async function verifyPasscode() {
  if (!teamId) {
    passcodeError.innerText = "Invalid team link";
    return;
  }

  const entered = passcodeInput.value.trim();
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
  isQualified = snap.val().qualified || false;
  isTeamVerified = true;

  decidePostLoginScreen();
}

/********************************
 * POST LOGIN FLOW
 ********************************/
function decidePostLoginScreen() {
  if (level === 2) {
    if (isQualified) {
      showScreen(qualifiedWaitingScreen);
    } else {
      showScreen(waitingScreen2);
    }
  } else if (level === 3) {
    if (isQualified) {
      showScreen(qualifiedWaitingScreen);
    } else if (quizStarted) {
      showScreen(quizScreen);
    } else {
      showScreen(waitingScreen);
    }
  } else if (waitingRoomOpen) {
    showScreen(waitingScreen);
  } else if (quizStarted) {
    showScreen(quizScreen);
  } else {
    showScreen(waitingScreen);
  }
}

/********************************
 * FETCH QUESTIONS
 ********************************/
function fetchQuestions() {
  const questionFile = `questions-${level}.json`;
  fetch(questionFile)
    .then(r => r.json())
    .then(data => questions = data)
    .catch(() => {
      // Fallback to default questions.json if level-specific file doesn't exist
      fetch("questions.json")
        .then(r => r.json())
        .then(data => questions = data);
    });
}

/********************************
 * DATABASE LISTENERS
 ********************************/
function setupDatabaseListeners() {

  onValue(ref(db, "admin/waitingRoomOpen"), snap => {
    waitingRoomOpen = snap.val() === true;
    if (isTeamVerified && waitingRoomOpen) {
      decidePostLoginScreen();
    }
  });

  onValue(ref(db, "admin/quizStarted"), snap => {
    quizStarted = snap.val() === true;

    if (!isTeamVerified) return;

    if (level === 2) {
      showScreen(waitingScreen2);
    } else if (quizStarted) {
      showScreen(quizScreen);
    } else {
      showScreen(waitingScreen);
    }
  });

  onValue(ref(db, "admin/level"), snap => {
    level = snap.val() || 1;

    if (!isTeamVerified) return;

    fetchQuestions();
    updateLevelBanner();
    decidePostLoginScreen();
  });

  // 🔥 LIVE SCORE LISTENER
  onValue(ref(db, `teams/${teamId}/score`), snap => {
    if (!snap.exists()) return;

    score = snap.val();
    scoreEl.innerText = `Score: ${score}`;
  });
  
  onValue(ref(db, `teams/${teamId}/qualified`), snap => {
    isQualified = snap.val() || false;

    if (!isTeamVerified) return;

    decidePostLoginScreen();
  });

  onValue(ref(db, "admin/currentQuestionIndex"), snap => {
    if (!isTeamVerified || !quizStarted) return;

    const idx = snap.val();

    // 🏁 QUIZ ENDED
    if (idx > 15) {
      timerEl.innerText = "Quiz Ended";
      questionEl.innerText = "—";
      optionsEls.forEach(btn => btn.disabled = true);
      return;
    }

    currentQuestionIndex = idx;
    renderQuestion();
  });

  onValue(ref(db, "admin/timeLeft"), snap => {
    if (!isTeamVerified || !quizStarted) return;

    timeLeft = snap.val() ?? 0;
    timerEl.innerText = `Time ${timeLeft}s left`;

    if (timeLeft === 0) {
      revealAnswer();
    }
  });
}

/********************************
 * RENDER QUESTION
 ********************************/
function renderQuestion() {
  const q = questions[currentQuestionIndex];
  if (!q) return;

  selectedOption = null;
  answerRevealed = false; 

  questionNumberEl.innerText = `Question: ${currentQuestionIndex}`;
  questionEl.innerText = q.question;
  scoreEl.innerText = `Score: ${score}`;

  resetOptions();

  shuffle(q.options).forEach((opt, i) => {
  optionsEls[i].innerText = opt;

  optionsEls[i].onclick = async () => {
    if (timeLeft <= 0) return;

    resetOptions(false);
    optionsEls[i].classList.add("selected");
    optionsEls[i].style.backgroundColor = "#BDBDBD";
    selectedOption = opt;

      await update(ref(db, `teams/${teamId}`), {
        lastAnsweredQuestion: currentQuestionIndex
      });
    };
  });
}

/********************************
 * OPTIONS
 ********************************/
function resetOptions(clearHandlers = true) {
  optionsEls.forEach(btn => {
    btn.disabled = false;
    btn.className = "option";
    btn.style.backgroundColor = "";
    btn.style.color = "";
    if (clearHandlers) btn.onclick = null;
  });
}

/********************************
 * REVEAL ANSWER
 ********************************/
async function revealAnswer() {
  if (answerRevealed) return; // 🔒 prevent double scoring
  answerRevealed = true;
  const q = questions[currentQuestionIndex];
  if (!q) return;

  optionsEls.forEach(btn => {
    btn.disabled = true;

    if (btn.innerText === q.answer) {
      btn.style.backgroundColor = "#4CAF50";
      btn.style.color = "#fff";
    } else if (btn.innerText === selectedOption) {
      btn.style.backgroundColor = "#E53935";
      btn.style.color = "#fff";
    }
  });

  if (selectedOption === q.answer){
    score += 10;
  }
  else if (selectedOption){ 
    score -= 5;
  }
  else {
    score -= 5;
  }

  scoreEl.innerText = `Score: ${score}`;
  await update(ref(db, `teams/${teamId}`), { score });
}

/********************************
 * 🔁 Restore quiz state
 ********************************/
async function restoreGameState() {
  const adminSnap = await get(ref(db, "admin"));

  if (!adminSnap.exists()) return;

  const admin = adminSnap.val();

  // 🧠 Restore values
  currentQuestionIndex = admin.currentQuestionIndex;
  timeLeft = admin.timeLeft;
  quizStarted = admin.quizStarted;
  level = admin.level || 1;

  // ✅ Load question immediately
  if (quizStarted) {
    renderQuestion();
  }

  // ⏱ Restore timer UI
  timerEl.innerText = quizStarted ? timeLeft : `⏸ ${timeLeft}`;

  // 🔁 Live timer sync
  onValue(ref(db, "admin/timeLeft"), snap => {
    if (snap.exists()) {
      timeLeft = snap.val();
      timerEl.innerText = `Time: ${timeLeft}s`;
    }
  });
}

/********************************
 * UPDATE LEVEL BANNER
 ********************************/
function updateLevelBanner() {
  if (!levelBannerEl) return;

  const bannerSrc = level === 1 ? "ASSETS/Level-1.webp" : `ASSETS/Level-${level}.webp`;
  levelBannerEl.src = bannerSrc;
}

/********************************
 * UTIL
 ********************************/
function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}
