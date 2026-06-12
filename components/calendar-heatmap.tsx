"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface DayData {
  totalMinutes: number;
  sessions: {
    subject: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
  }[];
}

interface CalendarHeatmapProps {
  heatmap: Record<string, DayData>;
}

function getColor(minutes: number): string {
  const hours = minutes / 60;
  if (hours >= 6) return "#14532d";
  if (hours >= 5) return "#16a34a";
  if (hours >= 4) return "#22c55e";
  if (hours >= 2) return "#86efac";
  if (hours > 0) return "#d1fae5";
  return "transparent";
}

function formatTime(dt: string): string {
  return new Date(dt).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarHeatmap({ heatmap }: CalendarHeatmapProps) {
  const [selected, setSelected] = useState<{ date: string; data: DayData } | null>(null);

  // Build last 365 days grid
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 364);

  // Pad to start on Sunday
  const firstDow = startDate.getDay();
  const paddedStart = new Date(startDate);
  paddedStart.setDate(paddedStart.getDate() - firstDow);

  const cells: { date: string; inRange: boolean }[] = [];
  const d = new Date(paddedStart);
  while (d <= today) {
    const iso = d.toISOString().split("T")[0];
    cells.push({ date: iso, inRange: d >= startDate });
    d.setDate(d.getDate() + 1);
  }

  const weeks: { date: string; inRange: boolean }[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  // Build month labels
  const monthLabels: { label: string; col: number }[] = [];
  weeks.forEach((week, wi) => {
    const first = week.find((c) => c.inRange);
    if (first) {
      const dt = new Date(first.date + "T00:00:00");
      if (dt.getDate() <= 7) {
        monthLabels.push({ label: MONTHS[dt.getMonth()], col: wi });
      }
    }
  });

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Study Calendar</h3>
        {/* Legend */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Less</span>
          {["transparent", "#d1fae5", "#86efac", "#22c55e", "#16a34a", "#14532d"].map((c) => (
            <div
              key={c}
              className="w-3 h-3 rounded-sm border border-white/10"
              style={{ backgroundColor: c === "transparent" ? "#1a1a2e" : c }}
            />
          ))}
          <span>More</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Month labels */}
          <div className="flex mb-1 ml-8">
            {weeks.map((_, wi) => {
              const m = monthLabels.find((ml) => ml.col === wi);
              return (
                <div key={wi} className="w-4 mr-0.5 text-[10px] text-gray-500 text-center">
                  {m ? m.label : ""}
                </div>
              );
            })}
          </div>

          <div className="flex gap-0.5">
            {/* Day labels */}
            <div className="flex flex-col gap-0.5 mr-1.5">
              {DAYS.map((day, i) => (
                <div key={day} className="h-4 text-[10px] text-gray-600 w-6 flex items-center">
                  {i % 2 === 1 ? day.slice(0, 1) : ""}
                </div>
              ))}
            </div>

            {/* Weeks */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-0.5">
                {week.map((cell) => {
                  const data = heatmap[cell.date];
                  const color = cell.inRange ? getColor(data?.totalMinutes ?? 0) : "transparent";
                  const hasData = data && data.totalMinutes > 0;

                  return (
                    <button
                      key={cell.date}
                      onClick={() => hasData && setSelected({ date: cell.date, data })}
                      className={cn(
                        "w-4 h-4 rounded-sm transition-transform hover:scale-125",
                        !cell.inRange && "opacity-0 pointer-events-none",
                        hasData && "cursor-pointer"
                      )}
                      style={{
                        backgroundColor: color === "transparent" ? "#1a1a2e" : color,
                        border: cell.inRange ? "1px solid rgba(255,255,255,0.08)" : "none",
                      }}
                      title={
                        cell.inRange
                          ? `${cell.date}: ${Math.floor((data?.totalMinutes ?? 0) / 60)}h ${(data?.totalMinutes ?? 0) % 60}m`
                          : undefined
                      }
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Day detail popup */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#13131f] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white font-semibold">{selected.date}</h3>
                <p className="text-sm text-emerald-400">
                  {Math.floor(selected.data.totalMinutes / 60)}h {selected.data.totalMinutes % 60}m total
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-white transition-colors text-xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {selected.data.sessions.map((s, i) => (
                <div key={i} className="bg-white/5 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-white">{s.subject}</span>
                    <span className="text-xs text-violet-400">{s.durationMinutes}m</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {formatTime(s.startTime)} → {formatTime(s.endTime)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
