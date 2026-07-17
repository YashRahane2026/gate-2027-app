"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface QuoteItem {
  text: string;
  action: "type" | "append";
  delayBefore?: number;
  delayAfter?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  color: string;
}

export function MotivationTypingCard() {
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Unified displayed text state
  const [displayedText, setDisplayedText] = useState("");
  const [isTabActive, setIsTabActive] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [reducedIndex, setReducedIndex] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  // State reference to manage typing state cleanly inside requestAnimationFrame
  const stateRef = useRef({
    quoteIndex: 0,
    charIndex: 0,
    phase: "typing" as "typing" | "waiting" | "erasing",
    displayedText: "",
    lastUpdateTime: 0,
    delayUntil: 0
  });

  // Track tab focus to pause execution when backgrounded
  useEffect(() => {
    const handleVisibility = () => setIsTabActive(!document.hidden);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // System reduced motion query
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  // Fetch Quotes list from Backend
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

  // Group quotes for static fades when accessibility is requested
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

  // Reduced motion timer
  useEffect(() => {
    if (!prefersReducedMotion || quotes.length === 0 || !isTabActive) return;

    const currentSentence = groupedSentences[reducedIndex];
    const matchedSegment = quotes.find((q) => q.text === currentSentence || currentSentence.endsWith(q.text));
    const delay = matchedSegment?.delayAfter || 3000;

    const timer = setTimeout(() => {
      setReducedIndex((prev) => (prev + 1) % groupedSentences.length);
    }, delay + 1200);

    return () => clearTimeout(timer);
  }, [reducedIndex, prefersReducedMotion, quotes, isTabActive, groupedSentences]);

  // Particle System (Embers and sparks)
  const spawnSparks = (count: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Center sparkles under the currently active word
    const textLength = displayedText.length;
    const centerOffset = (Math.random() - 0.5) * Math.min(canvas.width * 0.7, textLength * 11);

    for (let i = 0; i < count; i++) {
      const x = canvas.width / 2 + centerOffset;
      // Spawn slightly below text line
      const y = canvas.height / 2 + 10 + (Math.random() - 0.5) * 12;
      
      const size = 0.6 + Math.random() * 1.5;
      const life = 0;
      const maxLife = 36 + Math.random() * 16; // Lifetime around 600-850ms
      
      const vx = (Math.random() - 0.5) * 1.0;
      const vy = 0.8 + Math.random() * 1.3; // Upward drift velocity
      
      const colors = ["#ff4400", "#ff7700", "#ffaa00", "#fb923c", "#f97316"];
      const color = colors[Math.floor(Math.random() * colors.length)];

      particlesRef.current.push({
        x,
        y,
        vx,
        vy,
        size,
        alpha: 1,
        life,
        maxLife,
        color
      });
    }
  };

  // Canvas Emitter Animation Frame Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;

    const resizeCanvas = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
      }
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const particles = particlesRef.current;

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;

        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
          continue;
        }

        p.y -= p.vy;
        p.x += p.vx;
        p.vx += (Math.random() - 0.5) * 0.08;
        p.vx = Math.max(-1.0, Math.min(1.0, p.vx));
        
        const lifeRatio = p.life / p.maxLife;
        p.alpha = 1 - lifeRatio;

        // Transition: orange -> gold -> transparent yellow
        let fillColor = p.color;
        if (lifeRatio > 0.6) {
          fillColor = `rgba(254, 240, 138, ${p.alpha})`; // yellow
        } else if (lifeRatio > 0.3) {
          fillColor = `rgba(251, 146, 60, ${p.alpha})`; // gold
        } else {
          fillColor = p.color.replace(")", `, ${p.alpha})`); // original orange with alpha
        }

        ctx.save();
        ctx.fillStyle = fillColor;
        ctx.shadowBlur = 5;
        ctx.shadowColor = fillColor;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  // requestAnimationFrame-based Typewriter state machine loop
  useEffect(() => {
    if (prefersReducedMotion || quotes.length === 0 || !isTabActive) return;

    let animFrameId: number;

    const tick = (now: number) => {
      const state = stateRef.current;
      const currentQuote = quotes[state.quoteIndex];

      if (!currentQuote) {
        animFrameId = requestAnimationFrame(tick);
        return;
      }

      // Check if we are waiting for a delay (e.g. delayBefore or delayAfter)
      if (now < state.delayUntil) {
        animFrameId = requestAnimationFrame(tick);
        return;
      }

      if (state.phase === "typing") {
        const targetText = currentQuote.text;
        
        // Typing cadence speeds: standard (72ms), commas (500ms), period endings (800ms)
        let speed = 72;
        const lastChar = targetText[state.charIndex - 1];
        if (lastChar === ",") {
          speed = 500;
        } else if (lastChar === "." || lastChar === "?" || lastChar === "!") {
          speed = 800;
        }

        if (now - state.lastUpdateTime >= speed) {
          if (state.charIndex < targetText.length) {
            const nextChar = targetText[state.charIndex];
            
            if (currentQuote.action === "append") {
              state.displayedText = state.displayedText + nextChar;
            } else {
              state.displayedText = targetText.slice(0, state.charIndex + 1);
            }

            state.charIndex++;
            state.lastUpdateTime = now;
            setDisplayedText(state.displayedText);
          } else {
            // Segment complete
            const nextIndex = (state.quoteIndex + 1) % quotes.length;
            const nextQuote = quotes[nextIndex];

            if (nextQuote && nextQuote.action === "append") {
              state.quoteIndex = nextIndex;
              state.charIndex = 0;
              state.delayUntil = now + (nextQuote.delayBefore || 800);
            } else {
              state.phase = "waiting";
              state.delayUntil = now + (currentQuote.delayAfter || 2000);
            }
            state.lastUpdateTime = now;
          }
        }
      } else if (state.phase === "waiting") {
        state.phase = "erasing";
        state.lastUpdateTime = now;
      } else if (state.phase === "erasing") {
        if (now - state.lastUpdateTime >= 22) { // Eraser speed
          if (state.displayedText.length > 0) {
            state.displayedText = state.displayedText.slice(0, -1);
            state.lastUpdateTime = now;
            setDisplayedText(state.displayedText);
          } else {
            // Reset to next quote
            const nextIndex = (state.quoteIndex + 1) % quotes.length;
            state.quoteIndex = nextIndex;
            state.charIndex = 0;
            state.phase = "typing";
            state.lastUpdateTime = now;
          }
        }
      }

      animFrameId = requestAnimationFrame(tick);
    };

    animFrameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animFrameId);
  }, [quotes, prefersReducedMotion, isTabActive]);

  // Spawn spark burst when keywords are completed
  useEffect(() => {
    if (quotes.length === 0) return;
    
    const lowerText = displayedText.toLowerCase();
    
    // Check if the last typed sequence completes a keyword
    const completesKeyword = lowerText.endsWith("success") ||
                             lowerText.endsWith("choice") ||
                             lowerText.endsWith("discipline") ||
                             lowerText.endsWith("effort") ||
                             lowerText.endsWith("work");

    if (completesKeyword) {
      spawnSparks(16); // Spawn burst of 16 particles!
    } else {
      // Otherwise spawn a subtle continuous trail if typing a keyword segment
      const currentQuote = quotes[stateRef.current.quoteIndex];
      if (currentQuote && stateRef.current.phase === "typing") {
        const quoteLower = currentQuote.text.toLowerCase();
        const isKeyword = quoteLower.includes("success") ||
                          quoteLower.includes("choice") ||
                          quoteLower.includes("discipline") ||
                          quoteLower.includes("effort") ||
                          quoteLower.includes("hard") ||
                          quoteLower.includes("work");
        if (isKeyword && displayedText.length > 0) {
          spawnSparks(1.8);
        }
      }
    }
  }, [displayedText, quotes]);

  // Render text helper grouping chars into unbroken words for perfect wrapping
  const renderText = (text: string) => {
    const words = text.split(" ");
    return words.map((word, wordIdx) => {
      const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").toLowerCase();
      const isImportant = ["success", "choice", "discipline", "effort", "hard", "work"].includes(cleanWord);
      
      const wordContent = word.split("").map((char, charIdx) => {
        return (
          <motion.span
            key={charIdx}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={cn(
              "inline-block transition-all duration-700",
              isImportant
                ? "bg-gradient-to-r from-[#A855F7] to-[#D946EF] bg-clip-text text-transparent font-extrabold"
                : "text-white"
            )}
            style={isImportant ? { filter: "drop-shadow(0 0 10px rgba(217, 70, 239, 0.45))" } : undefined}
          >
            {char}
          </motion.span>
        );
      });

      if (isImportant) {
        return (
          <motion.span
            key={wordIdx}
            initial={{ scale: 0.96 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 12 }}
            className="inline-block mx-[0.16em] whitespace-nowrap"
          >
            {wordContent}
          </motion.span>
        );
      }

      return (
        <span key={wordIdx} className="inline-block mx-[0.16em] whitespace-nowrap">
          {wordContent}
        </span>
      );
    });
  };

  if (loading) {
    return (
      <div className="w-full h-[150px] flex items-center justify-center bg-transparent">
        <div className="text-gray-600 text-xs font-semibold tracking-wider uppercase animate-pulse">
          Loading Page Heading...
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-[140px] md:min-h-[160px] flex flex-col justify-center items-center py-2 select-none bg-transparent">
      {/* Sparkles Emitter overlay */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none w-full h-full z-0" />

      {/* Styled Heading category */}
      <h3 className="text-xs font-bold text-violet-400/40 uppercase tracking-widest text-center font-sans mb-3 z-10">
        Mindset Focus
      </h3>

      {/* Hero Quote Display Area */}
      <div className="max-w-[1000px] w-full text-center px-6 z-10 flex items-center justify-center">
        <motion.div
          animate={stateRef.current.phase === "waiting" ? { scale: [1, 1.01, 1] } : { scale: 1 }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="w-full"
        >
          {prefersReducedMotion ? (
            <AnimatePresence mode="wait">
              <motion.p
                key={reducedIndex}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.4 }}
                className="text-white text-3xl md:text-[50px] lg:text-[58px] font-extrabold tracking-tight font-sans leading-[1.12] text-center"
              >
                {renderText(groupedSentences[reducedIndex] || "")}
              </motion.p>
            </AnimatePresence>
          ) : (
            <p className="text-white text-3xl md:text-[50px] lg:text-[58px] font-extrabold tracking-tight font-sans leading-[1.12] text-center">
              {renderText(displayedText)}
              <span
                className="inline-block w-[3.5px] h-[36px] md:h-[50px] ml-2 bg-[#A855F7] animate-blink"
                style={{ verticalAlign: "middle" }}
              />
            </p>
          )}
        </motion.div>
      </div>

      {/* Custom Styles Injector */}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .animate-blink {
          animation: blink 1.1s step-end infinite;
        }
      `}</style>
    </div>
  );
}
