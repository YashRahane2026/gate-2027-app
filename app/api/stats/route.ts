import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getISTDateString } from "@/lib/config";
import { formatMinutes } from "@/lib/utils";

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

  // This week (current calendar week: Monday to Sunday)
  const now = new Date();
  const istDate = new Date(now.getTime() + 330 * 60 * 1000); // 330 mins = IST offset
  const istDay = istDate.getUTCDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
  const daysSinceMonday = istDay === 0 ? 6 : istDay - 1;
  
  const mondayDate = new Date(istDate.getTime());
  mondayDate.setUTCDate(mondayDate.getUTCDate() - daysSinceMonday);

  const weekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(mondayDate.getTime());
    d.setUTCDate(d.getUTCDate() + i);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    weekDates.push(`${yyyy}-${mm}-${dd}`);
  }
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

  // Weekly bar chart (current calendar week: Monday to Sunday)
  const weeklyChart = weekDates.map((d) => ({
    date: d,
    minutes: byDate[d]?.totalMinutes ?? 0,
    label: new Date(d + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
  }));

  // Monthly line chart (current calendar month)
  const year = istDate.getUTCFullYear();
  const month = istDate.getUTCMonth(); // 0-indexed
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  const monthlyChart = Array.from({ length: totalDaysInMonth }, (_, i) => {
    const dayNum = i + 1;
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(dayNum).padStart(2, "0");
    const dateStr = `${year}-${mm}-${dd}`;
    return {
      date: dateStr,
      minutes: byDate[dateStr]?.totalMinutes ?? 0,
      label: `${mm}-${dd}`,
    };
  });

  // Calculate Average Hours / Day metrics based on past data
  const activeDaysList = Object.keys(byDate).filter((d) => byDate[d].totalMinutes > 0);
  const activeDaysCount = activeDaysList.length;
  const totalMinutesAll = allSessions.reduce((sum, s) => sum + s.durationMinutes, 0);

  const earliestDate = activeDaysList.sort()[0] || today;
  const firstDateObj = new Date(earliestDate + "T00:00:00Z");
  const todayDateObj = new Date(today + "T00:00:00Z");
  const daysSpan = Math.max(1, Math.floor((todayDateObj.getTime() - firstDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  const avgMinutesActiveDays = activeDaysCount > 0 ? Math.round(totalMinutesAll / activeDaysCount) : 0;
  const avgMinutesOverallSpan = Math.round(totalMinutesAll / daysSpan);
  const avgMinutesLast7Days = Math.round(weekMinutes / 7);

  // Last 30 days total
  const thirtyDaysAgoObj = new Date(todayDateObj.getTime() - 29 * 24 * 60 * 60 * 1000);
  let last30DaysTotalMinutes = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgoObj.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().slice(0, 10);
    last30DaysTotalMinutes += byDate[dateStr]?.totalMinutes ?? 0;
  }
  const avgMinutesLast30Days = Math.round(last30DaysTotalMinutes / 30);

  const averagePerDay = {
    activeDaysMinutes: avgMinutesActiveDays,
    activeDaysCount,
    overallSpanMinutes: avgMinutesOverallSpan,
    daysSpan,
    last7DaysMinutes: avgMinutesLast7Days,
    last30DaysMinutes: avgMinutesLast30Days,
    formattedActive: formatMinutes(avgMinutesActiveDays),
    formattedOverall: formatMinutes(avgMinutesOverallSpan),
    formatted7d: formatMinutes(avgMinutesLast7Days),
    formatted30d: formatMinutes(avgMinutesLast30Days),
    hoursActiveDays: parseFloat((avgMinutesActiveDays / 60).toFixed(1)),
    hoursOverallSpan: parseFloat((avgMinutesOverallSpan / 60).toFixed(1)),
    hoursLast7Days: parseFloat((avgMinutesLast7Days / 60).toFixed(1)),
    hoursLast30Days: parseFloat((avgMinutesLast30Days / 60).toFixed(1)),
  };

  return NextResponse.json({
    today: { totalMinutes: todayData.totalMinutes, sessions: todayData.sessions },
    weekMinutes,
    monthMinutes,
    totalMinutes: totalMinutesAll,
    currentStreak,
    longestStreak: maxStreak,
    heatmap: byDate,
    subjectBreakdown,
    weeklyChart,
    monthlyChart,
    averagePerDay,
  });
}
