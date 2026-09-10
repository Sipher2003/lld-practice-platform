const LEARNER_ID = "demo-learner";
const API = "/api";

const state = {
  problems: [],
  currentProblem: null,
  currentAttemptId: null,
};

const el = (id) => document.getElementById(id);

async function api(path, options) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

function showScreen(name) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
  el(`screen-${name}`).classList.remove("hidden");
}

// ---- Screen 1: problem list ----------------------------------------------
async function loadProblems() {
  state.problems = await api("/problems");
  const grid = el("problem-list");
  grid.innerHTML = "";
  state.problems.forEach((p) => {
    const card = document.createElement("div");
    card.className = "problem-card";
    card.innerHTML = `<div class="difficulty">${p.difficulty}</div><h3>${p.title}</h3><p>${p.description}</p>`;
    card.onclick = () => openProblem(p.id);
    grid.appendChild(card);
  });
}

async function openProblem(problemId) {
  const problem = await api(`/problems/${problemId}`);
  state.currentProblem = problem;
  el("practice-title").textContent = problem.title;
  el("practice-description").textContent = problem.description;
  el("practice-requirements").innerHTML = problem.requirements.map((r) => `<li>${r}</li>`).join("");
  el("practice-constraints").innerHTML = problem.constraints.map((c) => `<li>${c}</li>`).join("");
  el("submission-content").value = "";
  el("submit-status").textContent = "";

  const attempt = await api("/attempts", {
    method: "POST",
    body: JSON.stringify({ problemId, learnerId: LEARNER_ID }),
  });
  state.currentAttemptId = attempt.id;

  showScreen("practice");
  el("history-panel").classList.remove("hidden");
  await loadHistory();
}

// ---- Screen 2: submit ------------------------------------------------------
el("submit-btn").addEventListener("click", async () => {
  const content = el("submission-content").value.trim();
  if (!content) {
    el("submit-status").textContent = "Please write something before submitting.";
    return;
  }
  el("submit-btn").disabled = true;
  el("submit-status").textContent = "Submitting...";
  try {
    await api(`/attempts/${state.currentAttemptId}/submit`, {
      method: "POST",
      body: JSON.stringify({ content, format: "TEXT_DESIGN" }),
    });
    el("submit-status").textContent = "Evaluating your design...";
    pollAttempt(state.currentAttemptId);
  } catch (err) {
    el("submit-status").textContent = `Error: ${err.message}`;
    el("submit-btn").disabled = false;
  }
});

async function pollAttempt(attemptId) {
  const attempt = await api(`/attempts/${attemptId}`);
  if (attempt.status === "EVALUATING" || attempt.status === "SUBMITTED") {
    setTimeout(() => pollAttempt(attemptId), 1500);
    return;
  }
  el("submit-btn").disabled = false;
  showFeedback(attempt);
  loadHistory();
}

// ---- Screen 3: feedback -----------------------------------------------------
function scoreClass(score) {
  if (score >= 7) return "score-good";
  if (score >= 4) return "score-mid";
  return "score-low";
}

function showFeedback(attempt) {
  const report = attempt.report;
  const body = el("feedback-body");
  if (!report) {
    body.innerHTML = `<p>No report available yet.</p>`;
    showScreen("feedback");
    return;
  }
  const partialBadge = report.partial
    ? `<span class="badge partial">Partial — AI review unavailable</span>`
    : `<span class="badge">Complete</span>`;

  const rows = report.criteriaScores
    .map(
      (c) => `
      <div class="criterion-row">
        <div>
          <strong>${c.criterion}</strong>
          <div style="color: var(--muted); font-size: 13px;">${c.comment}</div>
        </div>
        <div class="criterion-score ${scoreClass(c.score)}">${c.score}/10</div>
      </div>`
    )
    .join("");

  body.innerHTML = `
    <div>Overall score: <strong>${report.overallScore}/10</strong> ${partialBadge}</div>
    <div style="margin-top:12px;">${rows}</div>
    <div class="narrative-box">${report.narrativeFeedback}</div>
    ${
      report.partial
        ? `<button id="retry-btn" class="retry-btn" style="margin-top:12px;">Retry AI evaluation</button>`
        : ""
    }
  `;
  showScreen("feedback");

  if (report.partial) {
    el("retry-btn").addEventListener("click", async () => {
      el("retry-btn").textContent = "Retrying...";
      el("retry-btn").disabled = true;
      try {
        const updated = await api(`/attempts/${attempt.id}/retry-evaluation`, { method: "POST" });
        showFeedback(updated);
        loadHistory();
      } catch (err) {
        alert(`Retry failed: ${err.message}`);
      }
    });
  }
}

// ---- History -----------------------------------------------------------------
async function loadHistory() {
  if (!state.currentProblem) return;
  const attempts = await api(`/learners/${LEARNER_ID}/attempts?problemId=${state.currentProblem.id}`);
  const list = el("history-list");
  list.innerHTML = "";
  attempts.forEach((a) => {
    const item = document.createElement("div");
    item.className = "history-item";
    const scoreText = a.report ? `${a.report.overallScore}/10` : "—";
    item.innerHTML = `<span>${new Date(a.createdAt).toLocaleString()} — status: ${a.status}</span><span>${scoreText}</span>`;
    if (a.report) {
      item.style.cursor = "pointer";
      item.onclick = () => showFeedback(a);
    }
    list.appendChild(item);
  });
}

// ---- Navigation ----------------------------------------------------------
document.querySelectorAll("[data-action]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const action = btn.getAttribute("data-action");
    if (action === "back-to-problems") {
      el("history-panel").classList.add("hidden");
      showScreen("problems");
    }
    if (action === "back-to-practice") showScreen("practice");
  });
});

loadProblems();
