// ------------------- GLOBALS -------------------
let data = {}; // quiz questions
let flashData = {}; // flashcards
let revData = {}; // revision notes
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

// Timer globals (quiz)
let timerInterval;
let questionStartTime;
let timeTaken = [];

// Flashcard globals
let flashcards = [];
let currentFlash = 0;
let flashFlipped = false;

// Revision notes globals
let revCards = [];
let currentRev = 0;

// ---------- Export global back functions ----------
window.goBackToStart = function () {
  document.getElementById("startPage").style.display = "block";
  document.getElementById("subjectPage").style.display = "none";
  document.getElementById("chapterPage").style.display = "none";
  document.getElementById("chapterActionPage").style.display = "none";
  document.getElementById("quizPage").style.display = "none";
  document.getElementById("flashcardPage").style.display = "none";
  document.getElementById("revisionNotesPage").style.display = "none";
  document.getElementById("reviewPage").style.display = "none";
};

window.goBackToSubjects = function () {
  document.getElementById("subjectPage").style.display = "block";
  document.getElementById("startPage").style.display = "none";
  document.getElementById("chapterPage").style.display = "none";
  document.getElementById("chapterActionPage").style.display = "none";
  document.getElementById("quizPage").style.display = "none";
  document.getElementById("flashcardPage").style.display = "none";
  document.getElementById("revisionNotesPage").style.display = "none";
  document.getElementById("reviewPage").style.display = "none";
};

window.goBackToChapters = function () {
  document.getElementById("chapterPage").style.display = "block";
  document.getElementById("chapterActionPage").style.display = "none";
};

// ---------- Load JSONs (questions.json, flashcards.json, revision.json) ----------
Promise.all([
  fetch("questions.json").then(r => r.json()).catch(()=>({})),
  fetch("flashcards.json").then(r => r.json()).catch(()=>({})),
  fetch("revision.json").then(r => r.json()).catch(()=>({}))
]).then(([quizJson, flashJson, revJson]) => {
  data = quizJson || {};
  flashData = flashJson || {};
  revData = revJson || {};
  subjects = Array.from(new Set([...Object.keys(data || {}), ...Object.keys(flashData || {}), ...Object.keys(revData || {})]));
}).catch(err=>{
  console.error("Failed to load JSON files:", err);
});

// ---------- DOM Ready ----------
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("startBtn")?.addEventListener("click", () => {
    userName = (document.getElementById("userName").value || "").trim();
    if (!userName) { alert("Please enter your name!"); return; }

    subjects = Array.from(new Set([...Object.keys(data || {}), ...Object.keys(flashData || {}), ...Object.keys(revData || {})]));
    if (!subjects.length) { alert("No subjects found in JSON files"); return; }

    document.getElementById("startPage").style.display = "none";
    document.getElementById("subjectPage").style.display = "block";
    document.getElementById("greeting").textContent = `Hi, ${userName}! 👋`;
    loadSubjects();
  });


  
  // flashcard controls
  document.getElementById("shuffleBtn")?.addEventListener("click", shuffleFlashcards);
  document.getElementById("flipBtn")?.addEventListener("click", toggleFlip);
  document.getElementById("prevFlashBtn")?.addEventListener("click", prevFlashcard);
  document.getElementById("nextFlashBtn")?.addEventListener("click", nextFlashcard);
  document.getElementById("exitFlashBtn")?.addEventListener("click", () => {
    document.getElementById("flashcardPage").style.display = "none";
    document.getElementById("chapterActionPage").style.display = "block";
  });

  // revision controls
  document.getElementById("prevRevBtn")?.addEventListener("click", prevRevision);
  document.getElementById("nextRevBtn")?.addEventListener("click", nextRevision);
  document.getElementById("exitRevBtn")?.addEventListener("click", () => {
    document.getElementById("revisionNotesPage").style.display = "none";
    document.getElementById("chapterActionPage").style.display = "block";
  });

  // click card to flip (flashcards)
  document.addEventListener("click", (e) => {
    if (e.target.closest("#flashCardWrap")) toggleFlip();
  });

  // keyboard shortcuts for flashcards/quiz/revision
  document.addEventListener("keydown", (e) => {
    const flashVisible = document.getElementById("flashcardPage").style.display !== "none";
    const quizVisible = document.getElementById("quizPage").style.display !== "none";
    const revVisible = document.getElementById("revisionNotesPage").style.display !== "none";

    if (flashVisible) {
      if (e.key === "ArrowRight") nextFlashcard();
      if (e.key === "ArrowLeft") prevFlashcard();
      if (e.key === " ") { e.preventDefault(); toggleFlip(); }
    } else if (quizVisible) {
      if (e.key === "ArrowRight") nextQuestion();
      if (e.key === "ArrowLeft") prevQuestion();
    } else if (revVisible) {
      if (e.key === "ArrowRight") nextRevision();
      if (e.key === "ArrowLeft") prevRevision();
    }
  });
});

