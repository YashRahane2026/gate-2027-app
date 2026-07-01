import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getISTDateString } from "@/lib/config";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = getISTDateString();

  // Get all users with their today's study time
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      image: true,
      lastActive: true,
      focusState: {
        select: {
          isRunning: true,
        },
      },
      sessions: {
        select: {
          date: true,
          durationMinutes: true,
        },
      },
    },
  });

  const leaderboard = users
    .map((u) => {
      const todayMinutes = u.sessions
        .filter((s) => s.date === today)
        .reduce((sum, s) => sum + s.durationMinutes, 0);

      const totalMinutes = u.sessions
        .reduce((sum, s) => sum + s.durationMinutes, 0);

      const isOnline =
        (u.lastActive && (Date.now() - new Date(u.lastActive).getTime()) < 3 * 60 * 1000) ||
        (u.focusState?.isRunning === true);

      return {
        id: u.id,
        name: u.name,
        image: u.image,
        isOnline: !!isOnline,
        todayMinutes,
        totalMinutes,
      };
    })
    .sort((a, b) => {
      if (b.todayMinutes !== a.todayMinutes) {
        return b.todayMinutes - a.todayMinutes;
      }
      if (b.totalMinutes !== a.totalMinutes) {
        return b.totalMinutes - a.totalMinutes;
      }
      const aVal = a.isOnline ? 1 : 0;
      const bVal = b.isOnline ? 1 : 0;
      return bVal - aVal;
    })
    .map((u, idx) => ({ ...u, rank: idx + 1 }));

  return NextResponse.json({ leaderboard, date: today });
}
