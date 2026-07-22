"use client";

import { useState, useEffect } from "react";
import { Play, Pause, Square, Timer } from "lucide-react";
import { formatDuration, formatMinutes, cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { Todo } from "@/types/todo";
import { useFocusStore } from "@/lib/use-focus-store";

interface FocusTimerProps {
  todos: Todo[];
  onSessionComplete: () => void;
  todayMinutes: number;
  avgDailyMinutes?: number;
}

export function FocusTimer({ todos, onSessionComplete, todayMinutes, avgDailyMinutes }: FocusTimerProps) {
  const {
    isRunning,
    isPaused,
    startTime,
    accumulatedSeconds,
    currentSubject,
    selectedSubject: storeSelectedSubject,
    customSubject: storeCustomSubject,
    start,
    pause,
    resume,
    stop,
    load,
    setTodayMinutes,
  } = useFocusStore();

  const [displaySeconds, setDisplaySeconds] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const { toast } = useToast();

  // Sync today's minutes from prop to store
  useEffect(() => {
    setTodayMinutes(todayMinutes);
  }, [todayMinutes, setTodayMinutes]);

  // Load state from localStorage on mount
  useEffect(() => {
    load();
  }, [load]);

  // Sync input fields when loading an already running timer
  useEffect(() => {
    if (isRunning) {
      setSelectedSubject(storeSelectedSubject);
      setCustomSubject(storeCustomSubject);
    }
  }, [isRunning, storeSelectedSubject, storeCustomSubject]);

  // Smooth timer updates that handle browser throttling & absolute time calculation
  useEffect(() => {
    const updateTime = () => {
      if (!isRunning) {
        setDisplaySeconds(0);
      } else if (isPaused) {
        setDisplaySeconds(accumulatedSeconds);
      } else if (startTime) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setDisplaySeconds(accumulatedSeconds + elapsed);
      }
    };

    updateTime(); // Run immediately

    if (isRunning && !isPaused) {
      const interval = setInterval(updateTime, 250); // Tick frequently to keep accurate display
      return () => clearInterval(interval);
    }
  }, [isRunning, isPaused, startTime, accumulatedSeconds]);

  const handleStart = () => {
    setShowModal(true);
  };

  const confirmStart = () => {
    const subject = selectedSubject === "__custom__" ? customSubject : selectedSubject;
    if (!subject.trim()) {
      toast({ title: "Please select or enter a subject", variant: "destructive" });
      return;
    }
    setShowModal(false);
    start(subject, selectedSubject, customSubject);
  };

  const handlePause = () => {
    if (isPaused) {
      resume();
    } else {
      pause();
    }
  };

  const handleStop = async () => {
    const elapsedSeconds = accumulatedSeconds + (startTime ? Math.floor((Date.now() - startTime) / 1000) : 0);
    const durationMinutes = Math.floor(elapsedSeconds / 60);

    if (durationMinutes < 1) {
      toast({ title: "Session too short", description: "Minimum 1 minute to save a session." });
      stop();
      return;
    }

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: currentSubject,
          startTime: new Date(startTime || Date.now() - elapsedSeconds * 1000).toISOString(),
          endTime: new Date().toISOString(),
          durationMinutes,
        }),
      });

      if (res.ok) {
        toast({
          title: "🎉 Session saved!",
          description: `${durationMinutes}m of ${currentSubject} recorded.`,
        });
        onSessionComplete();
      }
    } catch {
      toast({ title: "Failed to save session", variant: "destructive" });
    }

    stop();
    setSelectedSubject("");
    setCustomSubject("");
  };

  const activeTodos = todos.filter((t) => !t.isCompleted && t.parentId === null);

  return (
    <>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-full flex flex-col justify-between">
        <div className="flex items-center gap-2 mb-6">
          <Timer className="w-5 h-5 text-violet-400" />
          <h2 className="text-lg font-semibold text-white">Focus Timer</h2>
        </div>

        {/* Timer display */}
        <div className="flex flex-col items-center mb-8">
          <div
            className={cn(
              "relative w-48 h-48 rounded-full flex items-center justify-center mb-4",
              "border-4 transition-colors duration-500",
              isRunning && !isPaused
                ? "border-violet-500 shadow-[0_0_40px_rgba(139,92,246,0.3)]"
                : isPaused
                ? "border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.2)]"
                : "border-white/10"
            )}
          >
            {/* Animated ring */}
            {isRunning && !isPaused && (
              <div className="absolute inset-0 rounded-full border-4 border-violet-500/30 animate-ping" />
            )}
            <div className="text-center">
              <div className="text-4xl font-mono font-bold text-white">
                {formatDuration(displaySeconds)}
              </div>
              {isRunning && (
                <div className="text-xs text-gray-400 mt-1 max-w-[120px] truncate text-center mx-auto">
                  {currentSubject}
                </div>
              )}
            </div>
          </div>

          {/* Status badge */}
          <div
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium",
              isRunning && !isPaused
                ? "bg-violet-500/20 text-violet-300"
                : isPaused
                ? "bg-yellow-500/20 text-yellow-300"
                : "bg-white/5 text-gray-400"
            )}
          >
            {isRunning && !isPaused ? "⏺ Recording" : isPaused ? "⏸ Paused" : "Ready"}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {!isRunning ? (
            <button
              onClick={handleStart}
              id="timer-start"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium hover:from-violet-500 hover:to-indigo-500 transition-all duration-200 shadow-lg shadow-violet-500/25"
            >
              <Play className="w-4 h-4" />
              Start Session
            </button>
          ) : (
            <>
              <button
                onClick={handlePause}
                id="timer-pause"
                className={cn(
                  "flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all duration-200",
                  isPaused
                    ? "bg-violet-600/20 border border-violet-500/30 text-violet-300 hover:bg-violet-600/30"
                    : "bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/30"
                )}
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                {isPaused ? "Resume" : "Pause"}
              </button>
              <button
                onClick={handleStop}
                id="timer-stop"
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 font-medium transition-all duration-200"
              >
                <Square className="w-4 h-4" />
                Stop & Save
              </button>
            </>
          )}
        </div>

        {/* Today total & Daily Average */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex items-center justify-between">
          <div className="text-left">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Today&apos;s Total</p>
            <p className="text-2xl font-bold text-white">
              {Math.floor(todayMinutes / 60)}h {todayMinutes % 60}m
            </p>
          </div>
          {avgDailyMinutes !== undefined && avgDailyMinutes > 0 && (
            <div className="text-right border-l border-white/10 pl-4">
              <p className="text-xs text-violet-400 uppercase tracking-wider mb-1">Daily Average</p>
              <p className="text-lg font-bold text-violet-200">
                {formatMinutes(avgDailyMinutes)}/day
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Subject selection modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#13131f] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-1">Start Focus Session</h3>
            <p className="text-sm text-gray-400 mb-5">Which subject will you study?</p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                From today&apos;s todo
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                id="subject-select"
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-violet-500 transition-all"
              >
                <option value="" className="bg-[#13131f] text-white">
                  — Select subject —
                </option>
                {activeTodos.map((t) => (
                  <option key={t.id} value={t.text} className="bg-[#13131f] text-white">
                    {t.text}
                    {t.targetDetail ? ` (${t.targetDetail})` : ""}
                  </option>
                ))}
                <option value="__custom__" className="bg-[#13131f] text-white">
                  ✏️ Enter custom subject
                </option>
              </select>
            </div>

            {selectedSubject === "__custom__" && (
              <div className="mb-4">
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="e.g. Operating Systems"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-all"
                />
              </div>
            )}

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmStart}
                id="confirm-start"
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium hover:opacity-90 transition-all"
              >
                Start Timer ▶
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
