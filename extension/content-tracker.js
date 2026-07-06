(function() {
  console.log("GATE 2027 Prep Tracker: Task tracker active on this host.");

  let intervalId = null;

  const isContextValid = () => {
    if (!chrome.runtime || !chrome.runtime.id) {
      if (intervalId) clearInterval(intervalId);
      return false;
    }
    return true;
  };

  const checkTasks = async () => {
    if (!isContextValid()) return;

    try {
      const res = await fetch("/api/todos");
      if (res.ok) {
        const data = await res.json();
        const todos = data.todos || [];
        const incompleteCount = todos.filter((t) => !t.isCompleted).length;
        
        if (!isContextValid()) return;

        chrome.storage.local.set({ 
          incompleteTasksCount: incompleteCount,
          lastSyncAt: Date.now()
        });
      }
    } catch (err) {
      if (err.message && err.message.includes("Extension context invalidated")) {
        if (intervalId) clearInterval(intervalId);
        return;
      }
      console.error("GATE Tracker: Failed to fetch todos from API:", err);
    }
  };

  checkTasks();
  intervalId = setInterval(checkTasks, 8000);
  window.addEventListener("focus", checkTasks);
})();
