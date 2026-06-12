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
      sessions: {
        where: { date: today },
        select: { durationMinutes: true },
      },
    },
  });

  const leaderboard = users
    .map((u) => ({
      id: u.id,
      name: u.name,
      image: u.image,
      todayMinutes: u.sessions.reduce((sum, s) => sum + s.durationMinutes, 0),
    }))
    .filter((u) => u.todayMinutes > 0 || u.id === session.user.id)
    .sort((a, b) => b.todayMinutes - a.todayMinutes)
    .map((u, idx) => ({ ...u, rank: idx + 1 }));

  return NextResponse.json({ leaderboard, date: today });
}
