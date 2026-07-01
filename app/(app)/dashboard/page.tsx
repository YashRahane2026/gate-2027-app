"use client";

import { useEffect, useState, useCallback } from "react";
import { FocusTimer } from "@/components/focus-timer";
import { TodoList } from "@/components/todo-list";
import { getISTDateString } from "@/lib/config";
import { Todo } from "@/types/todo";

const MOTIVATIONAL_QUOTES = [
  "Suffer the pain of discipline or suffer the pain of regret.",
  "Your competition is studying while you are resting. Keep pushing.",
  "Discipline is choosing between what you want now and what you want most.",
  "You don't get what you wish for. You get what you work for.",
  "Pain of discipline is temporary. Pain of regret is permanent.",
  "Excellence is not a singular act, but a habit. You are what you repeatedly do.",
  "Doubt kills more dreams than failure ever will.",
  "The best way to predict your future is to create it.",
  "Success isn't always about greatness. It's about consistency.",
  "You are one decision away from a completely different life.",
  "Push yourself, because no one else is going to do it for you.",
  "It's a slow process, but quitting won't speed it up.",
  "Be stronger than your strongest excuse.",
  "Your future is created by what you do today, not tomorrow.",
  "The only bad study session is the one that didn't happen.",
  "Failure is simply the opportunity to begin again, this time more intelligently.",
  "Make your future self proud.",
  "Action is the foundational key to all success.",
  "Success is the sum of small efforts, repeated day in and day out.",
  "Do something today that your future self will thank you for.",
  "The difference between who you are and who you want to be is what you do.",
  "Don't limit your challenges. Challenge your limits.",
  "Great things never came from comfort zones.",
  "The secret of getting ahead is getting started.",
  "Work hard in silence, let your success be your noise.",
  "Focus on the goal, not the obstacle.",
  "Your energy and persistence conquer all things.",
  "Stop doubting yourself, work hard and make it happen.",
  "Believe you can and you're halfway there.",
  "Wake up with determination. Go to bed with satisfaction.",
  "The harder you work for something, the greater you'll feel when you achieve it."
];

export default function DashboardPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [todayDate] = useState(getISTDateString());
  const [quote, setQuote] = useState("");

  const fetchTodos = useCallback(async () => {
    const res = await fetch("/api/todos");
    if (res.ok) {
      const data = await res.json();
      setTodos(data.todos ?? []);
    }
  }, []);

  const fetchTodayMinutes = useCallback(async () => {
    const res = await fetch("/api/sessions/today");
    if (res.ok) {
      const data = await res.json();
      setTodayMinutes(data.totalMinutes ?? 0);
    }
  }, []);

  useEffect(() => {
    fetchTodos();
    fetchTodayMinutes();
    
    // Choose quote based on day of month to avoid hydration mismatch
    const day = new Date().getDate();
    setQuote(MOTIVATIONAL_QUOTES[(day - 1) % MOTIVATIONAL_QUOTES.length]);
  }, [fetchTodos, fetchTodayMinutes]);

  const handleSessionComplete = () => {
    fetchTodayMinutes();
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight leading-snug bg-gradient-to-r from-violet-400 via-indigo-200 to-white bg-clip-text text-transparent mb-2">
          {quote ? `“${quote}”` : "Loading daily motivation..."}
        </h1>
        <p className="text-gray-400 text-sm">
          {new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            timeZone: "Asia/Kolkata",
          })}
          {" · "} 
          <span className="text-violet-400">Keep pushing, {todayDate}</span>
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FocusTimer
          todos={todos}
          onSessionComplete={handleSessionComplete}
          todayMinutes={todayMinutes}
        />
        <TodoList todos={todos} onUpdate={fetchTodos} />
      </div>
    </div>
  );
}
