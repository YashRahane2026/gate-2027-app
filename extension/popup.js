// popup.js — GATE 2027 Chrome Extension Popup Logic

const WHITELISTED_ADMIN = "yash.dr2004@gmail.com";

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

  const dEl = document.getElementById("days");
  const hEl = document.getElementById("hours");
  const mEl = document.getElementById("mins");
  const sEl = document.getElementById("secs");

  if (dEl) dEl.textContent = String(days);
  if (hEl) hEl.textContent = pad(hours);
  if (mEl) mEl.textContent = pad(mins);
  if (sEl) sEl.textContent = pad(secs);
}

updateCountdown();
setInterval(updateCountdown, 1000);

// ──────────────────────────────────────────────
// HTML Escaper
// ──────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ──────────────────────────────────────────────
// Account & Blocker Status Display
// ──────────────────────────────────────────────
function updateAccountUI(email) {
  const emailDisplay = document.getElementById("user-email-display");
  const accessBadge = document.getElementById("access-badge");
  const blockStatus = document.getElementById("block-status");
  const blockSubtext = document.getElementById("block-subtext");
  const emailInput = document.getElementById("custom-email-input");

  const cleanEmail = (email || "").toLowerCase().trim();
  const isWhitelisted = cleanEmail === WHITELISTED_ADMIN;

  if (emailInput && !emailInput.value) {
    emailInput.value = cleanEmail;
  }

  if (emailDisplay) {
    emailDisplay.textContent = cleanEmail ? cleanEmail : "Guest / Not Logged In";
    emailDisplay.title = cleanEmail || "Not logged in";
  }

  if (isWhitelisted) {
    if (accessBadge) {
      accessBadge.className = "access-badge whitelisted";
      accessBadge.textContent = "VIP Whitelist ✅";
    }
    if (blockStatus) {
      blockStatus.className = "block-status unblocked";
      blockStatus.textContent = "🟢 YouTube Whitelisted";
    }
    if (blockSubtext) {
      blockSubtext.textContent = "Admin exception active for yash.dr2004@gmail.com — YouTube unrestricted.";
    }
  } else {
    if (accessBadge) {
      accessBadge.className = "access-badge locked";
      accessBadge.textContent = "Focus Locked 🔒";
    }
    if (blockStatus) {
      blockStatus.className = "block-status blocked";
      blockStatus.textContent = "🔴 YouTube Blocked (IISc OP)";
    }
    if (blockSubtext) {
      blockSubtext.textContent = "Restricted to GO Classes lectures only. Finish target ToDo to unlock.";
    }
  }
}

// ──────────────────────────────────────────────
// Load Account & Sync
// ──────────────────────────────────────────────
async function loadStoredState() {
  chrome.storage.local.get(["userEmail", "isWhitelisted", "incompleteTasksCount"], (data) => {
    updateAccountUI(data.userEmail || "");
  });
}

async function syncFromWebApp() {
  const emailDisplay = document.getElementById("user-email-display");
  if (emailDisplay) emailDisplay.textContent = "Syncing...";

  const targets = [CONFIG.VERCEL_URL, CONFIG.LOCAL_URL];
  let foundSession = false;

  for (const url of targets) {
    try {
      const res = await fetch(`${url}/api/auth/session`, { credentials: "include" });
      if (res.ok) {
        const session = await res.json();
        if (session?.user?.email) {
          const email = session.user.email.toLowerCase().trim();
          const isWhitelisted = email === WHITELISTED_ADMIN;

          chrome.storage.local.set({
            userEmail: email,
            userName: session.user.name || "",
            isWhitelisted,
            gate_app_url: url,
            lastSyncAt: Date.now()
          });

          updateAccountUI(email);
          foundSession = true;
          break;
        }
      }
    } catch {
      // try next
    }
  }

  if (!foundSession) {
    loadStoredState();
  }

  loadFocusTime();
  loadTodos();
}

// ──────────────────────────────────────────────
// Fetch Today's Focus Time
// ──────────────────────────────────────────────
async function loadFocusTime() {
  const el = document.getElementById("focus-time");
  if (!el) return;

  const targets = [CONFIG.VERCEL_URL, CONFIG.LOCAL_URL];
  for (const url of targets) {
    try {
      const res = await fetch(`${url}/api/sessions/today`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const totalMins = data.totalMinutes || 0;
        const h = Math.floor(totalMins / 60);
        const m = totalMins % 60;
        el.textContent = h > 0 ? `${h}h ${m}m` : `${m}m`;
        return;
      }
    } catch {
      // try next
    }
  }

  el.textContent = "0h 0m";
}

// ──────────────────────────────────────────────
// Fetch Today's Todos
// ──────────────────────────────────────────────
async function loadTodos() {
  const container = document.getElementById("todos-list");
  if (!container) return;

  const targets = [CONFIG.VERCEL_URL, CONFIG.LOCAL_URL];
  for (const url of targets) {
    try {
      const res = await fetch(`${url}/api/todos`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const todos = data.todos || [];

        const incompleteCount = todos.filter((t) => !t.isCompleted).length;
        chrome.storage.local.set({ incompleteTasksCount: incompleteCount });

        if (todos.length === 0) {
          container.innerHTML = '<div class="loading">No todos added for today</div>';
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
        return;
      }
    } catch {
      // try next
    }
  }

  container.innerHTML = '<div class="loading">Open dashboard to sync todos</div>';
}

// ──────────────────────────────────────────────
// Event Listeners
// ──────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadStoredState();
  loadFocusTime();
  loadTodos();

  const syncBtn = document.getElementById("sync-web-btn");
  if (syncBtn) {
    syncBtn.addEventListener("click", syncFromWebApp);
  }

  const saveEmailBtn = document.getElementById("save-email-btn");
  const emailInput = document.getElementById("custom-email-input");
  if (saveEmailBtn && emailInput) {
    saveEmailBtn.addEventListener("click", () => {
      const email = emailInput.value.toLowerCase().trim();
      const isWhitelisted = email === WHITELISTED_ADMIN;

      chrome.storage.local.set({
        userEmail: email,
        isWhitelisted,
        lastSyncAt: Date.now()
      });

      updateAccountUI(email);
    });
  }

  const openAppBtn = document.getElementById("open-app");
  if (openAppBtn) {
    openAppBtn.addEventListener("click", () => {
      chrome.storage.local.get(["gate_app_url"], (data) => {
        const url = data.gate_app_url || CONFIG.VERCEL_URL;
        chrome.tabs.create({ url: `${url}/dashboard` });
      });
    });
  }
});
