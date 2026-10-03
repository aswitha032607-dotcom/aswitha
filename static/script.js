/**
 * EduGenie – AI Learning Assistant
 * Modern Multi-Page Architecture & Local Activity Tracking
 */

// =========================================================================
// 1. LocalStorage Activity & Progress Storage Manager
// =========================================================================
const EduGenieStorage = {
  KEY: "edugenie_activities_v1",

  getAllActivities() {
    try {
      const data = localStorage.getItem(this.KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn("Could not read localStorage:", e);
      return [];
    }
  },

  getActivitiesByType(type) {
    const list = this.getAllActivities();
    if (!type || type === "all") return list;
    return list.filter(item => item.type === type);
  },

  saveActivity(activity) {
    try {
      const list = this.getAllActivities();
      const newEntry = {
        id: "act_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        timestamp: new Date().toISOString(),
        dateFormatted: new Date().toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric"
        }),
        timeFormatted: new Date().toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit"
        }),
        ...activity
      };
      list.unshift(newEntry);
      // Keep up to 100 most recent activities
      if (list.length > 100) list.pop();
      localStorage.setItem(this.KEY, JSON.stringify(list));
      return newEntry;
    } catch (e) {
      console.warn("Could not save to localStorage:", e);
      return null;
    }
  },

  clearAllActivities() {
    try {
      localStorage.removeItem(this.KEY);
      return true;
    } catch (e) {
      console.warn("Could not clear localStorage:", e);
      return false;
    }
  },

  calculateStats() {
    const list = this.getAllActivities();
    const qaItems = list.filter(a => a.type === "qa");
    const quizItems = list.filter(a => a.type === "quiz");
    const explainItems = list.filter(a => a.type === "explain");
    const sumItems = list.filter(a => a.type === "summarize");
    const lpItems = list.filter(a => a.type === "learn");

    // Quiz score calculations
    let totalScore = 0;
    let totalPossible = 0;
    quizItems.forEach(q => {
      if (q.meta && typeof q.meta.score === "number" && typeof q.meta.total === "number") {
        totalScore += q.meta.score;
        totalPossible += q.meta.total;
      }
    });
    const avgQuizPct = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;

    // Distinct topics explored
    const topicsSet = new Set();
    list.forEach(item => {
      if (item.title) {
        topicsSet.add(item.title.trim().toLowerCase());
      }
    });

    // Learning streak (consecutive distinct days with activity)
    const dayTimestamps = new Set(
      list.map(a => new Date(a.timestamp).toISOString().split("T")[0])
    );
    let streakDays = 0;
    if (dayTimestamps.size > 0) {
      const today = new Date().toISOString().split("T")[0];
      const yesterdayDate = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      
      // If user was active today or yesterday, count streak
      if (dayTimestamps.has(today) || dayTimestamps.has(yesterdayDate)) {
        streakDays = dayTimestamps.size;
      } else {
        streakDays = 0;
      }
    }

    return {
      questionsAsked: qaItems.length,
      quizzesCompleted: quizItems.length,
      averageQuizScore: avgQuizPct,
      topicsExplored: topicsSet.size,
      topicsList: Array.from(topicsSet).map(t => t.charAt(0).toUpperCase() + t.slice(1)),
      learningStreak: streakDays,
      totalSessions: list.length,
      countsByType: {
        all: list.length,
        qa: qaItems.length,
        explain: explainItems.length,
        quiz: quizItems.length,
        summarize: sumItems.length,
        learn: lpItems.length
      }
    };
  }
};

// =========================================================================
// 2. Global Utilities (Toast, Modals, Markdown Formatting)
// =========================================================================

