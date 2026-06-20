import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getISTDateString } from "@/lib/config";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const today = getISTDateString();

  // Get all sessions grouped by date for heatmap (last 365 days)
  const allSessions = await prisma.studySession.findMany({
    where: { userId },
    select: { date: true, durationMinutes: true, subject: true, startTime: true, endTime: true },
    orderBy: { startTime: "asc" },
  });

  // Group by date
  const byDate: Record<string, { totalMinutes: number; sessions: typeof allSessions }> = {};
  for (const s of allSessions) {
    if (!byDate[s.date]) byDate[s.date] = { totalMinutes: 0, sessions: [] };
    byDate[s.date].totalMinutes += s.durationMinutes;
    byDate[s.date].sessions.push(s);
  }

  // Today stats
  const todayData = byDate[today] ?? { totalMinutes: 0, sessions: [] };

  // This week (last 7 days)
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return getISTDateString(d);
  });
  const weekMinutes = weekDates.reduce((sum, d) => sum + (byDate[d]?.totalMinutes ?? 0), 0);

  // This month
  const monthStart = today.slice(0, 7); // "YYYY-MM"
  const monthMinutes = Object.entries(byDate)
    .filter(([d]) => d.startsWith(monthStart))
    .reduce((sum, [, v]) => sum + v.totalMinutes, 0);

  // Streak calculation
  const sortedDates = Object.keys(byDate)
    .filter((d) => byDate[d].totalMinutes > 0)
    .sort()
    .reverse();

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate: string | null = null;

  for (const d of sortedDates) {
    if (!prevDate) {
      // Check if today or yesterday
      const diff = Math.floor(
        (new Date(today).getTime() - new Date(d).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diff <= 1) {
        tempStreak = 1;
        currentStreak = 1;
      } else {
        break;
      }
    } else {
      const diff = Math.floor(
        (new Date(prevDate).getTime() - new Date(d).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diff === 1) {
        tempStreak++;
        if (currentStreak > 0) currentStreak = tempStreak;
      } else {
        break;
      }
    }
    prevDate = d;
    longestStreak = Math.max(longestStreak, tempStreak);
  }

  // Recalculate longest streak properly
  const allDatesAsc = Object.keys(byDate)
    .filter((d) => byDate[d].totalMinutes > 0)
    .sort();
  let maxStreak = 0;
  let runStreak = 0;
  let lastD: string | null = null;
  for (const d of allDatesAsc) {
    if (!lastD) {
      runStreak = 1;
    } else {
      const diff = Math.floor(
        (new Date(d).getTime() - new Date(lastD).getTime()) / (1000 * 60 * 60 * 24)
      );
      runStreak = diff === 1 ? runStreak + 1 : 1;
    }
    maxStreak = Math.max(maxStreak, runStreak);
    lastD = d;
  }

  // Subject breakdown for pie chart
  const subjectMap: Record<string, number> = {};
  for (const s of allSessions) {
    subjectMap[s.subject] = (subjectMap[s.subject] ?? 0) + s.durationMinutes;
  }
  const subjectBreakdown = Object.entries(subjectMap).map(([subject, minutes]) => ({
    subject,
    minutes,
  }));

  // Weekly bar chart (last 7 days)
  const weeklyChart = weekDates.reverse().map((d) => ({
    date: d,
    minutes: byDate[d]?.totalMinutes ?? 0,
    label: new Date(d + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "short" }),
  }));

  // Monthly line chart (last 30 days)
  const monthlyChart = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const dateStr = getISTDateString(d);
    return {
      date: dateStr,
      minutes: byDate[dateStr]?.totalMinutes ?? 0,
      label: dateStr.slice(5), // "MM-DD"
    };
  });

  return NextResponse.json({
    today: { totalMinutes: todayData.totalMinutes, sessions: todayData.sessions },
    weekMinutes,
    monthMinutes,
    totalMinutes: allSessions.reduce((sum, s) => sum + s.durationMinutes, 0),
    currentStreak,
    longestStreak: maxStreak,
    heatmap: byDate,
    subjectBreakdown,
    weeklyChart,
    monthlyChart,
  });
}
