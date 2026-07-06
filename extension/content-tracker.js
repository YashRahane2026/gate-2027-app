(function() {
  console.log("GATE 2027 Prep Tracker: Task tracker active on this host.");

  const checkTasks = async () => {
    try {
      const res = await fetch("/api/todos");
      if (res.ok) {
        const data = await res.json();
        const todos = data.todos || [];
        const incompleteCount = todos.filter(t => !t.completed).length;
        
        chrome.storage.local.set({ 
          incompleteTasksCount: incompleteCount,
          lastSyncAt: Date.now()
        }, () => {
          // Success
        });
      }
    } catch (err) {
      console.error("GATE Tracker: Failed to fetch todos from API:", err);
    }
  };

  // Run on initial load
  checkTasks();

  // Run periodically every 8 seconds
  setInterval(checkTasks, 8000);

  // Re-verify immediately whenever user returns to tab
  window.addEventListener("focus", checkTasks);
})();
