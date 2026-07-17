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
  const [shakeText, setShakeText] = useState(false);

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
    const delay = currentQuote.includes("WORK!") ? 2500 :
                  currentQuote.includes("Then success") ? 3000 : 
                  currentQuote.includes("No one") ? 4000 : 2000;

    const timer = setTimeout(() => {
      setReducedIndex((prev) => (prev + 1) % quotes.length);
    }, delay + 1200);

    return () => clearTimeout(timer);
  }, [reducedIndex, prefersReducedMotion, quotes, isTabActive]);

  // Particle Emitter System (Magical Golden / Crimson sparks)
  const spawnSparks = (count: number) => {
    const canvas = canvasRef.current;
    if (!canvas || quotes.length === 0) return;

    const currentQuote = quotes[quoteIndex];
    if (!currentQuote) return;

    // Estimate cursor coordinate offsets horizontally to spawn sparks on letters
    const ratio = currentQuote.length > 0 ? (displayedText.length / currentQuote.length) : 0.5;
    const textWidth = Math.min(canvas.width * 0.65, currentQuote.length * 9.5);
    const cursorX = canvas.width / 2 + (ratio - 0.5) * textWidth;

    const isAdminSentence = currentQuote.includes("No one");

    for (let i = 0; i < count; i++) {
      const x = cursorX + (Math.random() - 0.5) * 35;
      const y = canvas.height / 2 + (Math.random() - 0.5) * 6;
      
      const size = 0.5 + Math.random() * 1.3;
      const life = 0;
      const maxLife = 36 + Math.random() * 18; // Sparks live 600-900ms
      
      // Radial spread velocity directions
      const angle = Math.random() * Math.PI * 2;
      const speed = isAdminSentence ? (0.7 + Math.random() * 1.5) : (0.4 + Math.random() * 1.1);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - (isAdminSentence ? 0.6 : 0.4); // Drift upwards
      
      // Magical Golden Sparks Palette
      let colors = ["#FFD166", "#FFC857", "#FFE08A"]; 
      if (isAdminSentence) {
        colors = ["#D62828", "#FFD166", "#FFC857", "#FFE08A", "#FF5555"]; // Red + Gold sparks mix
      }
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
        canvas.height = canvas.parentElement.clientHeight + 120;
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
      if (currentQuote === "WORK! WORK! WORK!") {
        // Dramatic word-by-word entrance for "WORK! WORK! WORK!"
        const words = ["WORK!", "WORK! WORK!", "WORK! WORK! WORK!"];
        if (charIndex < words.length) {
          timer = setTimeout(() => {
            setDisplayedText(words[charIndex]);
            setCharIndex((prev) => prev + 1);
            spawnSparks(22); // Particle burst
            setShakeText(true);
            setTimeout(() => setShakeText(false), 200); // Trigger tiny text shake
          }, charIndex === 0 ? 0 : 300); // 300ms delays
        } else {
          setPhase("waiting");
        }
      } else {
        // Standard typewriter sequence
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
          setPhase("waiting");
        }
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
    const delay = currentQuote?.includes("WORK!") ? 2500 :
                  currentQuote?.includes("Then success") ? 3000 : 
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
      spawnSparks(22); // Burst on keyword completion (15-25 particles)
    } else {
      const currentQuote = quotes[quoteIndex];
      if (currentQuote && phase === "typing" && currentQuote !== "WORK! WORK! WORK!") {
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
    const currentQuote = quotes[quoteIndex];
    const isAdminSentence = currentQuote?.includes("No one");
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
              isAdminSentence 
                ? "text-[#D62828] font-extrabold"
                : isImportant
                  ? "text-[#FFC857] font-extrabold"
                  : "text-white"
            )}
            style={isAdminSentence ? { filter: "drop-shadow(0 0 10px rgba(214, 40, 40, 0.45))" } : undefined}
          >
            {char}
          </motion.span>
        );
      });

      if (isImportant || isAdminSentence) {
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
      <div className="w-full h-[50px] flex items-center justify-center bg-transparent">
        <div className="text-gray-600 text-xs font-semibold tracking-wider uppercase animate-pulse">
          Loading Page Heading...
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-[40px] md:min-h-[45px] flex flex-col justify-center items-center py-0.5 select-none bg-transparent">
      {/* Extended height overlay canvas (top -60px offset) to prevent clipping */}
      <canvas 
        ref={canvasRef} 
        className="absolute pointer-events-none z-0" 
        style={{ top: "-60px", bottom: "-60px", left: 0, right: 0 }} 
      />

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
          className={cn("w-full transition-transform duration-150", shakeText && "animate-shake")}
        >
          {prefersReducedMotion ? (
            <AnimatePresence mode="wait">
              <motion.p
                key={reducedIndex}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.4 }}
                className="text-white text-xl md:text-[30px] lg:text-[36px] font-extrabold tracking-tight font-sans leading-[1.12] text-center"
              >
                {renderText(quotes[reducedIndex] || "")}
              </motion.p>
            </AnimatePresence>
          ) : (
            <p className="text-white text-xl md:text-[30px] lg:text-[36px] font-extrabold tracking-tight font-sans leading-[1.12] text-center">
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
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2.5px); }
          75% { transform: translateX(2.5px); }
        }
        .animate-shake {
          animation: shake 0.1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