function showToast(message, duration = 3000) {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<span>✓</span><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(15px)";
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatMarkdownText(text) {
  if (!text) return "";
  let html = escapeHtml(text);

  // Markdown Headers: ### Header
  html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
  html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
  html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>");

  // Bold & Italic
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

  // Code blocks: ```lang ... ```
  html = html.replace(/```(?:[a-zA-Z]+)?\n([\s\S]*?)```/g, "<pre><code>$1</code></pre>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Bullet points: - item or * item
  html = html.replace(/^\- (.*$)/gim, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>)/gim, "<ul>$1</ul>");

  // Clean double ul tags
  html = html.replace(/<\/ul>\s*<ul>/g, "");

  // Line breaks to paragraphs
  html = html.replace(/\n\n+/g, "<br><br>");

  return html;
}

// =========================================================================
// 3. Main DOM Initialization & Shared Navigation
// =========================================================================

document.addEventListener("DOMContentLoaded", () => {
  // Mobile Menu Toggle
  const mobileToggle = document.getElementById("mobileToggle");
  const navMenu = document.getElementById("navMenu");

  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener("click", () => {
      const isOpen = navMenu.classList.toggle("open");
      mobileToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    // Close menu when clicking nav items
    navMenu.querySelectorAll(".nav-item").forEach(item => {
      item.addEventListener("click", () => {
        navMenu.classList.remove("open");
        mobileToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // Config Help Modal
  const configModal = document.getElementById("configModal");
  const configHelpBtn = document.getElementById("configHelpBtn");
  const apiStatusBadge = document.getElementById("apiStatusBadge");
  const modalCloseBtn = document.getElementById("modalCloseBtn");
  const modalOkBtn = document.getElementById("modalOkBtn");

  function openConfigModal() {
    if (configModal) configModal.style.display = "flex";
  }
  function closeConfigModal() {
    if (configModal) configModal.style.display = "none";
  }

  configHelpBtn?.addEventListener("click", openConfigModal);
  apiStatusBadge?.addEventListener("click", openConfigModal);
  modalCloseBtn?.addEventListener("click", closeConfigModal);
  modalOkBtn?.addEventListener("click", closeConfigModal);
  configModal?.addEventListener("click", (e) => {
    if (e.target === configModal) closeConfigModal();
  });

  // Verify real API readiness status with server
  fetch("/api/config-status")
    .then(r => r.json())
    .then(data => {
      if (data && apiStatusBadge) {
        if (data.api_configured) {
          apiStatusBadge.className = "api-status-badge status-active";
          apiStatusBadge.querySelector(".status-label").textContent = "Gemini Ready";
          apiStatusBadge.title = `Gemini Connected (${data.model})`;
        } else {
          apiStatusBadge.className = "api-status-badge status-warning";
          apiStatusBadge.querySelector(".status-label").textContent = "API Key Needed";
          apiStatusBadge.title = "Gemini API key missing in .env";
        }
      }
    })
    .catch(() => {});

  // Sample Chips generic auto-filler
  document.querySelectorAll(".sample-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const sampleText = chip.dataset.sample;
      const targetTextarea = chip.closest(".workspace-card, .container")?.querySelector("textarea, input[type='text']:not(.modern-input)");
      if (targetTextarea && sampleText) {
        targetTextarea.value = sampleText;
        targetTextarea.dispatchEvent(new Event("input"));
        targetTextarea.focus();
      }
    });
  });

  // Attach Page-Specific Controllers
  initHomePage();
  initAskAiPage();
  initExplainPage();
  initQuizPage();
  initSummarizePage();
  initLearningPathPage();
  initHistoryPage();
  initProgressPage();
});

// =========================================================================
// 4. Page 1: Home Page Controller (`/`)
// =========================================================================
function initHomePage() {
  const homeEl = document.getElementById("homePage");
  if (!homeEl) return;

  const stats = EduGenieStorage.calculateStats();
  
  const qEl = document.getElementById("homeQuestionsCount");
  const qzEl = document.getElementById("homeQuizzesCount");
  const tEl = document.getElementById("homeTopicsCount");
  const sEl = document.getElementById("homeStreakCount");
  const noteEl = document.getElementById("homeStatsNote");

  if (qEl) qEl.textContent = stats.questionsAsked;
  if (qzEl) qzEl.textContent = stats.quizzesCompleted;
  if (tEl) tEl.textContent = stats.topicsExplored;
  if (sEl) sEl.textContent = `${stats.learningStreak} ${stats.learningStreak === 1 ? 'Day' : 'Days'}`;

  if (noteEl && stats.totalSessions > 0) {
    noteEl.innerHTML = `<span class="pulse-indicator"></span> Great momentum! You have completed <strong>${stats.totalSessions}</strong> study activities with EduGenie.`;
  }
}

// =========================================================================
// 5. Page 2: Ask AI Controller (`/ask-ai`)
// =========================================================================
function initAskAiPage() {
  const page = document.getElementById("askAiPage");
  if (!page) return;

  const questionInput = document.getElementById("qaQuestion");
  const subjectInput = document.getElementById("qaSubject");
  const diffSelect = document.getElementById("qaDifficulty");
  const submitBtn = document.getElementById("qaSubmitBtn");
  const clearBtn = document.getElementById("qaClearBtn");
  const pasteBtn = document.getElementById("qaPasteBtn");
  const charCount = document.getElementById("qaCharCount");
  const loading = document.getElementById("qaLoading");
  const errorBanner = document.getElementById("qaError");
  const errorMessage = document.getElementById("qaErrorMessage");
  const errorCloseBtn = document.getElementById("qaErrorCloseBtn");
  const resultWrapper = document.getElementById("qaResultWrapper");
  const answerContent = document.getElementById("qaAnswerContent");
  const keyPointsContainer = document.getElementById("qaKeyPointsContainer");
  const emptyState = document.getElementById("qaEmptyState");
  const copyBtn = document.getElementById("qaCopyBtn");

  let currentRawAnswer = "";

  questionInput?.addEventListener("input", () => {
    if (charCount) charCount.textContent = questionInput.value.length;
  });

  clearBtn?.addEventListener("click", () => {
    questionInput.value = "";
    if (charCount) charCount.textContent = "0";
    questionInput.focus();
  });

  pasteBtn?.addEventListener("click", async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        questionInput.value = text;
        if (charCount) charCount.textContent = text.length;
        showToast("Pasted from clipboard!");
      }
    } catch {
      showToast("Clipboard access denied. Use Ctrl+V.");
    }
  });

  questionInput?.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleAskAi();
    }
  });

  errorCloseBtn?.addEventListener("click", () => {
    if (errorBanner) errorBanner.style.display = "none";
  });

  submitBtn?.addEventListener("click", handleAskAi);

  copyBtn?.addEventListener("click", () => {
    if (currentRawAnswer) {
      navigator.clipboard.writeText(currentRawAnswer).then(() => {
        showToast("Answer copied to clipboard!");
      });
    }
  });

  async function handleAskAi() {
    const question = questionInput.value.trim();
    if (!question) {
      showToast("Please enter a question to ask.");
      questionInput.focus();
      return;
    }

    const subject = subjectInput?.value?.trim() || "";
    const difficulty = diffSelect?.value || "Any";

    // Set UI Loading
    if (loading) loading.style.display = "flex";
    if (errorBanner) errorBanner.style.display = "none";
    if (emptyState) emptyState.style.display = "none";
    if (resultWrapper) resultWrapper.style.display = "none";
    if (submitBtn) submitBtn.disabled = true;

    try {
      const res = await fetch("/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question,
          subject: subject || null,
          difficulty: difficulty !== "Any" ? difficulty : null
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.detail || "Unable to generate answer.");
      }

      currentRawAnswer = data.answer || "";
      answerContent.innerHTML = formatMarkdownText(data.answer);

      // Render Key Takeaways
      if (data.key_points && Array.isArray(data.key_points) && data.key_points.length > 0) {
        keyPointsContainer.innerHTML = `
          <div class="key-points-section" style="margin-top: 1.5rem;">
            <div class="section-label-sm" style="margin-bottom: 0.75rem;">Key Takeaways</div>
            <div class="key-points-grid">
              ${data.key_points.map(pt => `
                <div class="key-point-card">
                  <span class="kp-icon">✦</span>
                  <span class="kp-text">${escapeHtml(pt)}</span>
                </div>
              `).join("")}
            </div>
          </div>
        `;
      } else {
        keyPointsContainer.innerHTML = "";
      }

      // Save to localStorage History
      EduGenieStorage.saveActivity({
        type: "qa",
        title: question,
        subtitle: subject ? `${subject} • ${difficulty}` : `Academic Q&A • ${difficulty}`,
        contentSnippet: data.answer ? data.answer.substring(0, 160) + "..." : "",
        meta: {
          keyPointsCount: (data.key_points || []).length
        }
      });

      resultWrapper.style.display = "block";
      resultWrapper.scrollIntoView({ behavior: "smooth", block: "nearest" });

    } catch (err) {
      if (errorMessage) errorMessage.textContent = err.message || "Failed to generate answer. Please try again.";
      if (errorBanner) errorBanner.style.display = "flex";
    } finally {
      if (loading) loading.style.display = "none";
      if (submitBtn) submitBtn.disabled = false;
    }
  }
}

