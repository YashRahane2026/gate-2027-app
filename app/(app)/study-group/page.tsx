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

  return users
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Leaderboard Rankings */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 lg:col-span-5 h-fit">
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
        <div className="lg:col-span-7">
          <StudyGroupChat />
        </div>

      </div>
    </div>
  );
}
