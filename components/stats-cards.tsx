"use client";

import { Clock, TrendingUp, Calendar, Flame, Trophy, Award, Activity } from "lucide-react";
import { formatMinutes } from "@/lib/utils";
import { AveragePerDayData } from "./daily-average-card";

interface StatsCardsProps {
  todayMinutes: number;
  weekMinutes: number;
  monthMinutes: number;
  currentStreak: number;
  longestStreak: number;
  totalMinutes: number;
  averagePerDay?: AveragePerDayData;
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
  glow: string;
}

function StatCard({ icon: Icon, label, value, sub, color, glow }: StatCardProps) {
  return (
    <div className={`bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all duration-200 group relative overflow-hidden`}>
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${glow}`} />
      <div className="relative">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-4`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1 truncate">{sub}</p>}
      </div>
    </div>
  );
}

export function StatsCards({
  todayMinutes,
  weekMinutes,
  monthMinutes,
  currentStreak,
  longestStreak,
  totalMinutes,
  averagePerDay,
}: StatsCardsProps) {
  const activeAvgMinutes = averagePerDay?.activeDaysMinutes ?? 0;
  const activeDaysCount = averagePerDay?.activeDaysCount ?? 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-4">
      <StatCard
        icon={Clock}
        label="Today"
        value={formatMinutes(todayMinutes)}
        color="bg-violet-600/80"
        glow="bg-gradient-to-br from-violet-600/5 to-transparent"
      />
      <StatCard
        icon={Activity}
        label="Daily Average"
        value={activeAvgMinutes > 0 ? `${formatMinutes(activeAvgMinutes)}/day` : "0m/day"}
        sub={activeDaysCount > 0 ? `${activeDaysCount} active days` : "No history"}
        color="bg-indigo-600/80"
        glow="bg-gradient-to-br from-indigo-600/5 to-transparent"
      />
      <StatCard
        icon={Calendar}
        label="This Week"
        value={formatMinutes(weekMinutes)}
        color="bg-blue-600/80"
        glow="bg-gradient-to-br from-blue-600/5 to-transparent"
      />
      <StatCard
        icon={TrendingUp}
        label="This Month"
        value={formatMinutes(monthMinutes)}
        color="bg-emerald-600/80"
        glow="bg-gradient-to-br from-emerald-600/5 to-transparent"
      />
      <StatCard
        icon={Flame}
        label="Current Streak"
        value={`${currentStreak}d`}
        sub={currentStreak > 0 ? "🔥 Keep it up!" : "Start today!"}
        color="bg-orange-600/80"
        glow="bg-gradient-to-br from-orange-600/5 to-transparent"
      />
      <StatCard
        icon={Trophy}
        label="Best Streak"
        value={`${longestStreak}d`}
        color="bg-yellow-600/80"
        glow="bg-gradient-to-br from-yellow-600/5 to-transparent"
      />
      <StatCard
        icon={Award}
        label="Total Study"
        value={formatMinutes(totalMinutes)}
        color="bg-pink-600/80"
        glow="bg-gradient-to-br from-pink-600/5 to-transparent"
      />
    </div>
  );
}
