# GATE 2027 Chrome Extension

A lightweight Chrome Extension that shows your GATE 2027 study progress directly in your browser toolbar.

## Features

- ⏳ **Live GATE 2027 Countdown** — Days, hours, minutes, seconds
- 🎯 **Today's Focus Time** — Synced from your study dashboard
- 📋 **Today's Todo List** — Read-only view of your daily goals
- 🚀 **Quick Launch** — Opens the full dashboard in one click

## Installation

### Step 1: Deploy the Web App First
Make sure the web app is running at `localhost:3000` (dev) or your Vercel URL.

### Step 2: Update the Config
Open `extension/config.js` and set your URL:
```js
const CONFIG = {
  VERCEL_URL: "https://your-app.vercel.app", // <-- change this
  GATE_EXAM_DATE: new Date("2027-02-01T04:00:00.000Z"),
};
```

### Step 3: Load in Chrome
1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer Mode** (toggle in the top-right corner)
3. Click **"Load unpacked"**
4. Select the `/extension` folder from this project
5. The GATE 2027 icon will appear in your toolbar 🎉

### Step 4: Sign In
- The extension uses the same session cookies as the web app
- Sign in to the web app first in Chrome, then the extension will automatically show your data
- No separate login needed!

## How Auth Works

The extension uses `credentials: "include"` in fetch requests, which sends your existing NextAuth session cookie. This works as long as:
1. You're signed in to the web app in the same browser
2. The `VERCEL_URL` in `config.js` matches exactly where you're signed in

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Extension config (Manifest V3) |
| `popup.html` | Extension popup UI |
| `popup.js` | Countdown timer + API fetch logic |
| `popup.css` | Dark-themed styling |
| `config.js` | App URL configuration |

## Updating After Redeploy

If you redeploy to a new Vercel URL:
1. Edit `extension/config.js` — update `VERCEL_URL`
2. Go to `chrome://extensions`
3. Click the reload ↺ icon on the extension card
