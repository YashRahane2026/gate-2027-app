// popup.js — GATE 2027 Chrome Extension Logic

// ──────────────────────────────────────────────
// Countdown Timer
// ──────────────────────────────────────────────
function updateCountdown() {
  const now = Date.now();
  const total = Math.max(0, CONFIG.GATE_EXAM_DATE.getTime() - now);

  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const mins = Math.floor((total / (1000 * 60)) % 60);
  const secs = Math.floor((total / 1000) % 60);

  const pad = (n) => String(n).padStart(2, "0");

  document.getElementById("days").textContent = String(days);
  document.getElementById("hours").textContent = pad(hours);
  document.getElementById("mins").textContent = pad(mins);
  document.getElementById("secs").textContent = pad(secs);
}

updateCountdown();
setInterval(updateCountdown, 1000);

// ──────────────────────────────────────────────
// Auth Token Storage
// ──────────────────────────────────────────────
function getToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["gate_auth_token"], (result) => {
      resolve(result.gate_auth_token || null);
    });
  });
}

// ──────────────────────────────────────────────
// Fetch Today's Focus Time
// ──────────────────────────────────────────────
async function loadFocusTime() {
  const el = document.getElementById("focus-time");
  try {
    // Use cookies-based auth (same session as web app)
    const res = await fetch(`${CONFIG.VERCEL_URL}/api/sessions/today`, {
      credentials: "include",
    });

    if (res.ok) {
      const data = await res.json();
      const totalMins = data.totalMinutes || 0;
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      el.textContent = h > 0 ? `${h}h ${m}m` : `${m}m`;
    } else if (res.status === 401) {
      el.textContent = "Sign in first";
      el.style.fontSize = "14px";
      el.style.color = "#6b7280";
    } else {
      el.textContent = "—";
    }
  } catch {
    el.textContent = "Offline";
    el.style.color = "#6b7280";
    el.style.fontSize = "14px";
  }
}

// ──────────────────────────────────────────────
// Fetch Today's Todos
// ──────────────────────────────────────────────
async function loadTodos() {
  const container = document.getElementById("todos-list");
  try {
    const res = await fetch(`${CONFIG.VERCEL_URL}/api/todos`, {
      credentials: "include",
    });

    if (res.ok) {
      const data = await res.json();
      const todos = data.todos || [];

      if (todos.length === 0) {
        container.innerHTML = '<div class="loading">No todos for today</div>';
        return;
      }

      container.innerHTML = todos
        .map(
          (t) => `
          <div class="todo-item">
            <div class="todo-dot ${t.isCompleted ? "done" : "pending"}"></div>
            <span class="todo-text ${t.isCompleted ? "done" : ""}">${escapeHtml(t.text)}${t.targetDetail ? ` — ${escapeHtml(t.targetDetail)}` : ""}</span>
          </div>
        `
        )
        .join("");
    } else if (res.status === 401) {
      container.innerHTML = '<div class="loading">Sign in to the web app first</div>';
    } else {
      container.innerHTML = '<div class="loading">Could not load todos</div>';
    }
  } catch {
    container.innerHTML = '<div class="loading">Offline — check connection</div>';
  }
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}

// ──────────────────────────────────────────────
// Open App Button
// ──────────────────────────────────────────────
document.getElementById("open-app").addEventListener("click", () => {
  chrome.tabs.create({ url: `${CONFIG.VERCEL_URL}/dashboard` });
});

// ──────────────────────────────────────────────
// Initialize
// ──────────────────────────────────────────────
loadFocusTime();
loadTodos();