// ---------- SUBJECTS ----------
function loadSubjects() {
  const subjectsDiv = document.getElementById("subjects");
  if (!subjectsDiv) return;
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
  // chapters should be union of available chapters across data sets
  const qChapters = Object.keys(data[subj] || {});
  const fChapters = Object.keys(flashData[subj] || {});
  const rChapters = Object.keys(revData[subj] || {});
  chapters = Array.from(new Set([...qChapters, ...fChapters, ...rChapters]));

  document.getElementById("subjectPage").style.display = "none";
  document.getElementById("chapterPage").style.display = "block";
  document.getElementById("subjectTitle").textContent = `📘 ${subj}`;

  const chaptersDiv = document.getElementById("chapters");
  chaptersDiv.innerHTML = "";
  chapters.forEach(ch => {
    const btn = document.createElement("button");
    btn.textContent = ch;
    btn.className = "listBtn";
    // CHAPTER CLICK: go to Chapter Action page (NEW behavior)
    btn.addEventListener("click", () => {
      currentChapter = ch;
      document.getElementById("chapterPage").style.display = "none";
      document.getElementById("chapterActionPage").style.display = "block";
      document.getElementById("actionSubjectTitle").textContent = `📘 ${currentSubject}`;
      document.getElementById("actionChapterTitle").textContent = `${currentChapter}`;

      // wire the chapter action buttons:
      document.getElementById("startQuizBtn").onclick = () => {
        currentQuestions = data[currentSubject]?.[currentChapter] || [];
        if (!currentQuestions.length) { alert("No quiz questions for this chapter."); return; }
        currentQuiz = 0;
        answers = new Array(currentQuestions.length).fill(null);
        timeTaken = new Array(currentQuestions.length).fill(0);
        reviewMode = false;
        document.getElementById("chapterActionPage").style.display = "none";
        document.getElementById("quizPage").style.display = "block";
        renderQuestion();
      };
      document.getElementById("startFlashBtn").onclick = () => {
        const subFlash = flashData[currentSubject] || {};
        flashcards = subFlash[currentChapter] ? Array.from(subFlash[currentChapter]) : [];
        if (!flashcards.length) { alert("No flashcards for this chapter."); return; }
        currentFlash = 0;
        flashFlipped = false;
        document.getElementById("chapterActionPage").style.display = "none";
        document.getElementById("flashcardPage").style.display = "block";
        document.getElementById("flashSubjectChapter").textContent = `${currentSubject} — ${currentChapter}`;
        renderFlashcard();
      };
      document.getElementById("startRevisionBtn").onclick = () => {
        const subRev = revData[currentSubject] || {};
        revCards = subRev[currentChapter] ? Array.from(subRev[currentChapter]) : [];
        if (!revCards.length) { alert("No revision notes for this chapter."); return; }
        currentRev = 0;
        document.getElementById("chapterActionPage").style.display = "none";
        document.getElementById("revisionNotesPage").style.display = "block";
        document.getElementById("revSubjectChapter").textContent = `${currentSubject} — ${currentChapter}`;
        renderRevision();
      };
    });
    chaptersDiv.appendChild(btn);
  });
}

