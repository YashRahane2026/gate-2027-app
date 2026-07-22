"use client";

import { useEffect, useState } from "react";
import { StatsCards } from "@/components/stats-cards";
import { DailyAverageCard, AveragePerDayData } from "@/components/daily-average-card";
import { CalendarHeatmap } from "@/components/calendar-heatmap";
import { StudyCharts } from "@/components/study-charts";

interface DayData {
  totalMinutes: number;
  sessions: {
    subject: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
  }[];
}

interface StatsData {
  today: DayData;
  weekMinutes: number;
  monthMinutes: number;
  totalMinutes: number;
  currentStreak: number;
  longestStreak: number;
  heatmap: Record<string, DayData>;
  subjectBreakdown: { subject: string; minutes: number }[];
  weeklyChart: { date: string; minutes: number; label: string }[];
  monthlyChart: { date: string; minutes: number; label: string }[];
  averagePerDay?: AveragePerDayData;
}

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => setStats(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-white/10 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-28 bg-white/10 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-48 bg-white/10 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!stats) return null;

  // Calculate daily subject breakdown from today's sessions
  const dailyBreakdownMap: Record<string, number> = {};
  stats.today.sessions.forEach((s) => {
    dailyBreakdownMap[s.subject] = (dailyBreakdownMap[s.subject] || 0) + s.durationMinutes;
  });
  const dailyBreakdown = Object.entries(dailyBreakdownMap).map(([subject, minutes]) => ({
    subject,
    minutes
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-1">Stats & Progress</h1>
        <p className="text-gray-400 text-sm">Your study analytics, historical daily averages, and performance overview</p>
      </div>

      <StatsCards
        todayMinutes={stats.today.totalMinutes}
        weekMinutes={stats.weekMinutes}
        monthMinutes={stats.monthMinutes}
        currentStreak={stats.currentStreak}
        longestStreak={stats.longestStreak}
        totalMinutes={stats.totalMinutes}
        averagePerDay={stats.averagePerDay}
      />

      <DailyAverageCard
        averagePerDay={stats.averagePerDay}
        todayMinutes={stats.today.totalMinutes}
      />

      <CalendarHeatmap heatmap={stats.heatmap} />

      <StudyCharts
        weeklyChart={stats.weeklyChart}
        monthlyChart={stats.monthlyChart}
        subjectBreakdown={stats.subjectBreakdown}
        dailyBreakdown={dailyBreakdown}
      />
    </div>
  );
}
