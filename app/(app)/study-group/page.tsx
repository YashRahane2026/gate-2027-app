export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/prisma";
import { getISTDateString } from "@/lib/config";
import { Leaderboard } from "@/components/leaderboard";
import { StudyGroupChat } from "@/components/study-group-chat";

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
          Collaborate with your group, share study materials, and track real-time study goals! 🏆
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Leaderboard Rankings */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 lg:col-span-1 h-fit">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white font-sans">Leaderboard</h2>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </div>
          </div>
          <Leaderboard initialData={leaderboard} />
        </div>

        {/* Right Side: Group Chat & DM Portal */}
        <div className="lg:col-span-2">
          <StudyGroupChat />
        </div>

      </div>
    </div>
  );
}