// ---------- QUIZ: renderQuestion, showFeedback, navigation, review ----------
function renderQuestion() {
  if (!currentQuestions || currentQuestions.length === 0) {
    document.getElementById("quiz").innerHTML = "<p>No questions available.</p>";
    return;
  }
  if (reviewMode) { renderReviewQuestion(); return; }

  const q = currentQuestions[currentQuiz];
  const quiz = document.getElementById("quiz");
  const total = currentQuestions.length;
  const selected = answers[currentQuiz];
  const options = ["a","b","c","d"];

  quiz.innerHTML = `
    <div class="quiz-header">
      <div class="meta">
        <span>${userName} | Q ${currentQuiz+1} / ${total}</span>
        <span>Unanswered: ${answers.filter(a=>a===null).length}</span>
      </div>
      <h2>${q.question}</h2>
      <div id="timerBox">Time spent: <span id="timer">0s</span></div>
    </div>
    <div class="options">
      ${options.map(letter=>`
        <label class="option" id="opt-${letter}">
          <input type="radio" name="opt" value="${letter}" ${selected===letter?"checked":""}/>
          <span>${q[letter] || ""}</span>
        </label>
      `).join("")}
    </div>
    <div class="nav">
      <button id="prevBtn" ${currentQuiz===0?"disabled":""}>Previous</button>
      <button id="skipBtn">Skip</button>
      <button id="checkBtn">Save & Check</button>
      ${currentQuiz < total-1
        ? `<button id="nextBtn" style="display:none;">Next</button>`
        : `<button id="submitBtn" style="display:none;">Submit</button>`
      }
    </div>
    <div id="explanationBox" class="explanation" style="display:none;">
      <button id="toggleExplanation">Show Explanation</button>
      <p id="explanationText" style="display:none;"></p>
    </div>
  `;

  quiz.querySelectorAll('input[name="opt"]').forEach(inp => inp.addEventListener("change", ()=>{ answers[currentQuiz] = inp.value; }));

  document.getElementById("prevBtn")?.addEventListener("click", prevQuestion);
  document.getElementById("skipBtn")?.addEventListener("click", skipQuestion);
  document.getElementById("checkBtn")?.addEventListener("click", showFeedback);
  document.getElementById("nextBtn")?.addEventListener("click", nextQuestion);
  document.getElementById("submitBtn")?.addEventListener("click", submitQuiz);

  // Timer
  clearInterval(timerInterval);
  questionStartTime = Date.now();
  const prevTime = timeTaken[currentQuiz] || 0;
  const timerEl = document.getElementById("timer");
  if (timerEl) timerEl.textContent = prevTime + "s";

  timerInterval = setInterval(()=> {
    const elapsed = Math.floor((Date.now() - questionStartTime)/1000) + prevTime;
    const timerEl2 = document.getElementById("timer");
    if (timerEl2) timerEl2.textContent = elapsed + "s";
  }, 1000);
}

