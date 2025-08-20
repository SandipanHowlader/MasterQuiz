// ------------------- GLOBALS -------------------
let data = {};
let subjects = [];
let chapters = [];
let currentSubject = "";
let currentChapter = "";
let currentQuestions = [];
let currentQuiz = 0;
let answers = [];
let userName = "";

// Review mode globals
let reviewMode = false;
let reviewIndex = 0;

// Timer globals
let timerInterval;
let questionStartTime;
let timeTaken = []; // seconds spent per question

// ------------------- LOAD QUESTIONS -------------------
fetch("questions.json")
  .then(res => res.json())
  .then(json => {
    data = json;
    subjects = Object.keys(data);
  });

// ------------------- START FLOW -------------------
document.getElementById("startBtn").addEventListener("click", () => {
  userName = document.getElementById("userName").value.trim();
  if (!userName) {
    alert("Please enter your name!");
    return;
  }

  document.getElementById("startPage").style.display = "none";
  document.getElementById("subjectPage").style.display = "block";

  document.getElementById("greeting").textContent = `Hi, ${userName}! 👋`;
  loadSubjects();
});

// ------------------- SUBJECTS -------------------
function loadSubjects() {
  const subjectsDiv = document.getElementById("subjects");
  subjectsDiv.innerHTML = "";
  subjects.forEach(subj => {
    const btn = document.createElement("button");
    btn.textContent = subj;
    btn.className = "listBtn";
    btn.addEventListener("click", () => selectSubject(subj));
    subjectsDiv.appendChild(btn);
  });
}

function selectSubject(subj) {
  currentSubject = subj;
  chapters = Object.keys(data[subj]);

  document.getElementById("subjectPage").style.display = "none";
  document.getElementById("chapterPage").style.display = "block";
  document.getElementById("subjectTitle").textContent = `📘 ${subj}`;

  const chaptersDiv = document.getElementById("chapters");
  chaptersDiv.innerHTML = "";
  chapters.forEach(ch => {
    const btn = document.createElement("button");
    btn.textContent = ch;
    btn.className = "listBtn";
    btn.addEventListener("click", () => selectChapter(ch));
    chaptersDiv.appendChild(btn);
  });
}

// ------------------- CHAPTERS -------------------
function selectChapter(chapter) {
  currentChapter = chapter;
  currentQuestions = data[currentSubject][currentChapter];
  currentQuiz = 0;
  answers = new Array(currentQuestions.length).fill(null);
  timeTaken = new Array(currentQuestions.length).fill(0);
  reviewMode = false;

  document.getElementById("chapterPage").style.display = "none";
  document.getElementById("quizPage").style.display = "block";

  renderQuestion();
}

// ------------------- RENDER QUESTION -------------------
function renderQuestion() {
  if (reviewMode) {
    renderReviewQuestion();
    return;
  }

  const q = currentQuestions[currentQuiz];
  const quiz = document.getElementById("quiz");
  const total = currentQuestions.length;
  const selected = answers[currentQuiz];
  const options = ["a", "b", "c", "d"];

  quiz.innerHTML = `
    <div class="quiz-header">
      <div class="meta">
        <span>${userName} | Q ${currentQuiz + 1} / ${total}</span>
        <span>Unanswered: ${answers.filter(a => a === null).length}</span>
      </div>
      <h2>${q.question}</h2>
      <div id="timerBox">Time spent: <span id="timer">0s</span></div>
    </div>

    <div class="options">
      ${options.map(letter => `
        <label class="option" id="opt-${letter}">
          <input type="radio" name="opt" value="${letter}" ${selected === letter ? "checked" : ""}/>
          <span>${q[letter]}</span>
        </label>
      `).join("")}
    </div>

    <div class="nav">
      <button id="prevBtn" ${currentQuiz === 0 ? "disabled" : ""}>Previous</button>
      <button id="skipBtn">Skip</button>
      <button id="checkBtn">Save & Check</button>
      ${currentQuiz < total - 1
        ? `<button id="nextBtn" style="display:none;">Next</button>`
        : `<button id="submitBtn" style="display:none;">Submit</button>`}
    </div>

    <!-- Explanation -->
    <div id="explanationBox" class="explanation" style="display:none;">
      <button id="toggleExplanation">Show Explanation</button>
      <p id="explanationText" style="display:none;"></p>
    </div>
  `;

  quiz.querySelectorAll('input[name="opt"]').forEach(inp => {
    inp.addEventListener("change", () => {
      answers[currentQuiz] = inp.value;
    });
  });

  document.getElementById("prevBtn")?.addEventListener("click", prevQuestion);
  document.getElementById("skipBtn")?.addEventListener("click", skipQuestion);
  document.getElementById("checkBtn")?.addEventListener("click", showFeedback);
  document.getElementById("nextBtn")?.addEventListener("click", nextQuestion);
  document.getElementById("submitBtn")?.addEventListener("click", submitQuiz);

  // Reset & start timer
  clearInterval(timerInterval);
  questionStartTime = Date.now();

  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - questionStartTime) / 1000);
    document.getElementById("timer").textContent = elapsed + "s";
  }, 1000);
}

