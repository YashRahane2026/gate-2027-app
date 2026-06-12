"use client";

import { useEffect, useState } from "react";
import { GATE_EXAM_DATE } from "@/lib/config";

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

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-12 bg-[#0d0d18]/95 backdrop-blur-md border-b border-white/[0.07] flex items-center justify-center px-4">
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-widest font-medium hidden sm:block">
          GATE 2027
        </span>
        <span className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">•</span>
        <div className="flex items-center gap-1">
          <Unit value={timeLeft.days} label="days" />
          <Separator />
          <Unit value={timeLeft.hours} label="hrs" />
          <Separator />
          <Unit value={timeLeft.minutes} label="min" />
          <Separator />
          <Unit value={timeLeft.seconds} label="sec" />
        </div>
        <span className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">•</span>
        <span className="text-[10px] sm:text-xs text-violet-400 font-medium hidden md:block">
          Feb 1, 2027 · 09:30 IST
        </span>
      </div>
    </div>
  );
}