// =========================================================================
// 6. Page 3: Explain Concept Controller (`/explain`)
// =========================================================================
function initExplainPage() {
  const page = document.getElementById("explainPage");
  if (!page) return;

  const topicInput = document.getElementById("explainTopic");
  const subjectInput = document.getElementById("explainSubject");
  const diffSelect = document.getElementById("explainDifficulty");
  const submitBtn = document.getElementById("explainSubmitBtn");
  const clearBtn = document.getElementById("explainClearBtn");
  const charCount = document.getElementById("explainCharCount");
  const loading = document.getElementById("explainLoading");
  const errorBanner = document.getElementById("explainError");
  const errorMessage = document.getElementById("explainErrorMessage");
  const errorCloseBtn = document.getElementById("explainErrorCloseBtn");
  const resultWrapper = document.getElementById("explainResultWrapper");
  const cardsContainer = document.getElementById("explainCardsContainer");
  const emptyState = document.getElementById("explainEmptyState");
  const copyBtn = document.getElementById("explainCopyBtn");

  let currentRawExplanation = "";

  topicInput?.addEventListener("input", () => {
    if (charCount) charCount.textContent = topicInput.value.length;
  });

  clearBtn?.addEventListener("click", () => {
    topicInput.value = "";
    if (charCount) charCount.textContent = "0";
    topicInput.focus();
  });

  errorCloseBtn?.addEventListener("click", () => {
    if (errorBanner) errorBanner.style.display = "none";
  });

  submitBtn?.addEventListener("click", handleExplain);

  copyBtn?.addEventListener("click", () => {
    if (currentRawExplanation) {
      navigator.clipboard.writeText(currentRawExplanation).then(() => {
        showToast("Explanation copied to clipboard!");
      });
    }
  });

  async function handleExplain() {
    const topic = topicInput.value.trim();
    if (!topic) {
      showToast("Please enter a topic to explain.");
      topicInput.focus();
      return;
    }

    const subject = subjectInput?.value?.trim() || "";
    const difficulty = diffSelect?.value || "Beginner";

    if (loading) loading.style.display = "flex";
    if (errorBanner) errorBanner.style.display = "none";
    if (emptyState) emptyState.style.display = "none";
    if (resultWrapper) resultWrapper.style.display = "none";
    if (submitBtn) submitBtn.disabled = true;

    try {
      const res = await fetch("/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic,
          subject: subject || null,
          difficulty: difficulty
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.detail || "Unable to explain topic.");
      }

      currentRawExplanation = data.explanation || "";
      const s = data.structured || {};
      const defText = s.definition || "Overview of concept";
      const howText = s.how_it_works || data.explanation || "";
      const egText = s.example || "Real-world analogy and application.";
      const kpList = Array.isArray(s.key_points) ? s.key_points : ["Core fundamental principle"];
      const rememberText = s.remember || "Consistent review reinforces lasting comprehension.";

      cardsContainer.innerHTML = `
        <!-- Card 1: Definition -->
        <div class="exp-card">
          <div class="exp-card-header">
            <div class="exp-badge-icon" style="background-color: var(--primary-light); color: var(--primary);">📖</div>
            <h4 class="exp-card-title">Simple Definition</h4>
          </div>
          <div class="exp-card-body">${formatMarkdownText(defText)}</div>
        </div>

        <!-- Card 2: How It Works -->
        <div class="exp-card">
          <div class="exp-card-header">
            <div class="exp-badge-icon" style="background-color: var(--secondary-light); color: var(--secondary);">⚙️</div>
            <h4 class="exp-card-title">How It Works & Core Mechanics</h4>
          </div>
          <div class="exp-card-body">${formatMarkdownText(howText)}</div>
        </div>

        <!-- Card 3: Example -->
        <div class="exp-card">
          <div class="exp-card-header">
            <div class="exp-badge-icon" style="background-color: var(--accent-cyan-light); color: var(--accent-cyan);">💡</div>
            <h4 class="exp-card-title">Real-World Analogy & Example</h4>
          </div>
          <div class="exp-card-body">${formatMarkdownText(egText)}</div>
        </div>

        <!-- Card 4: Key Points -->
        <div class="exp-card">
          <div class="exp-card-header">
            <div class="exp-badge-icon" style="background-color: var(--accent-emerald-light); color: var(--accent-emerald);">🎯</div>
            <h4 class="exp-card-title">Important Points to Master</h4>
          </div>
          <div class="exp-card-body">
            <ul class="bullet-checklist">
              ${kpList.map(kp => `<li>${escapeHtml(kp)}</li>`).join("")}
            </ul>
          </div>
        </div>

        <!-- Card 5: Remember This -->
        <div class="exp-card card-remember">
          <div class="exp-card-header">
            <div class="exp-badge-icon" style="background-color: var(--accent-amber-light); color: var(--accent-amber);">🧠</div>
            <h4 class="exp-card-title">Quick Revision (Remember This)</h4>
          </div>
          <div class="exp-card-body">${escapeHtml(rememberText)}</div>
        </div>
      `;

      // Save to localStorage History
      EduGenieStorage.saveActivity({
        type: "explain",
        title: topic,
        subtitle: subject ? `${subject} • ${difficulty}` : `Concept Explanation • ${difficulty}`,
        contentSnippet: defText,
        meta: {
          keyPointsCount: kpList.length
        }
      });

      resultWrapper.style.display = "block";
      resultWrapper.scrollIntoView({ behavior: "smooth", block: "nearest" });

    } catch (err) {
      if (errorMessage) errorMessage.textContent = err.message || "Failed to generate explanation. Please try again.";
      if (errorBanner) errorBanner.style.display = "flex";
    } finally {
      if (loading) loading.style.display = "none";
      if (submitBtn) submitBtn.disabled = false;
    }
  }
}