// ------------------- FEEDBACK + EXPLANATION -------------------
function showFeedback() {
  const q = currentQuestions[currentQuiz];
  const userAns = answers[currentQuiz];
  const correctAns = q.correct;

  if (userAns === null) {
    alert("Please select an answer before saving.");
    return;
  }

  const userOpt = document.getElementById(`opt-${userAns}`);
  const correctOpt = document.getElementById(`opt-${correctAns}`);

  if (userAns === correctAns) {
    userOpt.classList.add("correct");
  } else {
    userOpt.classList.add("wrong");
    correctOpt.classList.add("correct");
  }

  document.querySelectorAll("input[name='opt']").forEach(inp => inp.disabled = true);

  // Stop timer and save time
  clearInterval(timerInterval);
  const elapsed = Math.floor((Date.now() - questionStartTime) / 1000);
  timeTaken[currentQuiz] = elapsed;

  // Reveal Next/Submit button
  if (currentQuiz < currentQuestions.length - 1) {
    document.getElementById("nextBtn").style.display = "inline-block";
  } else {
    document.getElementById("submitBtn").style.display = "inline-block";
  }

  // Show explanation (collapsed by default)
  const expBox = document.getElementById("explanationBox");
  const expText = document.getElementById("explanationText");
  const toggleBtn = document.getElementById("toggleExplanation");

  expBox.style.display = "block";
  expText.textContent = q.comment || "No explanation provided.";
  expText.style.display = "none";
  toggleBtn.textContent = "Show Explanation";

  toggleBtn.addEventListener("click", () => {
    if (expText.style.display === "none") {
      expText.style.display = "block";
      toggleBtn.textContent = "Hide Explanation";
    } else {
      expText.style.display = "none";
      toggleBtn.textContent = "Show Explanation";
    }
  });
}

// ------------------- NAVIGATION -------------------
function nextQuestion() {
  if (currentQuiz < currentQuestions.length - 1) {
    currentQuiz++;
    renderQuestion();
  }
}
function prevQuestion() {
  if (currentQuiz > 0) {
    currentQuiz--;
    renderQuestion();
  }
}
function skipQuestion() {
  if (currentQuiz < currentQuestions.length - 1) {
    currentQuiz++;
    renderQuestion();
  }
}

// ------------------- SUBMIT -> REVIEW MODE -------------------
function submitQuiz() {
  let score = 0;
  currentQuestions.forEach((q, i) => {
    if (answers[i] !== null && answers[i] === q.correct) score++;
  });
  const unanswered = answers.filter(a => a === null).length;

  reviewMode = true;
  reviewIndex = 0;

  const quiz = document.getElementById("quiz");
  quiz.innerHTML = `
    <h2>Results</h2>
    <p>${userName}, here are your results:</p>
    <p>Score: <strong>${score}</strong> / ${currentQuestions.length}</p>
    <p>Unanswered: <strong>${unanswered}</strong></p>
    <hr>
    <div id="reviewContainer"></div>
    <div class="nav">
      <button id="prevReviewBtn" disabled>Previous</button>
      <button id="nextReviewBtn">Next</button>
      <button id="restartBtn">Restart</button>
    </div>
  `;

  document.getElementById("prevReviewBtn").addEventListener("click", prevReview);
  document.getElementById("nextReviewBtn").addEventListener("click", nextReview);
  document.getElementById("restartBtn").addEventListener("click", () => {
    reviewMode = false;
    document.getElementById("quizPage").style.display = "none";
    document.getElementById("startPage").style.display = "block";
  });

  renderReviewQuestion();
}

// ------------------- REVIEW MODE -------------------
function renderReviewQuestion() {
  const q = currentQuestions[reviewIndex];
  const userAns = answers[reviewIndex];
  const correctAns = q.correct;
  const options = ["a", "b", "c", "d"];

  const reviewContainer = document.getElementById("reviewContainer");
  reviewContainer.innerHTML = `
    <div class="review-question">
      <h3>Q${reviewIndex + 1}. ${q.question}</h3>
      <ul>
        ${options.map(letter => {
          let cls = "";
          if (userAns === letter && letter === correctAns) {
            cls = "correct";
          } else if (userAns === letter && letter !== correctAns) {
            cls = "wrong";
          } else if (letter === correctAns) {
            cls = "correct";
          }
          return `<li class="${cls}">${letter.toUpperCase()}: ${q[letter]}</li>`;
        }).join("")}
      </ul>
      <div class="explanation">
        <p>${q.comment || "No explanation provided."}</p>
        <p><em>Time taken: ${timeTaken[reviewIndex] || 0}s</em></p>
      </div>
    </div>
  `;

  document.getElementById("prevReviewBtn").disabled = reviewIndex === 0;
  document.getElementById("nextReviewBtn").disabled = reviewIndex === currentQuestions.length - 1;
}

function nextReview() {
  if (reviewIndex < currentQuestions.length - 1) {
    reviewIndex++;
    renderReviewQuestion();
  }
}
function prevReview() {
  if (reviewIndex > 0) {
    reviewIndex--;
    renderReviewQuestion();
  }
}