function showFeedback() {
  const q = currentQuestions[currentQuiz];
  const userAns = answers[currentQuiz];
  const correctAns = q.correct;
  if (userAns === null) { alert("Please select an answer before saving."); return; }

  const userOpt = document.getElementById(`opt-${userAns}`);
  const correctOpt = document.getElementById(`opt-${correctAns}`);
  if (userOpt) userOpt.classList.add(userAns===correctAns? "correct" : "wrong");
  if (correctOpt && userAns !== correctAns) correctOpt.classList.add("correct");
  document.querySelectorAll("input[name='opt']").forEach(inp => inp.disabled = true);

  clearInterval(timerInterval);
  const prev = timeTaken[currentQuiz] || 0;
  const elapsed = Math.floor((Date.now() - questionStartTime)/1000) + prev;
  timeTaken[currentQuiz] = elapsed;

  if (currentQuiz < currentQuestions.length - 1) document.getElementById("nextBtn").style.display = "inline-block";
  else document.getElementById("submitBtn").style.display = "inline-block";

  const expBox = document.getElementById("explanationBox");
  const expText = document.getElementById("explanationText");
  const toggleBtn = document.getElementById("toggleExplanation");
  if (expBox && expText && toggleBtn) {
    expBox.style.display = "block";
    expText.textContent = q.comment || q.explanation || q.comments || "No explanation provided.";
    expText.style.display = "none";
    toggleBtn.textContent = "Show Explanation";
    const cloned = toggleBtn.cloneNode(true);
    toggleBtn.parentNode.replaceChild(cloned, toggleBtn);
    cloned.addEventListener("click", ()=> {
      if (expText.style.display === "none") { expText.style.display = "block"; cloned.textContent = "Hide Explanation"; }
      else { expText.style.display = "none"; cloned.textContent = "Show Explanation"; }
    });
  }
}

function nextQuestion(){ if (currentQuiz < currentQuestions.length -1) { currentQuiz++; renderQuestion(); } }
function prevQuestion(){ if (currentQuiz > 0) { currentQuiz--; renderQuestion(); } }
function skipQuestion(){
  clearInterval(timerInterval);
  const prev = timeTaken[currentQuiz] || 0;
  const elapsed = Math.floor((Date.now() - questionStartTime)/1000) + prev;
  timeTaken[currentQuiz] = elapsed;
  if (currentQuiz < currentQuestions.length -1) { currentQuiz++; renderQuestion(); }
}


