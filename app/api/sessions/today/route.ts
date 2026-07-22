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

  const todayResult = await prisma.studySession.aggregate({
    where: { userId, date: today },
    _sum: { durationMinutes: true },
  });
  const totalMinutes = todayResult._sum.durationMinutes ?? 0;

  // Calculate active days daily average
  const allSessions = await prisma.studySession.findMany({
    where: { userId },
    select: { date: true, durationMinutes: true },
  });

  const byDate: Record<string, number> = {};
  let grandTotalMinutes = 0;
  for (const s of allSessions) {
    byDate[s.date] = (byDate[s.date] || 0) + s.durationMinutes;
    grandTotalMinutes += s.durationMinutes;
  }
  const activeDaysCount = Object.keys(byDate).filter((d) => byDate[d] > 0).length;
  const avgMinutesActiveDays = activeDaysCount > 0 ? Math.round(grandTotalMinutes / activeDaysCount) : 0;

  return NextResponse.json({
    totalMinutes,
    date: today,
    avgMinutesActiveDays,
    formattedActiveAvg: formatMinutes(avgMinutesActiveDays),
    activeDaysCount,
  });
}
