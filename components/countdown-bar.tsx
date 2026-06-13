"use client";

import { useEffect, useState } from "react";
import { GATE_EXAM_DATE } from "@/lib/config";
import { useFocusStore } from "@/lib/use-focus-store";
import { formatDuration } from "@/lib/utils";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function getTimeLeft(): TimeLeft {
  const total = Math.max(0, GATE_EXAM_DATE.getTime() - Date.now());
  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  return { days, hours, minutes, seconds, total };
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center min-w-[3rem]">
      <span className="text-sm sm:text-base font-bold text-white tabular-nums leading-none">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[9px] sm:text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">
        {label}
      </span>
    </div>
  );
}

function Separator() {
  return (
    <span className="text-violet-400 font-bold text-sm sm:text-base mx-0.5 animate-pulse">
      :
    </span>
  );
}

export function CountdownBar() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(getTimeLeft());
  const { isRunning, isPaused, startTime, accumulatedSeconds, currentSubject, load } = useFocusStore();
  const [focusSeconds, setFocusSeconds] = useState(0);

  // Load store state on mount
  useEffect(() => {
    load();
  }, [load]);

  // Sync GATE countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync focus duration display
  useEffect(() => {
    const updateFocusTime = () => {
      if (!isRunning) {
        setFocusSeconds(0);
      } else if (isPaused) {
        setFocusSeconds(accumulatedSeconds);
      } else if (startTime) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setFocusSeconds(accumulatedSeconds + elapsed);
      }
    };

    updateFocusTime();

    if (isRunning && !isPaused) {
      const interval = setInterval(updateFocusTime, 250);
      return () => clearInterval(interval);
    }
  }, [isRunning, isPaused, startTime, accumulatedSeconds]);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-12 bg-[#0d0d18]/95 backdrop-blur-md border-b border-white/[0.07] flex items-center justify-between px-4 sm:px-6">
      {/* Left section: App Brand/Pill */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-widest font-medium hidden sm:block">
          GATE 2027
        </span>
        <span className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">•</span>
        <span className="text-[10px] sm:text-xs text-violet-400 font-medium hidden md:block">
          Feb 1, 2027 · 09:30 IST
        </span>
      </div>

      {/* Middle section: GATE Countdown */}
      <div className="flex items-center gap-1">
        <Unit value={timeLeft.days} label="days" />
        <Separator />
        <Unit value={timeLeft.hours} label="hrs" />
        <Separator />
        <Unit value={timeLeft.minutes} label="min" />
        <Separator />
        <Unit value={timeLeft.seconds} label="sec" />
      </div>

      {/* Right section: Active Focus Session display */}
      <div className="min-w-[140px] flex justify-end">
        {isRunning ? (
          <div className="flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 px-3 py-1 rounded-full text-xs font-medium text-violet-300 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping" />
            <span className="max-w-[70px] sm:max-w-[100px] truncate">{currentSubject}</span>
            <span className="font-mono text-[10px] bg-violet-500/20 px-1.5 py-0.5 rounded ml-1">
              {formatDuration(focusSeconds)}
            </span>
          </div>
        ) : (
          <div className="text-[10px] text-gray-500 hidden sm:block italic">
            Focus timer ready
          </div>
        )}
      </div>
    </div>
  );
}