function submitQuiz() {
  clearInterval(timerInterval);
  const prev = timeTaken[currentQuiz] || 0;
  const elapsed = Math.floor((Date.now() - questionStartTime)/1000) + prev;
  timeTaken[currentQuiz] = elapsed;

  let score = 0;
  currentQuestions.forEach((q,i)=> { if (answers[i] !== null && answers[i] === q.correct) score++; });
  const unanswered = answers.filter(a=>a===null).length;

  reviewMode = true;
  reviewIndex = 0;

  const quiz = document.getElementById("quiz");
  quiz.innerHTML = `
    <h2>Results</h2>
    <p>${userName}, here are your results:</p>
    <p>Score: <strong>${score}</strong> / ${currentQuestions.length}</p>
    <p>Unanswered: <strong>${unanswered}</strong></p>
    <p>Total time: <strong>${timeTaken.reduce((a,b)=>a+(b||0),0)}s</strong></p>
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
  document.getElementById("restartBtn").addEventListener("click", ()=> {
    reviewMode = false;
    document.getElementById("quizPage").style.display = "none";
    document.getElementById("startPage").style.display = "block";
  });
  renderReviewQuestion();
}

function renderReviewQuestion(){
  const q = currentQuestions[reviewIndex];
  const userAns = answers[reviewIndex];
  const correctAns = q.correct;
  const options = ["a","b","c","d"];
  const reviewContainer = document.getElementById("reviewContainer");
  reviewContainer.innerHTML = `
    <div class="review-question">
      <h3>Q${reviewIndex+1}. ${q.question}</h3>
      <ul>
        ${options.map(letter=>{
          let cls="";
          if (userAns===letter && letter===correctAns) cls="correct";
          else if (userAns===letter && letter!==correctAns) cls="wrong";
          else if (letter===correctAns) cls="correct";
          return `<li class="${cls}">${letter.toUpperCase()}: ${q[letter] || ""}</li>`;
        }).join("")}
      </ul>
      <div class="explanation">
        <p>${q.comment || q.explanation || q.comments || "No explanation provided."}</p>
        <p><em>Time taken: ${timeTaken[reviewIndex] || 0}s</em></p>
      </div>
    </div>
  `;
  document.getElementById("prevReviewBtn").disabled = reviewIndex===0;
  document.getElementById("nextReviewBtn").disabled = reviewIndex===currentQuestions.length-1;
}
function nextReview(){ if (reviewIndex < currentQuestions.length-1) { reviewIndex++; renderReviewQuestion(); } }
function prevReview(){ if (reviewIndex > 0) { reviewIndex--; renderReviewQuestion(); } }

// ---------- Flashcards ----------
// ---------- Flashcard animation state ----------
let flashAnimating = false;

/**
 * renderFlashcard()
 * - Renders currentFlash card content into DOM and resets flip state
 * - No animation, used on initial load or fallback
 */
function renderFlashcard() {
  if (!flashcards || flashcards.length === 0) {
    document.getElementById("cardFront").textContent = "";
    document.getElementById("cardBack").textContent = "";
    document.getElementById("flashProgress").textContent = "0 / 0";
    return;
  }
  const card = flashcards[currentFlash];
  document.getElementById("cardFront").textContent = card.front || "";
  document.getElementById("cardBack").textContent  = card.back  || "";
  document.getElementById("cardInner").classList.remove("flipped"); // show front
  flashFlipped = false;
  document.getElementById("flashProgress").textContent = `${currentFlash + 1} / ${flashcards.length}`;

  // clear any animation classes if present
  const outer = document.querySelector('.card-outer');
  outer && outer.classList.remove('flash-anim-enter-right','flash-anim-exit-left','flash-anim-enter-left','flash-anim-exit-right','flash-animating');
}

/**
 * animateFlashChange(direction, newIndex)
 * - direction: "next" or "prev"
 * - plays exit animation, swaps content via renderFlashcard(), plays enter animation
 * - resets flip to front
 */
function animateFlashChange(direction, newIndex) {
  return new Promise((resolve) => {
    const outer = document.querySelector('.card-outer');
    const inner = document.getElementById('cardInner');
    if (!outer || !inner) {
      currentFlash = newIndex;
      renderFlashcard();
      resolve();
      return;
    }

    if (flashAnimating) {
      resolve();
      return;
    }
    flashAnimating = true;
    outer.classList.add('flash-animating');

    const exitClass = direction === 'next' ? 'flash-anim-exit-left' : 'flash-anim-exit-right';
    const enterClass = direction === 'next' ? 'flash-anim-enter-right' : 'flash-anim-enter-left';

    // play exit
    outer.classList.add(exitClass);

    const onExit = () => {
      outer.removeEventListener('animationend', onExit);
      outer.classList.remove(exitClass);

      // update index and content (use renderFlashcard which resets flip)
      currentFlash = newIndex;
      renderFlashcard();

      // next animation frame then play enter
      requestAnimationFrame(() => {
        outer.classList.add(enterClass);

        const onEnter = () => {
          outer.removeEventListener('animationend', onEnter);
          outer.classList.remove(enterClass);
          outer.classList.remove('flash-animating');
          flashAnimating = false;
          resolve();
        };

        outer.addEventListener('animationend', onEnter);
      });
    };

    outer.addEventListener('animationend', onExit);
  });
}

/**
 * nextFlashcard() / prevFlashcard()
 * - call animateFlashChange to perform smooth sliding
 * - if animation fails/falls back, renderFlashcard used
 */
function nextFlashcard() {
  if (!flashcards || currentFlash >= flashcards.length - 1) return;
  const newIndex = currentFlash + 1;
  animateFlashChange('next', newIndex).catch(() => {
    currentFlash = newIndex;
    renderFlashcard();
    flashAnimating = false;
  });
}

function prevFlashcard() {
  if (!flashcards || currentFlash <= 0) return;
  const newIndex = currentFlash - 1;
  animateFlashChange('prev', newIndex).catch(() => {
    currentFlash = newIndex;
    renderFlashcard();
    flashAnimating = false;
  });
}

function toggleFlip() {
  const inner = document.getElementById("cardInner");
  flashFlipped = !flashFlipped;
  if (flashFlipped) inner.classList.add("flipped");
  else inner.classList.remove("flipped");
}
//function nextFlashcard(){ if (currentFlash < flashcards.length -1) { currentFlash++; renderFlashcard(); } }
//function prevFlashcard(){ if (currentFlash > 0) { currentFlash--; renderFlashcard(); } }
function shuffleFlashcards(){
  for (let i = flashcards.length -1; i>0; i--){
    const j = Math.floor(Math.random()*(i+1));
    [flashcards[i], flashcards[j]] = [flashcards[j], flashcards[i]];
  }
  currentFlash = 0;
  renderFlashcard();
}

// ---------- Revision Notes ----------
// Revision animation state
let revAnimating = false;

/**
 * renderRevision()
 * - called to render the current revision card without animation
 * - keeps progress updated
 */
// ------------------ Rich-text helpers for Revision Notes ------------------

// escape HTML (to safely turn plain text into text nodes)
function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Very small inline Markdown -> HTML converter for common constructs:
 * - headings (#, ##, ###)
 * - paragraphs
 * - unordered lists (- or *)
 * - bold **text**
 * - italic *text* or _text_
 * - inline code `x`
 * - code blocks ``` ... ```
 * - links [text](url)
 *
 * NOTE: This converter first escapes HTML so raw HTML won't be executed.
 * Final HTML is passed through sanitizeHtml() to remove disallowed tags/attributes.
 */
function markdownToHtml(md) {
  md = String(md || "");
  md = md.replace(/\r/g, ""); // normalize

  // extract code blocks first
  const codeBlocks = [];
  md = md.replace(/```([\s\S]*?)```/g, function (_, code) {
    codeBlocks.push(code);
    return `\u0000CODEBLOCK${codeBlocks.length - 1}\u0000`;
  });

  // escape all leftover HTML
  md = escapeHtml(md);

  // restore code blocks as placeholders (they were not escaped)
  // but ensure their content is escaped as code
  md = md.replace(/\u0000CODEBLOCK(\d+)\u0000/g, function (_, idx) {
    const code = codeBlocks[Number(idx)];
    return `<pre><code>${escapeHtml(code)}</code></pre>`;
  });

  const lines = md.split("\n");
  let out = "";
  let inList = false;

  function inlineTransforms(text) {
    // inline code
    text = text.replace(/`([^`]+?)`/g, function (_, code) {
      return `<code>${code}</code>`;
    });
    // links [text](url)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, txt, url) {
      // keep url escaped for safety (but allow http(s), mailto:, relative, #)
      const safeHref = escapeHtml(url);
      return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">${txt}</a>`;
    });
    // bold **text**
    text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    // italic *text* or _text_
    text = text.replace(/(^|[^*])\*(?!\*)([^*]+?)\*(?!\*)/g, "$1<em>$2</em>");
    text = text.replace(/_(.+?)_/g, "<em>$1</em>");
    return text;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // headings
    const hMatch = line.match(/^(#{1,6})\s*(.+)$/);
    if (hMatch) {
      if (inList) { out += "</ul>"; inList = false; }
      const level = Math.min(6, hMatch[1].length);
      out += `<h${level}>${inlineTransforms(hMatch[2].trim())}</h${level}>`;
      continue;
    }

    // unordered list
    const liMatch = line.match(/^\s*[-*]\s+(.*)$/);
    if (liMatch) {
      if (!inList) { inList = true; out += "<ul>"; }
      out += `<li>${inlineTransforms(liMatch[1].trim())}</li>`;
      continue;
    } else {
      if (inList) { out += "</ul>"; inList = false; }
    }

    // empty line -> paragraph separator
    if (line.trim() === "") {
      out += "<p></p>";
      continue;
    }

    // normal paragraph line
    out += `<p>${inlineTransforms(line)}</p>`;
  }

  if (inList) out += "</ul>";

  return out;
}