// =========================================================================
// 7. Page 4: Interactive Quiz Controller (`/quiz`)
// =========================================================================
function initQuizPage() {
  const page = document.getElementById("quizPage");
  if (!page) return;

  const quizSetupSection = document.getElementById("quizSetupSection");
  const quizPlayerContainer = document.getElementById("quizPlayerContainer");
  const quizSummaryContainer = document.getElementById("quizSummaryContainer");
  const emptyState = document.getElementById("quizEmptyState");

  const quizText = document.getElementById("quizText");
  const quizSubject = document.getElementById("quizSubject");
  const quizDifficulty = document.getElementById("quizDifficulty");
  const quizCount = document.getElementById("quizCount");
  const submitBtn = document.getElementById("quizSubmitBtn");
  const clearBtn = document.getElementById("quizClearBtn");
  const charCount = document.getElementById("quizCharCount");

  const loading = document.getElementById("quizLoading");
  const errorBanner = document.getElementById("quizError");
  const errorMessage = document.getElementById("quizErrorMessage");
  const errorCloseBtn = document.getElementById("quizErrorCloseBtn");

  // Player Elements
  const questionCounter = document.getElementById("quizQuestionCounter");
  const progressPercent = document.getElementById("quizProgressPercent");
  const progressFill = document.getElementById("quizProgressFill");
  const questionText = document.getElementById("quizQuestionText");
  const optionsContainer = document.getElementById("quizOptionsContainer");
  const prevBtn = document.getElementById("quizPrevBtn");
  const nextBtn = document.getElementById("quizNextBtn");
  const submitAnswersBtn = document.getElementById("quizSubmitAnswersBtn");

  let quizQuestions = [];
  let currentQIndex = 0;
  let userSelections = []; // array of selected option string for each question
  let currentQuizTopic = "";

  quizText?.addEventListener("input", () => {
    if (charCount) charCount.textContent = quizText.value.length;
  });

  clearBtn?.addEventListener("click", () => {
    quizText.value = "";
    if (charCount) charCount.textContent = "0";
    quizText.focus();
  });

  errorCloseBtn?.addEventListener("click", () => {
    if (errorBanner) errorBanner.style.display = "none";
  });

  submitBtn?.addEventListener("click", handleGenerateQuiz);

  async function handleGenerateQuiz() {
    const text = quizText.value.trim();
    if (!text) {
      showToast("Please enter a topic or educational passage.");
      quizText.focus();
      return;
    }

    currentQuizTopic = text.length > 50 ? text.substring(0, 48) + "..." : text;
    const subject = quizSubject?.value?.trim() || "";
    const difficulty = quizDifficulty?.value || "Any";
    const numQuestions = parseInt(quizCount?.value || "3", 10);

    if (loading) loading.style.display = "flex";
    if (errorBanner) errorBanner.style.display = "none";
    if (emptyState) emptyState.style.display = "none";
    if (quizPlayerContainer) quizPlayerContainer.style.display = "none";
    if (quizSummaryContainer) quizSummaryContainer.style.display = "none";
    if (submitBtn) submitBtn.disabled = true;

    try {
      const res = await fetch("/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text,
          subject: subject || null,
          difficulty: difficulty !== "Any" ? difficulty : null,
          num_questions: numQuestions
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.detail || "Unable to generate quiz.");
      }

      if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error("No quiz questions were returned. Please try rephrasing the topic.");
      }

      quizQuestions = data.questions;
      currentQIndex = 0;
      userSelections = new Array(quizQuestions.length).fill(null);

      // Transition to player
      if (quizSetupSection) quizSetupSection.style.display = "none";
      if (quizPlayerContainer) quizPlayerContainer.style.display = "block";
      renderPlayerQuestion();

    } catch (err) {
      if (errorMessage) errorMessage.textContent = err.message || "Failed to generate quiz. Please try again.";
      if (errorBanner) errorBanner.style.display = "flex";
      if (emptyState) emptyState.style.display = "block";
    } finally {
      if (loading) loading.style.display = "none";
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  function renderPlayerQuestion() {
    const q = quizQuestions[currentQIndex];
    const total = quizQuestions.length;
    const pct = Math.round(((currentQIndex + 1) / total) * 100);

    if (questionCounter) questionCounter.textContent = `Question ${currentQIndex + 1} of ${total}`;
    if (progressPercent) progressPercent.textContent = `${pct}% Completed`;
    if (progressFill) progressFill.style.width = `${pct}%`;
    if (questionText) questionText.textContent = `${currentQIndex + 1}. ${q.question}`;

    const letters = ["A", "B", "C", "D"];
    optionsContainer.innerHTML = "";

    q.options.forEach((opt, idx) => {
      const isSelected = userSelections[currentQIndex] === opt;
      const card = document.createElement("div");
      card.className = `quiz-option-card ${isSelected ? 'selected' : ''}`;
      card.innerHTML = `
        <div class="opt-letter">${letters[idx] || (idx + 1)}</div>
        <div class="opt-text">${escapeHtml(opt)}</div>
      `;
      card.addEventListener("click", () => {
        userSelections[currentQIndex] = opt;
        renderPlayerQuestion();
      });
      optionsContainer.appendChild(card);
    });

    // Handle navigation buttons
    if (prevBtn) {
      prevBtn.disabled = currentQIndex === 0;
    }
    if (nextBtn) {
      nextBtn.style.display = currentQIndex < total - 1 ? "inline-flex" : "none";
    }
    if (submitAnswersBtn) {
      submitAnswersBtn.style.display = currentQIndex === total - 1 ? "inline-flex" : "none";
    }
  }

  prevBtn?.addEventListener("click", () => {
    if (currentQIndex > 0) {
      currentQIndex--;
      renderPlayerQuestion();
    }
  });

  nextBtn?.addEventListener("click", () => {
    if (currentQIndex < quizQuestions.length - 1) {
      currentQIndex++;
      renderPlayerQuestion();
    }
  });

  submitAnswersBtn?.addEventListener("click", () => {
    // Check if any question was left unanswered
    const unansweredCount = userSelections.filter(ans => !ans).length;
    if (unansweredCount > 0) {
      if (!confirm(`You have ${unansweredCount} unanswered question(s). Are you sure you want to submit?`)) {
        return;
      }
    }
    renderQuizResults();
  });

  function renderQuizResults() {
    let score = 0;
    const total = quizQuestions.length;

    quizQuestions.forEach((q, idx) => {
      if (userSelections[idx] === q.correct_answer) {
        score++;
      }
    });

    const pct = Math.round((score / total) * 100);
    let message = "Excellent work! You showed a solid command of this material.";
    let icon = "🎉";
    if (pct < 50) {
      message = "Good try! Review the answer explanations below to solidify the concepts.";
      icon = "📚";
    } else if (pct < 80) {
      message = "Great effort! A quick review will make you an expert on this topic.";
      icon = "👏";
    }

    // Save result to localStorage
    EduGenieStorage.saveActivity({
      type: "quiz",
      title: currentQuizTopic,
      subtitle: `Score: ${score}/${total} (${pct}%)`,
      contentSnippet: `Scored ${score} out of ${total} on quiz: ${currentQuizTopic}`,
      meta: {
        score: score,
        total: total,
        pct: pct
      }
    });

    // Build question breakdown reviews
    const reviewCardsHtml = quizQuestions.map((q, idx) => {
      const userChoice = userSelections[idx] || "No answer chosen";
      const isCorrect = userChoice === q.correct_answer;
      return `
        <div class="review-item-card ${isCorrect ? 'is-correct' : 'is-incorrect'}">
          <div class="review-header-line">
            <span style="font-weight: 700; color: var(--text-primary);">Question ${idx + 1}</span>
            <span class="review-badge ${isCorrect ? 'correct' : 'incorrect'}">
              ${isCorrect ? '✓ Correct (+1)' : '✗ Incorrect (0)'}
            </span>
          </div>
          <p style="font-weight: 600; margin-bottom: 0.5rem; color: var(--text-primary);">${escapeHtml(q.question)}</p>
          <div style="font-size: 0.92rem; margin-bottom: 0.35rem;">
            <strong>Your answer:</strong> <span style="color: ${isCorrect ? 'var(--accent-emerald)' : 'var(--accent-rose)'};">${escapeHtml(userChoice)}</span>
          </div>
          ${!isCorrect ? `
            <div style="font-size: 0.92rem; margin-bottom: 0.35rem; color: #065F46;">
              <strong>Correct answer:</strong> ${escapeHtml(q.correct_answer)}
            </div>
          ` : ""}
          <div style="font-size: 0.88rem; color: var(--text-secondary); background: var(--bg-surface); padding: 0.65rem 0.85rem; border-radius: 6px; margin-top: 0.5rem; border: 1px solid var(--border-light);">
            💡 <strong>Explanation:</strong> ${escapeHtml(q.explanation)}
          </div>
        </div>
      `;
    }).join("");

    quizSummaryContainer.innerHTML = `
      <div class="quiz-summary-card">
        <div class="score-circle-badge">
          <span class="score-main">${score}/${total}</span>
          <span class="score-pct">${pct}%</span>
        </div>
        <h2 style="font-size: 1.6rem; font-weight: 800; margin-bottom: 0.35rem;">Quiz Completed! ${icon}</h2>
        <p style="color: var(--text-secondary); max-width: 480px; margin: 0 auto 1.75rem;">${message}</p>

        <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; margin-bottom: 2rem;">
          <button class="btn btn-primary" id="retakeQuizBtn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            <span>Retake This Quiz</span>
          </button>
          <button class="btn btn-secondary" id="newQuizBtn">
            <span>Generate New Quiz</span>
          </button>
        </div>

        <div class="quiz-review-section">
          <h3 style="font-size: 1.15rem; font-weight: 800; margin-bottom: 0.5rem;">Detailed Question Review</h3>
          ${reviewCardsHtml}
        </div>
      </div>
    `;

    quizPlayerContainer.style.display = "none";
    quizSummaryContainer.style.display = "block";
    quizSummaryContainer.scrollIntoView({ behavior: "smooth", block: "start" });

    // Hook retake & new buttons
    document.getElementById("retakeQuizBtn")?.addEventListener("click", () => {
      userSelections = new Array(quizQuestions.length).fill(null);
      currentQIndex = 0;
      quizSummaryContainer.style.display = "none";
      quizPlayerContainer.style.display = "block";
      renderPlayerQuestion();
    });

    document.getElementById("newQuizBtn")?.addEventListener("click", () => {
      quizSummaryContainer.style.display = "none";
      quizPlayerContainer.style.display = "none";
      quizSetupSection.style.display = "block";
      quizText.value = "";
      quizText.focus();
    });
  }
}

