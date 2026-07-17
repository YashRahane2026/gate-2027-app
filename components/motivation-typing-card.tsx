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

  // Blinking typewriter states
  const [displayedText, setDisplayedText] = useState("");
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [phase, setPhase] = useState<"typing" | "waiting" | "erasing">("typing");
  const [isTabActive, setIsTabActive] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [reducedIndex, setReducedIndex] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  // Monitor tab visibility
  useEffect(() => {
    const handleVisibility = () => setIsTabActive(!document.hidden);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // System accessibility settings
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  // Fetch secure quote lists from backend
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

  // Groups quotes for static fade overlays when prefers-reduced-motion is active
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

    // Estimate the horizontal length of current text to spawn embers under active word
    const textLength = displayedText.length;
    const centerOffset = (Math.random() - 0.5) * Math.min(canvas.width * 0.65, textLength * 12);

    for (let i = 0; i < count; i++) {
      const x = canvas.width / 2 + centerOffset;
      const y = canvas.height / 2 + 15 + (Math.random() - 0.5) * 15;
      
      const size = 0.8 + Math.random() * 1.6;
      const life = 0;
      const maxLife = 35 + Math.random() * 12; // Emitter lifetime around 600-750ms
      
      const vx = (Math.random() - 0.5) * 1.0;
      const vy = 0.8 + Math.random() * 1.2; // Float upward speed
      
      // Warm embers: orange, gold, reddish-orange
      const colors = ["#ff5500", "#ff8800", "#ffaa00", "#f97316", "#fb923c"];
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

  // Canvas render animation frame loops
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
        p.alpha = 1 - p.life / p.maxLife;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 4;
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

  // Main Typewriter State Machine Loop
  useEffect(() => {
    if (prefersReducedMotion || quotes.length === 0 || !isTabActive) return;

    let timer: NodeJS.Timeout;
    const currentQuote = quotes[quoteIndex];
    if (!currentQuote) return;

    if (phase === "typing") {
      const targetText = currentQuote.text;
      if (charIndex < targetText.length) {
        const nextChar = targetText[charIndex];
        
        // Typing cadence speeds: standard (70ms), commas (500ms), period endings (800ms)
        let speed = 70;
        if (nextChar === ",") {
          speed = 500;
        } else if (nextChar === "." || nextChar === "?" || nextChar === "!") {
          speed = 800;
        }

        timer = setTimeout(() => {
          setDisplayedText((prev) => {
            if (currentQuote.action === "append") {
              return prev + nextChar;
            } else {
              return targetText.slice(0, charIndex + 1);
            }
          });
          setCharIndex((prev) => prev + 1);
          setPhase("typing");
        }, speed);
      } else {
        // Complete segment typing
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
            setPhase("erasing");
          }, delay);
        }
      }
    } else if (phase === "erasing") {
      if (displayedText.length > 0) {
        timer = setTimeout(() => {
          setDisplayedText((prev) => prev.slice(0, -1));
        }, 22); // Character backspacing speed
      } else {
        const nextIndex = (quoteIndex + 1) % quotes.length;
        setQuoteIndex(nextIndex);
        setCharIndex(0);
        setPhase("typing");
      }
    }

    return () => clearTimeout(timer);
  }, [quoteIndex, charIndex, phase, displayedText, isTabActive, quotes, prefersReducedMotion]);

  // Emits sparks when keyword letters are actively typed
  useEffect(() => {
    if (phase !== "typing" || quotes.length === 0) return;
    const currentQuote = quotes[quoteIndex];
    if (!currentQuote) return;

    const lowerText = currentQuote.text.toLowerCase();
    const isKeyword = lowerText.includes("success") ||
                      lowerText.includes("choice") ||
                      lowerText.includes("discipline") ||
                      lowerText.includes("effort") ||
                      lowerText.includes("hard") ||
                      lowerText.includes("work");

    if (isKeyword && displayedText.length > 0) {
      spawnSparks(1.8);
    }
  }, [displayedText, phase, quoteIndex, quotes]);

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
            transition={{ duration: 0.2, ease: "easeOut" }}
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
            className="inline-block mx-[0.18em] whitespace-nowrap"
          >
            {wordContent}
          </motion.span>
        );
      }

      return (
        <span key={wordIdx} className="inline-block mx-[0.18em] whitespace-nowrap">
          {wordContent}
        </span>
      );
    });
  };

  if (loading) {
    return (
      <div className="w-full h-[220px] md:h-[260px] flex items-center justify-center bg-transparent">
        <div className="text-gray-600 text-xs font-semibold tracking-wider uppercase animate-pulse">
          Loading Page Heading...
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-[220px] md:min-h-[260px] flex flex-col justify-center items-center py-6 select-none bg-transparent">
      {/* Sparkles Emitter overlay */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none w-full h-full z-0" />

      {/* Hero Quote Display Area */}
      <div className="max-w-[850px] w-full text-center px-4 z-10 flex items-center justify-center">
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
