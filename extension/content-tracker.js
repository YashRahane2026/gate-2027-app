// content-tracker.js — GATE 2027 Prep Tracker Sync Engine
(function() {
  console.log("GATE 2027 Prep Tracker: Task & Session sync active.");

  const WHITELISTED_ADMIN = "yash.dr2004@gmail.com";
  let intervalId = null;

  const isContextValid = () => {
    if (!chrome.runtime || !chrome.runtime.id) {
      if (intervalId) clearInterval(intervalId);
      return false;
    }
    return true;
  };

  const syncState = async () => {
    if (!isContextValid()) return;

    try {
      // 1. Fetch current user session
      let userEmail = "";
      let userName = "";

      try {
        const sessionRes = await fetch("/api/auth/session");
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          if (sessionData?.user?.email) {
            userEmail = sessionData.user.email.toLowerCase().trim();
            userName = sessionData.user.name || "";
          }
        }
      } catch (err) {
        // Session endpoint fetch error (ignored)
      }

      // 2. Fetch today's todos
      let incompleteCount = 0;
      let totalCount = 0;

      try {
        const todosRes = await fetch("/api/todos");
        if (todosRes.ok) {
          const todosData = await todosRes.json();
          const todos = todosData.todos || [];
          totalCount = todos.length;
          incompleteCount = todos.filter((t) => !t.isCompleted).length;
        }
      } catch (err) {
        // Todos endpoint fetch error (ignored)
      }

      if (!isContextValid()) return;

      const isWhitelisted = userEmail === WHITELISTED_ADMIN;
      const hasTargetTodo = totalCount > 0 && incompleteCount > 0;

      chrome.storage.local.set({
        userEmail,
        userName,
        isWhitelisted,
        hasTargetTodo,
        incompleteTasksCount: incompleteCount,
        totalTasksCount: totalCount,
        gate_app_url: window.location.origin,
        lastSyncAt: Date.now()
      });

      console.log(`[GATE 2027 Tracker] User: ${userEmail || "Guest"} | Whitelisted: ${isWhitelisted} | Todos: ${incompleteCount}/${totalCount}`);
    } catch (err) {
      if (err.message && err.message.includes("Extension context invalidated")) {
        if (intervalId) clearInterval(intervalId);
        return;
      }
      console.warn("[GATE 2027 Tracker] Sync notice:", err);
    }
  };

  syncState();
  intervalId = setInterval(syncState, 5000);
  window.addEventListener("focus", syncState);
})();
