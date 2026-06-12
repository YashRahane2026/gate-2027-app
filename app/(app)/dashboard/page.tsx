"use client";

import { useEffect, useState, useCallback } from "react";
import { FocusTimer } from "@/components/focus-timer";
import { TodoList } from "@/components/todo-list";
import { getISTDateString } from "@/lib/config";
import { Todo } from "@/types/todo";

export default function DashboardPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [todayDate] = useState(getISTDateString());

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
  }, [fetchTodos, fetchTodayMinutes]);

  const handleSessionComplete = () => {
    fetchTodayMinutes();
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Dashboard</h1>
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