/**
 * sanitizeHtml(html)
 * - Allows only a small set of tags and attributes.
 * - Strips disallowed tags but preserves their textual children.
 * - Ensures <a> hrefs are safe (http(s), mailto:, relative, or hash).
 */
function sanitizeHtml(unsafeHtml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(String(unsafeHtml || ""), "text/html");

  const ALLOWED_TAGS = new Set([
    "A", "P", "BR", "STRONG", "B", "EM", "I", "UL", "OL", "LI",
    "CODE", "PRE", "H1","H2","H3","H4","H5","H6", "SPAN"
  ]);

  function isSafeHref(href) {
    if (!href) return false;
    // allow http(s), mailto:, relative paths and anchor links
    return /^(https?:|mailto:|\/|#)/i.test(href);
  }

  function cleanNode(node) {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        if (!ALLOWED_TAGS.has(child.nodeName)) {
          // replace node with its children (strip the tag)
          const frag = document.createDocumentFragment();
          while (child.firstChild) frag.appendChild(child.firstChild);
          node.replaceChild(frag, child);
          // recursively clean the moved children
          cleanNode(node);
        } else {
          // sanitize attributes
          if (child.nodeName === "A") {
            const href = child.getAttribute("href") || "";
            if (isSafeHref(href)) {
              child.setAttribute("href", href);
              child.setAttribute("target", "_blank");
              child.setAttribute("rel", "noopener noreferrer");
            } else {
              child.removeAttribute("href");
            }
            // remove other attributes on <a>
            Array.from(child.attributes).forEach(attr => {
              if (!["href","target","rel","title"].includes(attr.name)) child.removeAttribute(attr.name);
            });
          } else {
            // remove all attributes except title/class/id (optional)
            Array.from(child.attributes).forEach(attr => {
              if (!["title","class","id"].includes(attr.name)) child.removeAttribute(attr.name);
            });
          }
          // recurse into element
          cleanNode(child);
        }
      } else if (child.nodeType === Node.COMMENT_NODE) {
        // remove comments
        node.removeChild(child);
      } else {
        // text nodes are fine
      }
    }
  }

  cleanNode(doc.body);
  return doc.body.innerHTML;
}