// =========================================================================
// 8. Page 5: Educational Summarizer Controller (`/summarize`)
// =========================================================================
function initSummarizePage() {
  const page = document.getElementById("summarizePage");
  if (!page) return;

  const summaryText = document.getElementById("summaryText");
  const inputCount = document.getElementById("summaryInputCount");
  const submitBtn = document.getElementById("summarySubmitBtn");
  const clearBtn = document.getElementById("summaryClearBtn");
  const copyBtn = document.getElementById("summaryCopyBtn");
  const loading = document.getElementById("summaryLoading");
  const errorBanner = document.getElementById("summaryError");
  const errorMessage = document.getElementById("summaryErrorMessage");
  const resultContent = document.getElementById("summaryResultContent");
  const emptyState = document.getElementById("summaryEmptyState");
  const reductionBadge = document.getElementById("summaryReductionBadge");
  const outputCount = document.getElementById("summaryOutputCount");

  let currentRawSummary = "";

  summaryText?.addEventListener("input", () => {
    if (inputCount) inputCount.textContent = `${summaryText.value.length} characters`;
  });

  clearBtn?.addEventListener("click", () => {
    summaryText.value = "";
    if (inputCount) inputCount.textContent = "0 characters";
    summaryText.focus();
  });

  copyBtn?.addEventListener("click", () => {
    if (currentRawSummary) {
      navigator.clipboard.writeText(currentRawSummary).then(() => {
        showToast("Summary copied to clipboard!");
      });
    }
  });

  submitBtn?.addEventListener("click", handleSummarize);

  async function handleSummarize() {
    const text = summaryText.value.trim();
    if (!text) {
      showToast("Please paste or type content to summarize.");
      summaryText.focus();
      return;
    }

    if (loading) loading.style.display = "flex";
    if (errorBanner) errorBanner.style.display = "none";
    if (emptyState) emptyState.style.display = "none";
    if (resultContent) resultContent.style.display = "none";
    if (reductionBadge) reductionBadge.style.display = "none";
    if (outputCount) outputCount.style.display = "none";
    if (copyBtn) copyBtn.style.display = "none";
    if (submitBtn) submitBtn.disabled = true;

    try {
      const res = await fetch("/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.detail || "Unable to summarize content.");
      }

      currentRawSummary = data.summary || "";
      const origChars = data.original_characters || text.length;
      const sumChars = data.summary_characters || currentRawSummary.length;
      const reduction = data.reduction_percentage || Math.max(0, Math.round((1 - sumChars / origChars) * 100));

      resultContent.innerHTML = formatMarkdownText(currentRawSummary);
      resultContent.style.display = "block";

      if (reductionBadge) {
        reductionBadge.textContent = `📉 ${reduction}% shorter`;
        reductionBadge.style.display = "inline-block";
      }
      if (outputCount) {
        outputCount.textContent = `${sumChars} characters`;
        outputCount.style.display = "inline-block";
      }
      if (copyBtn) {
        copyBtn.style.display = "inline-block";
      }

      // Save activity to localStorage
      EduGenieStorage.saveActivity({
        type: "summarize",
        title: text.length > 50 ? text.substring(0, 48) + "..." : text,
        subtitle: `Revision Summary • ${reduction}% reduction`,
        contentSnippet: currentRawSummary.substring(0, 150) + "...",
        meta: {
          originalChars: origChars,
          summaryChars: sumChars,
          reduction: reduction
        }
      });

    } catch (err) {
      if (errorMessage) errorMessage.textContent = err.message || "Failed to generate summary. Please try again.";
      if (errorBanner) errorBanner.style.display = "flex";
      if (emptyState) emptyState.style.display = "flex";
    } finally {
      if (loading) loading.style.display = "none";
      if (submitBtn) submitBtn.disabled = false;
    }
  }
}

