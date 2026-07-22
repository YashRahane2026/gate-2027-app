"use client";

import { Activity, Zap, TrendingUp, Calendar, Clock, Award, Target } from "lucide-react";
import { formatMinutes } from "@/lib/utils";

export interface AveragePerDayData {
  activeDaysMinutes: number;
  activeDaysCount: number;
  overallSpanMinutes: number;
  daysSpan: number;
  last7DaysMinutes: number;
  last30DaysMinutes: number;
  formattedActive: string;
  formattedOverall: string;
  formatted7d: string;
  formatted30d: string;
  hoursActiveDays: number;
  hoursOverallSpan: number;
  hoursLast7Days: number;
  hoursLast30Days: number;
}

interface DailyAverageCardProps {
  averagePerDay?: AveragePerDayData;
  todayMinutes: number;
}

export function DailyAverageCard({ averagePerDay, todayMinutes }: DailyAverageCardProps) {
  if (!averagePerDay) return null;

  const {
    activeDaysMinutes,
    activeDaysCount,
    daysSpan,
    formattedActive,
    formattedOverall,
    formatted7d,
    formatted30d,
    hoursActiveDays,
  } = averagePerDay;

  // Comparison today vs active daily average
  const isAboveAvg = todayMinutes >= activeDaysMinutes && activeDaysMinutes > 0;
  const progressPct = activeDaysMinutes > 0 ? Math.min(100, Math.round((todayMinutes / activeDaysMinutes) * 100)) : 0;
  const diffMinutes = Math.abs(todayMinutes - activeDaysMinutes);

  // Projected monthly hours based on active daily pace (assuming ~30 days)
  const projectedMonthlyHours = Math.round((activeDaysMinutes * 30) / 60);

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden space-y-6">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      {/* Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4 relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              Average Hours / Day
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                Past Data Analytics
              </span>
            </h2>
            <p className="text-xs text-gray-400">
              Calculated from your past study history across {activeDaysCount} active days
            </p>
          </div>
        </div>

        {/* Quick Badge */}
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl self-start sm:self-auto">
          <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="text-xs font-semibold text-white">
            Pace: {formattedActive} / active day
          </span>
        </div>
      </div>

      {/* 4 Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
        {/* Card 1: Active Days Average */}
        <div className="bg-white/5 border border-violet-500/20 rounded-xl p-4 hover:border-violet-500/40 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-violet-300 uppercase tracking-wider">Active Days Avg</span>
            <Clock className="w-4 h-4 text-violet-400" />
          </div>
          <p className="text-2xl font-extrabold text-white">{formattedActive}</p>
          <p className="text-[11px] text-gray-400 mt-1">
            Across {activeDaysCount} study {activeDaysCount === 1 ? "day" : "days"}
          </p>
        </div>

        {/* Card 2: Past 7 Days Daily Pace */}
        <div className="bg-white/5 border border-blue-500/20 rounded-xl p-4 hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-blue-300 uppercase tracking-wider">Past 7d Pace</span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-extrabold text-white">{formatted7d}</p>
          <p className="text-[11px] text-gray-400 mt-1">
            Daily avg over last 7 days
          </p>
        </div>

        {/* Card 3: Past 30 Days Daily Pace */}
        <div className="bg-white/5 border border-emerald-500/20 rounded-xl p-4 hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-emerald-300 uppercase tracking-wider">Past 30d Pace</span>
            <Calendar className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-extrabold text-white">{formatted30d}</p>
          <p className="text-[11px] text-gray-400 mt-1">
            Daily avg over last 30 days
          </p>
        </div>

        {/* Card 4: All-Time Calendar Span Average */}
        <div className="bg-white/5 border border-amber-500/20 rounded-xl p-4 hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-amber-300 uppercase tracking-wider">Overall Calendar Avg</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-extrabold text-white">{formattedOverall}</p>
          <p className="text-[11px] text-gray-400 mt-1">
            Across all {daysSpan} days since start
          </p>
        </div>
      </div>

      {/* Today vs Daily Average Progress Meter */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 relative space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-300 font-medium flex items-center gap-1.5">
            <Target className="w-4 h-4 text-violet-400" />
            Today&apos;s Progress vs. Active Daily Average
          </span>
          <span className="font-bold text-white">
            {formatMinutes(todayMinutes)} / {formattedActive} ({progressPct}%)
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/5">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              isAboveAvg
                ? "bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                : "bg-gradient-to-r from-violet-600 to-indigo-500"
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Callout status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
          <p className="text-gray-300">
            {isAboveAvg ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                🔥 Outstanding! You are {formatMinutes(diffMinutes)} above your historical daily average today!
              </span>
            ) : activeDaysMinutes > 0 ? (
              <span className="text-gray-400">
                Study <strong className="text-violet-300">{formatMinutes(diffMinutes)}</strong> more today to reach your historical daily pace ({formattedActive}).
              </span>
            ) : (
              <span className="text-gray-400">Log your first study session today to start building your daily average pace!</span>
            )}
          </p>

          {hoursActiveDays > 0 && (
            <span className="text-gray-400 text-right font-mono text-[11px]">
              Est. Monthly Pace: <strong className="text-white">{projectedMonthlyHours} hrs/month</strong>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
