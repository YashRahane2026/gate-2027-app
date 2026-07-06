(function() {
  let checkInterval = null;
  let sanitizeInterval = null;

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

  const sanitizeVideoCards = () => {
    const cards = document.querySelectorAll('ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer');
    
    cards.forEach(card => {
      if (card.dataset.gateChecked === "allowed") return;
      
      const channelLink = card.querySelector('a[href*="/@GOClasses"], a[href*="/@goclasses"], a[href*="GateClasses"], a[href*="gateclasses"]');
      
      if (channelLink) {
        card.dataset.gateChecked = "allowed";
        card.style.setProperty('opacity', '1', 'important');
        card.style.setProperty('pointer-events', 'auto', 'important');
        card.style.removeProperty('display');
      } else {
        const anyChannelLink = card.querySelector('ytd-channel-name a, #channel-name a, #channel-info a');
        if (anyChannelLink) {
          card.dataset.gateChecked = "blocked";
          card.style.setProperty('display', 'none', 'important');
        }
      }
    });
  };

  const evaluateBlocking = async () => {
    const data = await getStorage(["incompleteTasksCount"]);
    const count = data.incompleteTasksCount || 0;

    if (count <= 0) {
      unblockPage();
      return;
    }

    // Add CSS body class for filtering out video recommendations
    document.documentElement.classList.add("gate-focus-active");

    const pathname = window.location.pathname;
    
    // We only evaluate blocking on Home page, watch pages, or feed pages
    const shouldCheck = pathname === "/" || pathname.startsWith("/watch") || pathname.startsWith("/feed");
    if (!shouldCheck) {
      unblockPage();
      // Keep feed filtering active on other pages (like search results)
      document.documentElement.classList.add("gate-focus-active");
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
          document.documentElement.classList.add("gate-focus-active"); // Keep other suggestions blocked
          clearInterval(checkInterval);
        } else if (attempts >= 15) {
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
    showPage();
  };

  const unblockPage = () => {
    if (checkInterval) clearInterval(checkInterval);
    document.documentElement.classList.remove("gate-focus-active");
    
    // Reset any blocked elements
    document.querySelectorAll('[data-gate-checked]').forEach(el => {
      el.removeAttribute('data-gate-checked');
      el.style.removeProperty('display');
      el.style.removeProperty('opacity');
      el.style.removeProperty('pointer-events');
    });

    showPage();
    const overlay = document.getElementById("gate-block-overlay");
    if (overlay) overlay.remove();
  };

  // Run initial evaluation
  evaluateBlocking();

  // Run periodic card sanitizer to handle lazy-loaded elements
  sanitizeInterval = setInterval(() => {
    if (document.documentElement.classList.contains("gate-focus-active")) {
      sanitizeVideoCards();
    }
  }, 300);

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