// =========================================================================
// 9. Page 6: Learning Path Controller (`/learning-path`)
// =========================================================================
function initLearningPathPage() {
  const page = document.getElementById("learningPathPage");
  if (!page) return;

  const topicInput = document.getElementById("lpTopic");
  const levelSelect = document.getElementById("lpLevel");
  const goalInput = document.getElementById("lpGoal");
  const submitBtn = document.getElementById("lpSubmitBtn");
  const loading = document.getElementById("lpLoading");
  const errorBanner = document.getElementById("lpError");
  const errorMessage = document.getElementById("lpErrorMessage");
  const errorCloseBtn = document.getElementById("lpErrorCloseBtn");
  const resultWrapper = document.getElementById("lpResultWrapper");
  const roadmapContent = document.getElementById("lpRoadmapContent");
  const emptyState = document.getElementById("lpEmptyState");
  const copyBtn = document.getElementById("lpCopyBtn");

  let currentRawRoadmap = "";

  errorCloseBtn?.addEventListener("click", () => {
    if (errorBanner) errorBanner.style.display = "none";
  });

  submitBtn?.addEventListener("click", handleBuildRoadmap);

  copyBtn?.addEventListener("click", () => {
    if (currentRawRoadmap) {
      navigator.clipboard.writeText(currentRawRoadmap).then(() => {
        showToast("Roadmap outline copied to clipboard!");
      });
    }
  });

  async function handleBuildRoadmap() {
    const topic = topicInput.value.trim();
    if (!topic) {
      showToast("Please enter a topic or skill to learn.");
      topicInput.focus();
      return;
    }

    const level = levelSelect?.value || "Beginner";
    const goal = goalInput?.value?.trim() || "";

    if (loading) loading.style.display = "flex";
    if (errorBanner) errorBanner.style.display = "none";
    if (emptyState) emptyState.style.display = "none";
    if (resultWrapper) resultWrapper.style.display = "none";
    if (submitBtn) submitBtn.disabled = true;

    try {
      const res = await fetch("/learn/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic,
          level: level,
          goal: goal || null
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.detail || "Unable to build roadmap.");
      }

      currentRawRoadmap = JSON.stringify(data, null, 2);
      const stages = data.stages || [];
      const topicName = data.topic || topic;
      const timeline = data.recommended_timeline || "6-10 Weeks";
      const overview = data.overview || "";
      const nextSteps = data.next_steps || [];

      let stagesHtml = "";
      stages.forEach((stg, idx) => {
        const concepts = stg.concepts || [];
        const tasks = stg.practice_tasks || [];
        const resObj = stg.resources || {};

        stagesHtml += `
          <div class="roadmap-step">
            <div class="step-marker">${idx + 1}</div>
            <div class="stage-card">
              <div class="stage-header">
                <h4 class="stage-name">${escapeHtml(stg.stage_name || `Stage ${idx + 1}`)}</h4>
                <span class="stage-time">⏱️ ${escapeHtml(stg.estimated_time || "2 Weeks")}</span>
              </div>

              <!-- Core Concepts -->
              <div class="concepts-group">
                <div class="section-label-sm">Core Skills & Concepts</div>
                <div class="pill-list">
                  ${concepts.map(c => `<span class="concept-pill">${escapeHtml(c)}</span>`).join("")}
                </div>
              </div>

              <!-- Hands-on Tasks -->
              ${tasks.length > 0 ? `
                <div class="practice-group">
                  <div class="section-label-sm">Hands-on Practice & Mini-Projects</div>
                  <ul class="task-list">
                    ${tasks.map(t => `<li>${escapeHtml(t)}</li>`).join("")}
                  </ul>
                </div>
              ` : ""}

              <!-- Curated Resources -->
              <div class="resources-group">
                <div class="section-label-sm">Recommended Study Material</div>
                ${resObj.books && resObj.books.length ? `
                  <div class="resource-category">
                    <span class="res-tag">📚 Books:</span>
                    <span>${escapeHtml(resObj.books.join(", "))}</span>
                  </div>
                ` : ""}
                ${resObj.documentation && resObj.documentation.length ? `
                  <div class="resource-category">
                    <span class="res-tag">📖 Docs:</span>
                    <span>${escapeHtml(resObj.documentation.join(", "))}</span>
                  </div>
                ` : ""}
                ${resObj.video_topics && resObj.video_topics.length ? `
                  <div class="resource-category">
                    <span class="res-tag">📺 Videos:</span>
                    <span>${escapeHtml(resObj.video_topics.join(", "))}</span>
                  </div>
                ` : ""}
                ${resObj.articles && resObj.articles.length ? `
                  <div class="resource-category">
                    <span class="res-tag">📝 Articles:</span>
                    <span>${escapeHtml(resObj.articles.join(", "))}</span>
                  </div>
                ` : ""}
              </div>
            </div>
          </div>
        `;
      });

      let nextStepsHtml = "";
      if (nextSteps.length > 0) {
        nextStepsHtml = `
          <div class="next-steps-card">
            <h4 class="next-steps-title">🚀 Actionable Next Steps (Start Today)</h4>
            <ul class="bullet-checklist">
              ${nextSteps.map(ns => `<li>${escapeHtml(ns)}</li>`).join("")}
            </ul>
          </div>
        `;
      }

      roadmapContent.innerHTML = `
        <div class="roadmap-header-card">
          <div class="roadmap-title-row">
            <h3 class="roadmap-topic-title">${escapeHtml(topicName)}</h3>
            <span class="timeline-badge">⏱️ Timeline: ${escapeHtml(timeline)}</span>
          </div>
          <p class="roadmap-overview-text">${escapeHtml(overview)}</p>
        </div>

        <div class="roadmap-timeline" style="margin-top: 2rem;">
          ${stagesHtml}
        </div>

        ${nextStepsHtml}
      `;

      // Save to localStorage History
      EduGenieStorage.saveActivity({
        type: "learn",
        title: topicName,
        subtitle: `Roadmap • ${level} • ${timeline}`,
        contentSnippet: overview,
        meta: {
          stagesCount: stages.length,
          timeline: timeline
        }
      });

      resultWrapper.style.display = "block";
      resultWrapper.scrollIntoView({ behavior: "smooth", block: "nearest" });

    } catch (err) {
      if (errorMessage) errorMessage.textContent = err.message || "Failed to generate roadmap. Please try again.";
      if (errorBanner) errorBanner.style.display = "flex";
    } finally {
      if (loading) loading.style.display = "none";
      if (submitBtn) submitBtn.disabled = false;
    }
  }
}

