// background.js — GATE 2027 Chrome Extension Background Monitor

// Prevent access to chrome://extensions when tasks are incomplete
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    const urlLower = changeInfo.url.toLowerCase();
    if (urlLower.startsWith("chrome://extensions") || urlLower.startsWith("edge://extensions")) {
      chrome.storage.local.get(["incompleteTasksCount"], (data) => {
        const count = data.incompleteTasksCount || 0;
        if (count > 0) {
          // Redirect the user to the study dashboard
          chrome.tabs.update(tabId, { url: "http://localhost:3000/study-group" });
        }
      });
    }
  }
});
