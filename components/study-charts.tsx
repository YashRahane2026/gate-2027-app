"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";

const PIE_COLORS = [
  "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#ec4899", "#6366f1", "#14b8a6", "#f97316", "#84cc16",
  "#06b6d4", "#a855f7", "#22c55e", "#fb923c", "#e879f9",
];

interface TooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    const minutes = payload[0]?.value ?? 0;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return (
      <div className="bg-[#1a1a2e] border border-white/10 rounded-xl px-3 py-2 text-sm shadow-xl">
        <p className="text-gray-400 text-xs">{label}</p>
        <p className="text-white font-semibold">
          {h > 0 ? `${h}h ${m}m` : `${m}m`}
        </p>
      </div>
    );
  }
  return null;
};

interface StudyChartsProps {
  weeklyChart: { date: string; minutes: number; label: string }[];
  monthlyChart: { date: string; minutes: number; label: string }[];
  subjectBreakdown: { subject: string; minutes: number }[];
}

type Filter = "weekly" | "monthly" | "alltime";

export function StudyCharts({ weeklyChart, monthlyChart, subjectBreakdown }: StudyChartsProps) {
  const [filter, setFilter] = useState<Filter>("weekly");

  const filters: { key: Filter; label: string }[] = [
    { key: "weekly", label: "Weekly" },
    { key: "monthly", label: "Monthly" },
    { key: "alltime", label: "All Time" },
  ];

  const weeklyHours = weeklyChart.map((d) => ({
    ...d,
    hours: parseFloat((d.minutes / 60).toFixed(1)),
  }));
  const monthlyHours = monthlyChart.map((d) => ({
    ...d,
    hours: parseFloat((d.minutes / 60).toFixed(1)),
  }));

  return (
    <div className="space-y-6">
      {/* Filter tabs */}
      <div className="flex gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            id={`chart-filter-${f.key}`}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
              filter === f.key
                ? "bg-violet-600/20 text-violet-300 border border-violet-500/30"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        {(filter === "weekly" || filter === "alltime") && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">
              {filter === "weekly" ? "Last 7 Days" : "Weekly Overview"}
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyHours}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="label" tick={{ fill: "#6b7280", fontSize: 11 }} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} unit="h" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="hours" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Line Chart */}
        {(filter === "monthly" || filter === "alltime") && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Last 30 Days</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyHours}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#6b7280", fontSize: 10 }}
                  interval={4}
                />
                <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} unit="h" />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="hours"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "#10b981" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Pie Chart */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Subject Breakdown</h3>
          {subjectBreakdown.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-gray-500 text-sm">
              No sessions yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={subjectBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="minutes"
                  nameKey="subject"
                >
                  {subjectBreakdown.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={((v: number) => `${Math.floor(v / 60)}h ${v % 60}m`) as any}
                  contentStyle={{
                    background: "#1a1a2e",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "#fff",
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span style={{ color: "#9ca3af", fontSize: "11px" }}>
                      {value.length > 20 ? value.slice(0, 20) + "…" : value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
