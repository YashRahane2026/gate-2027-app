"use client";

import { useState } from "react";
import { Puzzle, Download, ArrowRight, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

export default function ExtensionPage() {
  const [copied, setCopied] = useState(false);

  const handleCopyConfig = () => {
    navigator.clipboard.writeText("window.location.origin");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const steps = [
    {
      num: "01",
      title: "Download Zip File",
      desc: "Click the download button above to grab the extension zip archive directly from the web app, and extract it on your computer."
    },
    {
      num: "02",
      title: "Open Chrome Extensions",
      desc: "Open your Google Chrome browser and type chrome://extensions in the address bar, or click the puzzle piece icon on your toolbar and select Manage Extensions."
    },
    {
      num: "03",
      title: "Turn on Developer Mode",
      desc: "In the top-right corner of the Extensions page, toggle the Developer Mode switch to the ON position. This unlocks custom extension installs."
    },
    {
      num: "04",
      title: "Load Unpacked Folder",
      desc: "Click the 'Load unpacked' button that appeared in the top-left corner, and select the extracted 'extension' folder on your computer."
    },
    {
      num: "05",
      title: "Keep Web App Logged In",
      desc: "The extension automatically reads your login session. Simply sign in to this web dashboard, and the extension will sync your study data."
    },
    {
      num: "06",
      title: "Pin to Toolbar",
      desc: "Click the puzzle icon next to your profile in Chrome, find 'GATE 2027 Tracker', and click the pin icon to keep the live tracker always visible."
    }
  ];

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-8 font-sans">
      
      {/* Hero Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-900/50 via-indigo-950/40 to-[#0b0b12] border border-violet-500/20 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="space-y-3 max-w-lg text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-semibold">
            <Puzzle className="w-3.5 h-3.5" />
            Chrome Extension v1.1
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
            Track Progress &amp; IISc OP Focus Blocker
          </h1>
          <p className="text-gray-400 text-xs md:text-sm leading-relaxed">
            Get the GATE 2027 Chrome Extension with real-time exam countdown, daily study hours, todo tracking, and the savage <strong className="text-amber-400 font-semibold">&ldquo;Phir ye tumse na ho payega!&rdquo;</strong> IISc YouTube blocker.
          </p>
        </div>
        
        {/* Direct Download Button */}
        <a
          href="/extension.zip"
          download="gate-2027-tracker.zip"
          className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-violet-500/25 transition-all hover:scale-[1.02] flex items-center gap-2 group flex-shrink-0"
        >
          <Download className="w-4 h-4" />
          Download Extension v1.1
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </a>
      </div>

      {/* IISc OP Blocker Feature Callout */}
      <div className="bg-gradient-to-r from-red-950/30 via-[#161226] to-[#0c0c16] border border-red-500/20 rounded-3xl p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-full md:w-48 h-32 rounded-2xl overflow-hidden border border-white/10 flex-shrink-0 shadow-lg relative group">
            <img 
              src="/iisc.jpg" 
              alt="IISc Bangalore" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2.5">
              <span className="text-[10px] font-bold text-amber-300">🏛️ IISc Bengaluru CSA</span>
            </div>
          </div>
          <div className="space-y-2 text-center md:text-left flex-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-bold uppercase tracking-wider">
              🛑 Savage Focus Protocol
            </div>
            <h2 className="text-lg md:text-xl font-black text-white">
              &ldquo;Phir ye tumse na ho payega!&rdquo; — IISc OP Blocker
            </h2>
            <p className="text-gray-400 text-xs leading-relaxed">
              Whenever YouTube is opened, distraction feeds and non-study videos are locked with the glorious IISc Bangalore tower photo and a savage reality check. Only official <strong>GO Classes GATE CSE</strong> study lectures are permitted.
            </p>
            <div className="inline-block text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-xl font-medium mt-1">
              👑 Whitelist Exception: <strong className="text-white">yash.dr2004@gmail.com</strong> has 100% full unrestricted YouTube access.
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Steps */}
      <div className="space-y-4">
        <h2 className="text-md font-bold text-white uppercase tracking-wider">Installation Guide</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {steps.map((step) => (
            <div 
              key={step.num}
              className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-4 transition-all hover:border-white/15"
            >
              <div className="text-2xl font-black text-violet-500/50 flex-shrink-0 font-sans tracking-tight">
                {step.num}
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">{step.title}</h3>
                <p className="text-gray-400 text-[11px] leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Configuration & Troubleshooting Help box */}
      <div className="bg-[#181825] border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-4.5 h-4.5 text-indigo-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Note for Custom Deployments</h3>
            <p className="text-gray-400 text-[11px] leading-relaxed">
              If running this app on a custom domain, you will need to update the configuration file in the extension package before loading it.
            </p>
          </div>
        </div>

        <div className="border-t border-white/5 pt-4 space-y-3">
          <p className="text-[11px] text-gray-400 leading-relaxed">
            1. Open the unzipped extension folder, and edit the <code className="px-1 py-0.5 bg-black/40 rounded text-violet-300 font-mono text-[10px]">config.js</code> file.
          </p>
          <p className="text-[11px] text-gray-400 leading-relaxed flex items-center gap-1.5 flex-wrap">
            2. Make sure the <code className="px-1 py-0.5 bg-black/40 rounded text-violet-300 font-mono text-[10px]">VERCEL_URL</code> matches your current URL:
            <code className="px-1.5 py-0.5 bg-[#1e1e2f] border border-white/10 rounded text-white font-mono text-[10px] select-all">
              {typeof window !== "undefined" ? window.location.origin : "https://your-domain.vercel.app"}
            </code>
          </p>
          
          <div className="flex items-center gap-4 flex-wrap pt-2">
            <button
              onClick={handleCopyConfig}
              className="text-[10px] font-bold text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
            >
              <CheckCircle2 className={`w-3.5 h-3.5 ${copied ? "text-emerald-400" : "text-violet-400"}`} />
              {copied ? "Copied URL!" : "Copy Domain Address"}
            </button>
            <span className="text-gray-600 text-[10px]">|</span>
            <div className="text-[10px] text-gray-500 flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-pulse" />
              Reload extensions tab in Chrome to apply config changes.
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
}
