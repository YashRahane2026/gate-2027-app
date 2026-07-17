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
  const [isFading, setIsFading] = useState(false);

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

  // Fetch flat strings from secure API
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

  // Particle Emitter System (Warm glowing golden sparks)
  const spawnSparks = (count: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Distribute sparks horizontally around current typed boundary
    const textLength = displayedText.length;
    const centerOffset = (Math.random() - 0.5) * Math.min(canvas.width * 0.7, textLength * 9);

    for (let i = 0; i < count; i++) {
      const x = canvas.width / 2 + centerOffset;
      const y = canvas.height / 2 + (Math.random() - 0.5) * 8;
      
      const size = 0.5 + Math.random() * 1.2;
      const life = 0;
      const maxLife = 32 + Math.random() * 10; // Sparks live ~600ms
      
      // Radial spread velocity
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.4 + Math.random() * 1.0;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 0.4; // Drift slightly upwards
      
      // Magical Golden Sparks Palette
      const colors = ["#FFD166", "#FFE08A", "#FFC857", "#FFF3B0"];
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

  // Canvas Anim Frame Loop
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

        p.y += p.vy;
        p.x += p.vx;
        p.vx += (Math.random() - 0.5) * 0.05;
        p.alpha = 1 - p.life / p.maxLife;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 2;
        ctx.shadowColor = p.color;

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

    let speed = 72; // Standard human typing cadence (65-80ms)
    let timer: NodeJS.Timeout;

    if (phase === "typing") {
      if (charIndex < currentQuote.length) {
        const nextChar = currentQuote[charIndex];
        const isDialoguePause = nextChar === " " && currentQuote.slice(charIndex).startsWith(" Yes.");
        
        if (isDialoguePause) {
          speed = 800; // Dialogue pause
        } else if (nextChar === ",") {
          speed = 500;
        } else if (nextChar === "." || nextChar === "!" || nextChar === "?") {
          speed = 800;
        }

        timer = setTimeout(() => {
          setDisplayedText((prev) => prev + nextChar);
          setCharIndex((prev) => prev + 1);
        }, speed);
      } else {
        // Move immediately to waiting phase
        setPhase("waiting");
      }
    } else if (phase === "erasing") {
      // Fade out the entire sentence at once
      setIsFading(true);
      
      // Wait for the opacity transition to complete (300ms)
      timer = setTimeout(() => {
        const nextIndex = (quoteIndex + 1) % quotes.length;
        setQuoteIndex(nextIndex);
        setCharIndex(0);
        setDisplayedText("");
        setIsFading(false);
        setPhase("typing");
      }, 300);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [quoteIndex, charIndex, phase, displayedText, quotes, prefersReducedMotion, isTabActive]);

  // Separate effect to handle the "waiting" phase delay securely
  useEffect(() => {
    if (phase !== "waiting" || quotes.length === 0) return;

    const currentQuote = quotes[quoteIndex];
    const delay = currentQuote?.includes("Then success") ? 3000 : 
                  currentQuote?.includes("No one") ? 4000 : 2000;

    const timer = setTimeout(() => {
      setPhase("erasing");
    }, delay);

    return () => clearTimeout(timer);
  }, [phase, quoteIndex, quotes]);

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
      spawnSparks(12); // Emit particles spreading outward
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
          spawnSparks(1.2);
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
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className={cn(
              "inline-block transition-all duration-700",
              isImportant
                ? "text-[#FFC857] font-extrabold"
                : "text-white"
            )}
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
      <div className="w-full h-[60px] flex items-center justify-center bg-transparent">
        <div className="text-gray-600 text-xs font-semibold tracking-wider uppercase animate-pulse">
          Loading Page Heading...
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-[40px] md:min-h-[45px] flex flex-col justify-center items-center py-0.5 select-none bg-transparent">
      {/* Sparkles overlay canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none w-full h-full z-0" />

      {/* Quote display wrapper */}
      <div className="max-w-[1000px] w-full text-center px-6 z-10 flex items-center justify-center">
        <motion.div
          animate={{
            scale: phase === "waiting" ? [1, 1.01, 1] : 1,
            opacity: isFading ? 0 : 1
          }}
          transition={{
            scale: { duration: 6, repeat: Infinity, ease: "easeInOut" },
            opacity: { duration: 0.3 }
          }}
          className="w-full"
        >
          {prefersReducedMotion ? (
            <AnimatePresence mode="wait">
              <motion.p
                key={reducedIndex}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.4 }}
                className="text-white text-xl md:text-[32px] lg:text-[38px] font-extrabold tracking-tight font-sans leading-[1.12] text-center"
              >
                {renderText(quotes[reducedIndex] || "")}
              </motion.p>
            </AnimatePresence>
          ) : (
            <p className="text-white text-xl md:text-[32px] lg:text-[38px] font-extrabold tracking-tight font-sans leading-[1.12] text-center">
              {renderText(displayedText)}
              <span
                className="inline-block w-[3px] h-[26px] md:h-[34px] ml-2 bg-[#A855F7] animate-blink"
                style={{ verticalAlign: "middle" }}
              />
            </p>
          )}
        </motion.div>
      </div>

      {/* Styles Injector */}
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
