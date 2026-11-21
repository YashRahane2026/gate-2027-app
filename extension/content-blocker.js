// content-blocker.js — IISc OP YouTube Focus Blocker for GATE 2027 Aspirants
(function() {
  const WHITELISTED_ADMIN = "yash.dr2004@gmail.com";

  let checkInterval = null;
  let sanitizeInterval = null;
  let navObserver = null;
  let lastEvaluatedUrl = "";

  // Emergency hiding style injected at document_start to prevent screen flash
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

  const isContextValid = () => {
    if (!chrome.runtime || !chrome.runtime.id) {
      if (checkInterval) clearInterval(checkInterval);
      if (sanitizeInterval) clearInterval(sanitizeInterval);
      if (navObserver) navObserver.disconnect();
      return false;
    }
    return true;
  };

  const getStorage = (keys) => {
    return new Promise((resolve) => {
      if (!isContextValid()) return resolve({});
      try {
        chrome.storage.local.get(keys, resolve);
      } catch {
        resolve({});
      }
    });
  };

  const escapeHtml = (str) => {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
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

    // 3. Document text search
    const htmlText = (document.documentElement.innerHTML || "").toLowerCase();
    if (htmlText.includes("go classes") || htmlText.includes("gateclasses") || htmlText.includes("goclasses")) {
      return true;
    }

    // 4. Video owner renderer check
    const ownerLink = document.querySelector('ytd-video-owner-renderer a[href*="GOClasses"], ytd-video-owner-renderer a[href*="goclasses"]');
    if (ownerLink) {
      return true;
    }

    return false;
  };

  const sanitizeVideoCards = () => {
    if (!isContextValid()) return;

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

  const blockPage = (userInfo) => {
    if (!isContextValid()) return;
    hidePage();

    let overlay = document.getElementById("gate-block-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "gate-block-overlay";
      document.documentElement.appendChild(overlay);
    }

    const iiscUrl = (chrome.runtime && chrome.runtime.getURL)
      ? chrome.runtime.getURL("iisc.jpg")
      : "https://upload.wikimedia.org/wikipedia/commons/a/a4/IISC_Bangalore_01.jpg";

    const email = userInfo.userEmail || "No Account Logged In";
    const appUrl = userInfo.gate_app_url || "https://gate-2027-app.vercel.app";

    overlay.innerHTML = `
      <div class="gate-op-card">
        
        <!-- Header Ribbon -->
        <div class="gate-top-bar">
          <div class="gate-institute-tag">
            <span class="gate-emblem">🏛️</span>
            <div>
              <div class="gate-inst-name">INDIAN INSTITUTE OF SCIENCE · BENGALURU</div>
              <div class="gate-inst-dept">Department of Computer Science &amp; Automation (CSA)</div>
            </div>
          </div>
          <div class="gate-target-pill">
            <span class="gate-pulse-dot"></span>
            TARGET: AIR &lt; 50 · GATE 2027
          </div>
        </div>

        <!-- IISc OP Photo Frame -->
        <div class="gate-photo-wrapper">
          <img src="${iiscUrl}" alt="IISc Bangalore Main Building" class="gate-iisc-img" />
          <div class="gate-photo-gradient"></div>
          <div class="gate-photo-badge">
            <span>👑</span>
            <span>The Dream of Every GATE CSE Topper</span>
          </div>
          <div class="gate-photo-quote">
            Faculty Hall &amp; Historic Tower · IISc Bangalore
          </div>
        </div>

        <!-- Savage Punchline & Roast Section -->
        <div class="gate-punchline-wrapper">
          <h1 class="gate-punchline">Phir ye tumse na ho payega! 🛑</h1>
          <div class="gate-punchline-sub">Reality Check for GATE 2027 Aspirants</div>
        </div>

        <div class="gate-roast-message">
          <p class="gate-roast-highlight">
            "Bhai... IISc Bangalore me M.Tech CSE ka sapna dekh rahe ho aur yahan YouTube pe timepass chal raha hai?"
          </p>
          <p class="gate-roast-desc">
            Jab tum yahan YouTube scroll kar rahe ho, tumhara competition <strong>Algorithms, TOC aur OS</strong> ke PYQs grind kar raha hai. Har waste kiya hua ghanta tumhari GATE rank ko <strong>100 ranks peeche</strong> dhakelta hai!
          </p>
        </div>

        <!-- Reality Check Banner -->
        <div class="gate-reality-banner">
          ⚡ <strong>Reality Check:</strong> Bina target ToDo complete kiye YouTube dekhna prohibited hai! Ya toh distractions ko chhod do, ya IISc ka sapna bhool jao.
        </div>

        <!-- Account Info Bar -->
        <div class="gate-account-bar">
          <div class="gate-account-user">
            <span>👤</span>
            <span>Current: <strong>${escapeHtml(email)}</strong></span>
          </div>
          <span class="gate-account-badge">Focus Locked</span>
        </div>

        <!-- Action Buttons -->
        <div class="gate-action-buttons">
          <a href="${appUrl}/dashboard" target="_blank" class="gate-btn gate-btn-primary">
            🔥 Wapas Padhne Chalo (Dashboard)
          </a>
          <a href="https://www.youtube.com/@GOClasses" class="gate-btn gate-btn-secondary">
            📚 Only GO Classes Allowed
          </a>
        </div>

        <!-- Footer Exception Notice -->
        <div class="gate-footer-notice">
          Exception granted strictly for <strong>yash.dr2004@gmail.com</strong> only.<br />All other accounts must finish their daily study targets!
        </div>

      </div>
    `;

    showPage();
  };

  const unblockPage = () => {
    if (checkInterval) clearInterval(checkInterval);
    document.documentElement.classList.remove("gate-focus-active");

    // Remove overlay if present
    const overlay = document.getElementById("gate-block-overlay");
    if (overlay) overlay.remove();

    // Reset blocked video cards
    document.querySelectorAll('[data-gate-checked]').forEach(el => {
      el.removeAttribute('data-gate-checked');
      el.style.removeProperty('display');
      el.style.removeProperty('opacity');
      el.style.removeProperty('pointer-events');
    });

    showPage();
  };

  const evaluateBlocking = async () => {
    if (!isContextValid()) return;

    try {
      const data = await getStorage([
        "userEmail",
        "userName",
        "isWhitelisted",
        "hasTargetTodo",
        "incompleteTasksCount",
        "gate_app_url"
      ]);

      const email = (data.userEmail || "").toLowerCase().trim();

      // ──────────────────────────────────────────────
      // 1. EXCEPTION FOR YASH (yash.dr2004@gmail.com)
      // ──────────────────────────────────────────────
      if (email === WHITELISTED_ADMIN || data.isWhitelisted === true) {
        unblockPage();
        return; // Complete freedom for Yash!
      }

      // ──────────────────────────────────────────────
      // 2. ALL REMAINING ACCOUNTS / OTHERS
      // ──────────────────────────────────────────────
      const pathname = window.location.pathname.toLowerCase();

      // Always block YouTube Shorts completely for all other accounts
      if (pathname.startsWith("/shorts")) {
        blockPage(data);
        return;
      }

      // If user is watching a lecture, verify if it is GO Classes
      if (pathname.startsWith("/watch")) {
        hidePage();
        if (checkInterval) clearInterval(checkInterval);

        let attempts = 0;
        checkInterval = setInterval(() => {
          attempts++;
          if (!isContextValid()) return;

          if (isGoClassesPage()) {
            unblockPage();
            document.documentElement.classList.add("gate-focus-active");
            clearInterval(checkInterval);
          } else if (attempts >= 12) {
            blockPage(data);
            clearInterval(checkInterval);
          }
        }, 200);
        return;
      }

      // If channel is GO Classes channel itself or search page, allow
      if (isGoClassesPage()) {
        unblockPage();
        document.documentElement.classList.add("gate-focus-active");
        return;
      }

      // Home page, feed, subscriptions, trending, or any entertainment: 100% BLOCKED
      blockPage(data);

    } catch (err) {
      if (err.message && err.message.includes("Extension context invalidated")) {
        if (checkInterval) clearInterval(checkInterval);
        if (sanitizeInterval) clearInterval(sanitizeInterval);
        if (navObserver) navObserver.disconnect();
        return;
      }
      console.error("[GATE Blocker] Evaluation error:", err);
    }
  };

  // Initial evaluation
  evaluateBlocking();

  // Periodic sanitizer for recommendation elements on allowed study pages
  sanitizeInterval = setInterval(() => {
    if (document.documentElement.classList.contains("gate-focus-active")) {
      sanitizeVideoCards();
    }
  }, 350);

  // Monitor SPA navigation events on YouTube
  window.addEventListener("yt-navigate-finish", () => {
    evaluateBlocking();
  });

  window.addEventListener("popstate", () => {
    evaluateBlocking();
  });

  // Fallback DOM Mutation observer for URL changes
  lastEvaluatedUrl = window.location.href;
  navObserver = new MutationObserver(() => {
    if (!isContextValid()) return;
    if (window.location.href !== lastEvaluatedUrl) {
      lastEvaluatedUrl = window.location.href;
      evaluateBlocking();
    }
  });
  navObserver.observe(document.documentElement, { subtree: true, childList: true });

  // Re-evaluate whenever storage state changes (e.g. login/sync happens)
  chrome.storage.onChanged.addListener((changes) => {
    if (!isContextValid()) return;
    if (changes.userEmail || changes.isWhitelisted || changes.incompleteTasksCount) {
      evaluateBlocking();
    }
  });
})();
