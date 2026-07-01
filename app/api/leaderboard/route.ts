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
    .filter((u) => u.todayMinutes > 0 || u.id === session.user.id)
    .sort((a, b) => b.todayMinutes - a.todayMinutes)
    .map((u, idx) => ({ ...u, rank: idx + 1 }));

  return NextResponse.json({ leaderboard, date: today });
}
