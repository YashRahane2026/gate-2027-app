"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

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
  const [quotes, setQuotes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Typewriter state variables
  const [displayedText, setDisplayedText] = useState("");
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [phase, setPhase] = useState<"typing" | "waiting" | "erasing">("typing");
  const [delayUntil, setDelayUntil] = useState(0);

  const [isTabActive, setIsTabActive] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [reducedIndex, setReducedIndex] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  // Monitor tab active status
  useEffect(() => {
    const handleVisibility = () => setIsTabActive(!document.hidden);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // System media query for reduced motion
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  // Fetch flat strings from secure endpoint
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

  // Reduced motion slide timer
  useEffect(() => {
    if (!prefersReducedMotion || quotes.length === 0 || !isTabActive) return;

    const currentQuote = quotes[reducedIndex];
    const delay = currentQuote.includes("Then success") ? 3000 : 
                  currentQuote.includes("No one") ? 4000 : 2000;

    const timer = setTimeout(() => {
      setReducedIndex((prev) => (prev + 1) % quotes.length);
    }, delay + 1200);

    return () => clearTimeout(timer);
  }, [reducedIndex, prefersReducedMotion, quotes, isTabActive]);

  // Particle Emitter System (Warm glowing embers)
  const spawnSparks = (count: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Distribute embers under the currently typed horizontal text boundaries
    const textLength = displayedText.length;
    const centerOffset = (Math.random() - 0.5) * Math.min(canvas.width * 0.7, textLength * 11);

    for (let i = 0; i < count; i++) {
      const x = canvas.width / 2 + centerOffset;
      const y = canvas.height / 2 + 12 + (Math.random() - 0.5) * 12;
      
      const size = 0.7 + Math.random() * 1.5;
      const life = 0;
      const maxLife = 35 + Math.random() * 15; // Embers live 600-850ms
      
      const vx = (Math.random() - 0.5) * 0.9;
      const vy = 0.8 + Math.random() * 1.2; // Float upwards
      
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

  // Canvas Anim Frame tick loop
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
        p.vx = Math.max(-0.8, Math.min(0.8, p.vx));
        
        const lifeRatio = p.life / p.maxLife;
        p.alpha = 1 - lifeRatio;

        // Transition: Hot orange -> gold -> transparent yellow
        let fillColor = p.color;
        if (lifeRatio > 0.6) {
          fillColor = `rgba(254, 240, 138, ${p.alpha})`;
        } else if (lifeRatio > 0.3) {
          fillColor = `rgba(251, 146, 60, ${p.alpha})`;
        } else {
          fillColor = p.color.replace(")", `, ${p.alpha})`);
        }

        ctx.save();
        ctx.fillStyle = fillColor;
        ctx.shadowBlur = 4;
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

  // Standard Deterministic React State Machine Typewriter Loop
  useEffect(() => {
    if (quotes.length === 0 || prefersReducedMotion || !isTabActive) return;

    const currentQuote = quotes[quoteIndex];
    if (!currentQuote) return;

    // Check if we are currently waiting for a delay
    const now = performance.now();
    if (now < delayUntil) {
      const remaining = delayUntil - now;
      const timeout = setTimeout(() => {
        setDelayUntil(0);
      }, remaining);
      return () => clearTimeout(timeout);
    }

    let speed = 72; // Standard human typing cadence (65-80ms)
    let timer: NodeJS.Timeout;

    if (phase === "typing") {
      if (charIndex < currentQuote.length) {
        const nextChar = currentQuote[charIndex];
        
        if (nextChar === ",") {
          speed = 500;
        } else if (nextChar === "?" && charIndex < currentQuote.length - 1) {
          // Pause in the middle of dialogue sentences (before " Yes.")
          speed = 800;
        } else if (nextChar === "." || nextChar === "!" || nextChar === "?") {
          speed = 800;
        }

        timer = setTimeout(() => {
          setDisplayedText((prev) => prev + nextChar);
          setCharIndex((prev) => prev + 1);
        }, speed);
      } else {
        // Dialogue complete. Trigger custom pauses: Then success (3s), admin-only (4s), others (2s)
        const delay = currentQuote.includes("Then success") ? 3000 : 
                      currentQuote.includes("No one") ? 4000 : 2000;
        
        setPhase("waiting");
        setDelayUntil(performance.now() + delay);
      }
    } else if (phase === "waiting") {
      setPhase("erasing");
    } else if (phase === "erasing") {
      if (displayedText.length > 0) {
        timer = setTimeout(() => {
          setDisplayedText((prev) => prev.slice(0, -1));
        }, 22); // Backspace character erase speed
      } else {
        // Reset and advance quoteIndex
        const nextIndex = (quoteIndex + 1) % quotes.length;
        setQuoteIndex(nextIndex);
        setCharIndex(0);
        setPhase("typing");
      }
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [quoteIndex, charIndex, phase, displayedText, delayUntil, quotes, prefersReducedMotion, isTabActive]);

  // Emits sparks when keyword letters are actively typed
  useEffect(() => {
    if (quotes.length === 0) return;
    
    const lowerText = displayedText.toLowerCase();
    const completesKeyword = lowerText.endsWith("success") ||
                             lowerText.endsWith("choice") ||
                             lowerText.endsWith("discipline") ||
                             lowerText.endsWith("effort") ||
                             lowerText.endsWith("work");

    if (completesKeyword) {
      spawnSparks(15); // Embers burst on keyword completion
    } else {
      const currentQuote = quotes[quoteIndex];
      if (currentQuote && phase === "typing") {
        const quoteLower = currentQuote.toLowerCase();
        const isKeyword = quoteLower.includes("success") ||
                          quoteLower.includes("choice") ||
                          quoteLower.includes("discipline") ||
                          quoteLower.includes("effort") ||
                          quoteLower.includes("hard") ||
                          quoteLower.includes("work");
        if (isKeyword && displayedText.length > 0) {
          spawnSparks(1.4);
        }
      }
    }
  }, [displayedText, quoteIndex, phase, quotes]);

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
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
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
      <div className="w-full h-[140px] flex items-center justify-center bg-transparent">
        <div className="text-gray-600 text-xs font-semibold tracking-wider uppercase animate-pulse">
          Loading Page Heading...
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-[140px] md:min-h-[150px] flex flex-col justify-center items-center py-1 select-none bg-transparent">
      {/* Sparkles overlay canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none w-full h-full z-0" />

      {/* Elegant Sub-Heading */}
      <h3 className="text-xs font-bold text-violet-400/40 uppercase tracking-widest text-center font-sans mb-3.5 z-10">
        Mindset Focus
      </h3>

      {/* Quote display wrapper */}
      <div className="max-w-[1000px] w-full text-center px-6 z-10 flex items-center justify-center">
        <motion.div
          animate={phase === "waiting" ? { scale: [1, 1.01, 1] } : { scale: 1 }}
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
                {renderText(quotes[reducedIndex] || "")}
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

      {/* Blinking stylesheet styles */}
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
