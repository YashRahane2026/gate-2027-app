// background.js — GATE 2027 Chrome Extension Background Monitor

const WHITELISTED_ADMIN = "yash.dr2004@gmail.com";

// Prevent disabling or removing extension when tasks are incomplete (unless Yash)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    const urlLower = changeInfo.url.toLowerCase();
    if (urlLower.startsWith("chrome://extensions") || urlLower.startsWith("edge://extensions")) {
      chrome.storage.local.get(["userEmail", "isWhitelisted", "incompleteTasksCount", "gate_app_url"], (data) => {
        const email = (data.userEmail || "").toLowerCase().trim();
        if (email === WHITELISTED_ADMIN || data.isWhitelisted === true) {
          return; // Yash has unrestricted admin privileges
        }
        const count = data.incompleteTasksCount || 0;
        if (count > 0) {
          const redirectUrl = data.gate_app_url ? `${data.gate_app_url}/study-group` : "https://gate-2027-app.vercel.app/study-group";
          chrome.tabs.update(tabId, { url: redirectUrl });
        }
      });
    }
  }
});