/**
 * renderRevision()
 * - Supports both Markdown and HTML input.
 * - Heuristics: if the content contains HTML tags, treat as HTML and sanitize.
 *   otherwise treat as Markdown.
 */
function renderRevision() {
  const revWrap = document.getElementById("revCard");
  const revContentEl = document.getElementById("revContent");
  if (!revCards || !revCards.length || !revWrap || !revContentEl) return;
  const card = revCards[currentRev];
  const raw = card.content || "";

  let html = "";

  // If content looks like HTML (contains <tag>), accept as HTML (but sanitize).
  const looksLikeHtml = /<\s*[a-zA-Z]+.*?>/.test(raw);

  if (looksLikeHtml) {
    // sanitize user-supplied HTML
    html = sanitizeHtml(raw);
  } else {
    // parse markdown and then sanitize resulting HTML
    html = sanitizeHtml(markdownToHtml(raw));
  }

  // Apply into DOM
  revContentEl.innerHTML = html;

  // Update progress UI if present
  const progressEl = document.getElementById("revProgress");
  if (progressEl) progressEl.textContent = `${currentRev + 1} / ${revCards.length}`;

  // clear any animation classes (if needed)
  revWrap.classList.remove("rev-anim-enter-right", "rev-anim-enter-left", "rev-anim-exit-left", "rev-anim-exit-right", "rev-animating");
}


/**
 * animateRevisionChange(direction, newIndex)
 * direction: "next" or "prev"
 * returns a Promise resolved when animation completes
 */
