(function() {
  let checkInterval = null;

  // Add full screen loading hiding style at document_start
  const hideStyle = document.createElement("style");
  hideStyle.id = "gate-hide-style";
  hideStyle.innerHTML = "html, body { display: none !important; }";

  const showPage = () => {
    const el = document.getElementById("gate-hide-style");
    if (el) el.remove();
  };

  const hidePage = () => {
    if (!document.getElementById("gate-hide-style")) {
      document.documentElement.appendChild(hideStyle);
    }
  };

  const getStorage = (keys) => {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, resolve);
    });
  };

  const isGoClassesPage = () => {
    const url = window.location.href.toLowerCase();
    const pathname = window.location.pathname.toLowerCase();

    // 1. Channel page check
    if (pathname.includes("@goclasses") || pathname.includes("gateclasses")) {
      return true;
    }

    // 2. Search results page check (allow search so they can find GO Classes lectures)
    if (pathname.startsWith("/results")) {
      return true;
    }

    // 3. Document text search (checking if the channel name exists in page details)
    const htmlText = document.documentElement.innerHTML.toLowerCase();
    if (htmlText.includes("go classes") || htmlText.includes("gateclasses") || htmlText.includes("goclasses")) {
      return true;
    }

    // 4. DOM check for video owner
    const ownerLink = document.querySelector('ytd-video-owner-renderer a[href*="GOClasses"], ytd-video-owner-renderer a[href*="goclasses"]');
    if (ownerLink) {
      return true;
    }

    return false;
  };

  const evaluateBlocking = async () => {
    const data = await getStorage(["incompleteTasksCount"]);
    const count = data.incompleteTasksCount || 0;

    if (count <= 0) {
      unblockPage();
      return;
    }

    const pathname = window.location.pathname;
    
    // We only evaluate blocking on Home page, watch pages, or feed pages
    const shouldCheck = pathname === "/" || pathname.startsWith("/watch") || pathname.startsWith("/feed");
    if (!shouldCheck) {
      unblockPage();
      return;
    }

    // If it is a watch page, wait and check if it is GO Classes
    if (pathname.startsWith("/watch")) {
      hidePage();
      if (checkInterval) clearInterval(checkInterval);
      
      let attempts = 0;
      checkInterval = setInterval(() => {
        attempts++;
        if (isGoClassesPage()) {
          unblockPage();
          clearInterval(checkInterval);
        } else if (attempts >= 15) {
          // If after 3 seconds it is not Go Classes, enforce the block overlay
          blockPage();
          clearInterval(checkInterval);
        }
      }, 200);
    } else {
      // Home or feeds are blocked immediately
      blockPage();
    }
  };

  const blockPage = () => {
    hidePage();
    
    // Create and append blocker overlay if not exists
    if (!document.getElementById("gate-block-overlay")) {
      const overlay = document.createElement("div");
      overlay.id = "gate-block-overlay";
      overlay.innerHTML = `
        <div class="block-card">
          <div class="lock-icon">🛑</div>
          <h1>Focus Mode Active</h1>
          <p>YouTube is blocked because you have incomplete tasks in your GATE 2027 prep tracker.</p>
          <div class="hint">Only lectures from the <strong>GO Classes</strong> channel are permitted right now.</div>
          <a href="http://localhost:3000/study-group" target="_blank" class="dashboard-btn">Go Finish Your Tasks</a>
        </div>
      `;
      document.documentElement.appendChild(overlay);
    }
    showPage(); // Show page back, but block overlay will cover it
  };

  const unblockPage = () => {
    if (checkInterval) clearInterval(checkInterval);
    showPage();
    const overlay = document.getElementById("gate-block-overlay");
    if (overlay) overlay.remove();
  };

  // Run initial evaluation
  evaluateBlocking();

  // Listen to navigation events in YouTube SPA
  let lastUrl = window.location.href;
  const navObserver = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      evaluateBlocking();
    }
  });
  navObserver.observe(document.documentElement, { subtree: true, childList: true });

  // Listen to storage changes
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.incompleteTasksCount) {
      evaluateBlocking();
    }
  });
})();
