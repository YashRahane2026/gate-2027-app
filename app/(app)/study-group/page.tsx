export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/prisma";
import { getISTDateString } from "@/lib/config";
import { Leaderboard } from "@/components/leaderboard";

async function getLeaderboardData() {
  const today = getISTDateString();

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

  return users
    .map((u) => ({
      id: u.id,
      name: u.name,
      image: u.image,
      todayMinutes: u.sessions.reduce((s, x) => s + x.durationMinutes, 0),
    }))
    .sort((a, b) => b.todayMinutes - a.todayMinutes)
    .map((u, i) => ({ ...u, rank: i + 1 }));
}

export default async function StudyGroupPage() {
  const leaderboard = await getLeaderboardData();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-1">Study Group</h1>
        <p className="text-gray-400 text-sm">
          Today&apos;s leaderboard — updated in real-time. Stay on top! 🏆
        </p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Today&apos;s Rankings</h2>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </div>
        </div>
        <Leaderboard initialData={leaderboard} />
      </div>
    </div>
  );
}