function animateRevisionChange(direction, newIndex) {
  return new Promise((resolve) => {
    const revWrap = document.getElementById("revCard");
    const revContentEl = document.getElementById("revContent");

    if (!revWrap || !revContentEl) {
      // fallback: direct update
      currentRev = newIndex;
      renderRevision();
      resolve();
      return;
    }

    // prevent overlapping animations
    if (revAnimating) {
      resolve();
      return;
    }
    revAnimating = true;
    revWrap.classList.add("rev-animating");

    // choose classes based on direction
    const exitClass = direction === "next" ? "rev-anim-exit-left" : "rev-anim-exit-right";
    const enterClass = direction === "next" ? "rev-anim-enter-right" : "rev-anim-enter-left";

    // play exit animation
    revWrap.classList.add(exitClass);

    // wait for exit animation end
    const onExitEnd = () => {
      revWrap.removeEventListener("animationend", onExitEnd);
      revWrap.classList.remove(exitClass);

      // update index and render rich content using renderRevision()
      currentRev = newIndex;
      // renderRevision handles markdown -> html + sanitization and sets innerHTML
      renderRevision();

      // small tick to allow DOM to update before enter animation
      requestAnimationFrame(() => {
        // play enter animation
        revWrap.classList.add(enterClass);

        const onEnterEnd = () => {
          revWrap.removeEventListener("animationend", onEnterEnd);
          revWrap.classList.remove(enterClass);
          revWrap.classList.remove("rev-animating");
          revAnimating = false;
          // update progress UI
          const progressEl = document.getElementById("revProgress");
          if (progressEl) progressEl.textContent = `${currentRev + 1} / ${revCards.length}`;
          resolve();
        };

        revWrap.addEventListener("animationend", onEnterEnd);
      });
    };

    revWrap.addEventListener("animationend", onExitEnd);
  });
}


/**
 * nextRevision() / prevRevision()
 * Use animateRevisionChange for smooth transition
 */
function nextRevision() {
  if (!revCards || currentRev >= revCards.length - 1) return;
  // compute new index
  const newIndex = currentRev + 1;
  animateRevisionChange("next", newIndex).catch(() => {
    // fallback to direct update
    currentRev = newIndex;
    renderRevision();
    revAnimating = false;
  });
}

function prevRevision() {
  if (!revCards || currentRev <= 0) return;
  const newIndex = currentRev - 1;
  animateRevisionChange("prev", newIndex).catch(() => {
    currentRev = newIndex;
    renderRevision();
    revAnimating = false;
  });
}


function exitQuiz() {
  // Stop question timer if running
  if (typeof questionTimer !== "undefined" && questionTimer) {
    clearInterval(questionTimer);
  }

  // Hide quiz page
  document.getElementById("quizPage").style.display = "none";

  // Show chapter action page
  document.getElementById("chapterActionPage").style.display = "block";

  // Optional: Reset quiz state so new quiz starts fresh
  currentQuiz = 0;
}

 // Splash screen logic
    window.addEventListener('load', function() {
      setTimeout(function() {
        const splash = document.getElementById('splash-screen');
        const container = document.querySelector('.container');
        
        splash.classList.add('fade-out');
        container.classList.add('visible');
        
        setTimeout(function() {
          splash.style.display = 'none';
        }, 500);
      }, 2000); // 2 second splash screen
    });

    // PWA Install Prompt
    let deferredPrompt;
    const installPrompt = document.getElementById('install-prompt');
    const installBtn = document.getElementById('install-btn');
    const dismissBtn = document.getElementById('dismiss-btn');

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      
      // Show install prompt after splash screen
      setTimeout(() => {
        installPrompt.classList.add('show');
      }, 3000);
    });

    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) {
        return;
      }
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response: ${outcome}`);
      deferredPrompt = null;
      installPrompt.classList.remove('show');
    });

    dismissBtn.addEventListener('click', () => {
      installPrompt.classList.remove('show');
    });

    window.addEventListener('appinstalled', () => {
      console.log('PWA installed successfully!');
      installPrompt.classList.remove('show');
    });