// =========================================================================
// 10. Page 7: Learning History Controller (`/history`)
// =========================================================================
function initHistoryPage() {
  const page = document.getElementById("historyPage");
  if (!page) return;

  const itemsContainer = document.getElementById("historyItemsList");
  const emptyState = document.getElementById("historyEmptyState");
  const tabs = document.querySelectorAll(".history-tab");
  const clearTriggerBtn = document.getElementById("clearHistoryTriggerBtn");
  const clearModal = document.getElementById("clearHistoryModal");
  const cancelBtn = document.getElementById("cancelClearHistoryBtn");
  const cancelXBtn = document.getElementById("cancelClearHistoryXBtn");
  const confirmBtn = document.getElementById("confirmClearHistoryBtn");

  let activeCategory = "all";

  // Category Tabs click
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      activeCategory = tab.dataset.category;
      renderHistoryItems();
    });
  });

  // Modal Triggers
  clearTriggerBtn?.addEventListener("click", () => {
    if (clearModal) clearModal.style.display = "flex";
  });
  cancelBtn?.addEventListener("click", () => {
    if (clearModal) clearModal.style.display = "none";
  });
  cancelXBtn?.addEventListener("click", () => {
    if (clearModal) clearModal.style.display = "none";
  });
  confirmBtn?.addEventListener("click", () => {
    EduGenieStorage.clearAllActivities();
    if (clearModal) clearModal.style.display = "none";
    showToast("History cleared successfully!");
    renderHistoryItems();
  });

  function renderHistoryItems() {
    const stats = EduGenieStorage.calculateStats();
    
    // Update badge counts on tabs
    document.getElementById("countAll").textContent = stats.countsByType.all;
    document.getElementById("countQa").textContent = stats.countsByType.qa;
    document.getElementById("countExplain").textContent = stats.countsByType.explain;
    document.getElementById("countQuiz").textContent = stats.countsByType.quiz;
    document.getElementById("countSummarize").textContent = stats.countsByType.summarize;
    document.getElementById("countLearn").textContent = stats.countsByType.learn;

    const items = EduGenieStorage.getActivitiesByType(activeCategory);

    if (!items || items.length === 0) {
      if (itemsContainer) itemsContainer.innerHTML = "";
      if (emptyState) emptyState.style.display = "block";
      if (clearTriggerBtn) clearTriggerBtn.style.display = "none";
      return;
    }

    if (emptyState) emptyState.style.display = "none";
    if (clearTriggerBtn) clearTriggerBtn.style.display = "inline-flex";

    const badgeMap = {
      qa: { label: "Q&A", class: "icon-blue" },
      explain: { label: "Explain", class: "icon-amber" },
      quiz: { label: "Quiz", class: "icon-purple" },
      summarize: { label: "Summary", class: "icon-emerald" },
      learn: { label: "Roadmap", class: "icon-cyan" }
    };

    itemsContainer.innerHTML = items.map(item => {
      const bInfo = badgeMap[item.type] || { label: "Study", class: "icon-blue" };
      return `
        <div class="history-item-card">
          <div class="history-item-top">
            <div class="history-badge-group">
              <span class="history-type-badge ${bInfo.class}">${bInfo.label}</span>
              <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted);">${escapeHtml(item.subtitle || '')}</span>
            </div>
            <span class="history-time">${escapeHtml(item.dateFormatted || '')} • ${escapeHtml(item.timeFormatted || '')}</span>
          </div>

          <h3 class="history-title">${escapeHtml(item.title)}</h3>

          ${item.contentSnippet ? `
            <div class="history-snippet">${escapeHtml(item.contentSnippet)}</div>
          ` : ""}

          <div class="history-card-footer">
            <span style="font-size: 0.82rem; color: var(--text-light);">Stored locally</span>
            <button type="button" class="btn btn-sm btn-ghost copy-history-btn" data-text="${escapeHtml(item.title)}">
              <span>Copy Title</span>
            </button>
          </div>
        </div>
      `;
    }).join("");

    // Hook copy buttons on history items
    itemsContainer.querySelectorAll(".copy-history-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        navigator.clipboard.writeText(btn.dataset.text).then(() => {
          showToast("Copied to clipboard!");
        });
      });
    });
  }

  renderHistoryItems();
}

