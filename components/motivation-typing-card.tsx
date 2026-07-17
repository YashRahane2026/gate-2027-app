"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface QuoteItem {
  text: string;
  action: "type" | "append";
  delayBefore?: number;
  delayAfter?: number;
}

export function MotivationTypingCard() {
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Animation state machine
  const [displayedText, setDisplayedText] = useState("");
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [phase, setPhase] = useState<"typing" | "waiting" | "erasing">("typing");
  const [pulseGlow, setPulseGlow] = useState(false);
  const [isTabActive, setIsTabActive] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [reducedIndex, setReducedIndex] = useState(0);

  // Tab active listener to pause script when user is away
  useEffect(() => {
    const handleVisibility = () => {
      setIsTabActive(!document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Media Query for reduced motion accessibility preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  // Fetch Quotes list from Secure Backend API
  useEffect(() => {
    fetch("/api/motivation/quotes")
      .then((res) => res.json())
      .then((data) => {
        setQuotes(data.quotes || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load motivation quotes:", err);
        setLoading(false);
      });
  }, []);

  // Utility to group quotes for prefers-reduced-motion fade animations
  const getGroupedSentences = (list: QuoteItem[]) => {
    const sentences: string[] = [];
    let current = "";
    list.forEach((q) => {
      if (q.action === "type") {
        if (current) sentences.push(current);
        current = q.text;
      } else if (q.action === "append") {
        current += q.text;
      }
    });
    if (current) sentences.push(current);
    return sentences;
  };

  const groupedSentences = getGroupedSentences(quotes);

  // Reduced motion cycle timer
  useEffect(() => {
    if (!prefersReducedMotion || quotes.length === 0 || !isTabActive) return;

    const currentSentence = groupedSentences[reducedIndex];
    // Find the original segment to extract configured pauses
    const matchedSegment = quotes.find((q) => q.text === currentSentence || currentSentence.endsWith(q.text));
    const delay = matchedSegment?.delayAfter || 3000;

    const timer = setTimeout(() => {
      setReducedIndex((prev) => (prev + 1) % groupedSentences.length);
      setPulseGlow(true);
      setTimeout(() => setPulseGlow(false), 800);
    }, delay + 1000);

    return () => clearTimeout(timer);
  }, [reducedIndex, prefersReducedMotion, quotes, isTabActive, groupedSentences]);

  // Main typing state machine
  useEffect(() => {
    if (prefersReducedMotion || quotes.length === 0 || !isTabActive) return;

    let timer: NodeJS.Timeout;
    const currentQuote = quotes[quoteIndex];
    if (!currentQuote) return;

    if (phase === "typing") {
      if (currentQuote.action === "type" && charIndex === 0 && displayedText !== "") {
        setDisplayedText("");
      }

      const targetText = currentQuote.text;
      if (charIndex < targetText.length) {
        const nextChar = targetText[charIndex];
        const nextText = currentQuote.action === "append"
          ? displayedText + nextChar
          : targetText.slice(0, charIndex + 1);

        setDisplayedText(nextText);
        setCharIndex((prev) => prev + 1);

        // Adjust speed for natural human cadence (natural comma / period pauses)
        let speed = 80; // Default typing speed
        if (nextChar === ",") {
          speed = 500;
        } else if (nextChar === "." || nextChar === "?" || nextChar === "!") {
          speed = 800;
        }

        timer = setTimeout(() => {}, speed);
      } else {
        // Finished typing this segment
        const nextIndex = (quoteIndex + 1) % quotes.length;
        const nextQuote = quotes[nextIndex];

        if (nextQuote && nextQuote.action === "append") {
          setPhase("waiting");
          timer = setTimeout(() => {
            setQuoteIndex(nextIndex);
            setCharIndex(0);
            setPhase("typing");
          }, nextQuote.delayBefore || 800);
        } else {
          setPhase("waiting");
          const delay = currentQuote.delayAfter || 2000;
          timer = setTimeout(() => {
            setPulseGlow(true);
            setTimeout(() => setPulseGlow(false), 800);
            setPhase("erasing");
          }, delay);
        }
      }
    } else if (phase === "erasing") {
      if (displayedText.length > 0) {
        setDisplayedText((prev) => prev.slice(0, -1));
        timer = setTimeout(() => {}, 25); // Faster backspacing speed
      } else {
        // Erase complete, advance index
        const nextIndex = (quoteIndex + 1) % quotes.length;
        setQuoteIndex(nextIndex);
        setCharIndex(0);
        setPhase("typing");
      }
    }

    return () => clearTimeout(timer);
  }, [quoteIndex, charIndex, phase, displayedText, isTabActive, quotes, prefersReducedMotion]);

  // Glow important words: success, discipline, effort, hard work, choice
  const formatText = (text: string) => {
    const regex = /(success|discipline|effort|hard work|choice)/gi;
    const parts = text.split(regex);
    return parts.map((part, idx) => {
      if (part.toLowerCase().match(/^(success|discipline|effort|hard work|choice)$/)) {
        return (
          <span
            key={idx}
            className="text-violet-400 font-bold transition-all duration-700 drop-shadow-[0_0_12px_rgba(168,85,247,0.75)] animate-pulse"
            style={{ textShadow: "0 0 10px rgba(168, 85, 247, 0.6)" }}
          >
            {part}
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  if (loading) {
    return (
      <div className="w-full h-[240px] bg-[#1D1A28]/50 border border-white/5 rounded-[20px] flex items-center justify-center animate-pulse">
        <div className="text-gray-500 text-xs font-medium">Powering up motivation engine...</div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-[#1D1A28] border rounded-[20px] p-6 h-[240px] flex flex-col justify-between transition-all duration-1000",
        pulseGlow
          ? "border-violet-500/80 shadow-[0_0_30px_rgba(139,92,246,0.25)]"
          : "border-[rgba(138,43,226,0.35)] shadow-[0_0_20px_rgba(139,92,246,0.1)]"
      )}
    >
      {/* 1. Subtle Blurred Background Circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-[20px]">
        <div className="absolute top-1/4 left-1/3 w-36 h-36 bg-violet-600/5 rounded-full blur-[45px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-44 h-44 bg-purple-500/5 rounded-full blur-[55px] animate-pulse" />
      </div>

      {/* 2. Top Header Block */}
      <div className="flex items-center justify-between z-10">
        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-sans">
          🔥 Mindset Focus
        </div>
        <div className="flex items-center gap-1.5 text-[9px] font-extrabold text-violet-400 uppercase tracking-widest font-sans bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          Live
        </div>
      </div>

      {/* 3. Middle Content Animation Area */}
      <div className="flex-1 flex items-center justify-center py-4 z-10 select-none">
        {prefersReducedMotion ? (
          <AnimatePresence mode="wait">
            <motion.p
              key={reducedIndex}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.5 }}
              className="text-white text-base md:text-lg lg:text-xl font-bold tracking-tight font-sans text-center max-w-xl leading-relaxed"
            >
              {formatText(groupedSentences[reducedIndex] || "")}
            </motion.p>
          </AnimatePresence>
        ) : (
          <p className="text-white text-base md:text-lg lg:text-xl font-bold tracking-tight font-sans text-center max-w-xl leading-relaxed">
            {formatText(displayedText)}
            <span
              className="inline-block w-[3px] h-5 ml-1 bg-violet-500 animate-pulse duration-700"
              style={{ verticalAlign: "middle" }}
            />
          </p>
        )}
      </div>

      {/* 4. Footer Block */}
      <div className="flex justify-end z-10 select-none">
        <div className="text-[10px] italic text-gray-500 font-medium font-sans">
          Stay consistent every single day.
        </div>
      </div>
    </div>
  );
}