// =========================================================================
// 11. Page 8: Student Progress Controller (`/progress`)
// =========================================================================
function initProgressPage() {
  const page = document.getElementById("progressPage");
  if (!page) return;

  const stats = EduGenieStorage.calculateStats();
  const allActivities = EduGenieStorage.getAllActivities();

  // Metrics
  document.getElementById("progQuestions").textContent = stats.questionsAsked;
  document.getElementById("progQuizzes").textContent = stats.quizzesCompleted;
  document.getElementById("progAvgScore").textContent = `${stats.averageQuizScore}%`;
  document.getElementById("progTopics").textContent = stats.topicsExplored;
  document.getElementById("progStreak").textContent = `${stats.learningStreak} ${stats.learningStreak === 1 ? 'Day' : 'Days'}`;
  document.getElementById("progTotalActivity").textContent = stats.totalSessions;

  // Quiz Performance Box
  const perfBadge = document.getElementById("quizPerformanceBadge");
  const accPct = document.getElementById("accuracyPercentageText");
  const accBar = document.getElementById("accuracyBarFill");
  const accCaption = document.getElementById("accuracyCaption");
  const quizPreviewList = document.getElementById("quizHistoryPreviewList");

  if (stats.quizzesCompleted > 0) {
    if (perfBadge) perfBadge.textContent = `${stats.quizzesCompleted} Completed`;
    if (accPct) accPct.textContent = `${stats.averageQuizScore}%`;
    if (accBar) accBar.style.width = `${stats.averageQuizScore}%`;
    if (accCaption) accCaption.textContent = `Average accuracy across ${stats.quizzesCompleted} completed quiz session(s).`;

    // Render recent quiz pills
    const recentQuizzes = EduGenieStorage.getActivitiesByType("quiz").slice(0, 6);
    if (quizPreviewList) {
      quizPreviewList.innerHTML = recentQuizzes.map(qz => {
        const pct = qz.meta?.pct ?? 0;
        const isGood = pct >= 70;
        return `
          <div class="quiz-pill-result ${isGood ? 'good' : 'needs-review'}" title="${escapeHtml(qz.title)}">
            ${escapeHtml(qz.title.length > 20 ? qz.title.substring(0, 18) + '...' : qz.title)}: <strong>${pct}%</strong>
          </div>
        `;
      }).join("");
    }
  }

  // Topics Tag Cloud
  const tagCloud = document.getElementById("topicsTagCloud");
  const topicCountBadge = document.getElementById("topicCountBadge");
  const topicsEmptyState = document.getElementById("topicsEmptyState");

  if (topicCountBadge) topicCountBadge.textContent = `${stats.topicsExplored} Topics`;

  if (stats.topicsList && stats.topicsList.length > 0) {
    if (topicsEmptyState) topicsEmptyState.style.display = "none";
    if (tagCloud) {
      tagCloud.innerHTML = stats.topicsList.slice(0, 15).map(topic => `
        <span class="topic-tag">${escapeHtml(topic)}</span>
      `).join("");
    }
  } else {
    if (topicsEmptyState) topicsEmptyState.style.display = "block";
  }

  // Recent Study Activity Timeline
  const timeline = document.getElementById("recentActivityTimeline");
  const emptyState = document.getElementById("progressEmptyState");

  if (allActivities.length === 0) {
    if (timeline) timeline.style.display = "none";
    if (emptyState) emptyState.style.display = "block";
  } else {
    if (emptyState) emptyState.style.display = "none";
    if (timeline) {
      timeline.style.display = "flex";
      const iconMap = {
        qa: "💬",
        explain: "💡",
        quiz: "📝",
        summarize: "📄",
        learn: "🗺️"
      };

      timeline.innerHTML = allActivities.slice(0, 8).map(act => `
        <div class="timeline-item">
          <div class="timeline-left">
            <span class="timeline-icon">${iconMap[act.type] || '⚡'}</span>
            <div>
              <div class="timeline-title">${escapeHtml(act.title)}</div>
              <div style="font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(act.subtitle || '')}</div>
            </div>
          </div>
          <div class="timeline-time">${escapeHtml(act.dateFormatted)}</div>
        </div>
      `).join("");
    }
  }
}
