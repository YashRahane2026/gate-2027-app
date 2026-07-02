"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getPusherClient, PUSHER_CHANNELS, PUSHER_EVENTS } from "@/lib/pusher";
import { getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/use-ui-store";

interface LeaderboardEntry {
  id: string;
  name: string;
  image: string | null;
  todayMinutes: number;
  rank: number;
  isOnline?: boolean;
  totalMinutes?: number;
}

interface LeaderboardProps {
  initialData: LeaderboardEntry[];
}

const MEDAL = ["🥇", "🥈", "🥉"];

export function Leaderboard({ initialData }: LeaderboardProps) {
  const { data: session } = useSession();
  const [entries, setEntries] = useState<LeaderboardEntry[]>(initialData);
  const { setRedirectToDmUserId } = useUIStore();
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const refetch = async () => {
    try {
      const res = await fetch("/api/leaderboard");
      if (res.ok) {
        const data = await res.json();
        setEntries(data.leaderboard ?? []);
        setLastUpdated(new Date());
      }
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    let pusherClient: ReturnType<typeof getPusherClient> | null = null;
    try {
      pusherClient = getPusherClient();
      const channel = pusherClient.subscribe(PUSHER_CHANNELS.STUDY_GROUP);
      channel.bind(PUSHER_EVENTS.SESSION_COMPLETED, () => {
        refetch();
      });
    } catch {
      // Pusher not configured — that's OK
    }

    return () => {
      if (pusherClient) {
        try {
          pusherClient.unsubscribe(PUSHER_CHANNELS.STUDY_GROUP);
        } catch {}
      }
    };
  }, []);

  return (
    <div className="space-y-3">
      {entries.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-2xl mb-2">🏆</p>
          <p>No study sessions today yet. Be the first!</p>
        </div>
      )}

      {entries.map((entry) => {
        const isMe = entry.id === session?.user?.id;
        const hours = Math.floor(entry.todayMinutes / 60);
        const mins = entry.todayMinutes % 60;
        const isOnline = entry.isOnline;

        return (
          <div
            key={entry.id}
            className={cn(
              "flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200",
              isMe
                ? "border-violet-500/30 bg-violet-500/10"
                : "border-white/10 bg-white/5 hover:border-white/20"
            )}
          >
            {/* Rank */}
            <div className="w-8 text-center flex-shrink-0">
              {entry.rank <= 3 ? (
                <span className="text-xl">{MEDAL[entry.rank - 1]}</span>
              ) : (
                <span className="text-gray-500 text-sm font-bold">#{entry.rank}</span>
              )}
            </div>

            {/* Avatar */}
            <button
              type="button"
              onClick={() => setRedirectToDmUserId(entry.id)}
              className="relative flex-shrink-0 group active:scale-95 transition-transform"
              title={`Message ${entry.name}`}
            >
              {entry.image ? (
                <img
                  src={entry.image}
                  alt={entry.name}
                  className="w-10 h-10 rounded-full object-cover border border-white/10 group-hover:border-violet-500 transition-colors"
                />
              ) : (
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors group-hover:bg-violet-600/30",
                    isMe
                      ? "bg-gradient-to-br from-violet-500 to-indigo-600 text-white"
                      : "bg-gradient-to-br from-gray-600 to-gray-700 text-gray-200"
                  )}
                >
                  {getInitials(entry.name)}
                </div>
              )}
              {/* Online indicator */}
              {isOnline && (
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0a0a0f]" />
              )}
            </button>

            {/* Name */}
            <div className="flex-1 min-w-0">
              <button
                type="button"
                onClick={() => setRedirectToDmUserId(entry.id)}
                className="text-left font-sans block group"
                title={`Message ${entry.name}`}
              >
                <p className={cn("text-sm font-semibold truncate group-hover:text-violet-400 transition-colors", isMe ? "text-violet-200" : "text-white")}>
                  {entry.name.toLowerCase().includes("yash rahane") && !entry.name.includes("(Admin)")
                    ? `${entry.name} (Admin)`
                    : entry.name}
                  {isMe && (
                    <span className="ml-2 text-[10px] text-violet-400 bg-violet-500/20 px-1.5 py-0.5 rounded-full">
                      You
                    </span>
                  )}
                </p>
              </button>
              <p className="text-xs text-gray-400">
                {entry.todayMinutes > 0 ? `${hours}h ${mins}m today` : "No sessions yet"}
                <span className="text-[10px] text-violet-400/70 block sm:inline sm:ml-2">
                  • Total: {entry.totalMinutes ? (entry.totalMinutes / 60).toFixed(1) : "0.0"} hrs
                </span>
              </p>
            </div>

            {/* Hours bar */}
            <div className="hidden sm:flex items-center gap-3 flex-shrink-0 w-32">
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700",
                    entry.rank === 1
                      ? "bg-gradient-to-r from-yellow-400 to-orange-400"
                      : isMe
                      ? "bg-gradient-to-r from-violet-500 to-indigo-500"
                      : "bg-gradient-to-r from-blue-500 to-cyan-500"
                  )}
                  style={{
                    width: `${Math.min(100, (entry.todayMinutes / (entries[0]?.todayMinutes || 1)) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-sm font-bold text-white w-12 text-right">
                {hours}h{mins > 0 ? `${mins}m` : ""}
              </span>
            </div>
          </div>
        );
      })}

      <p className="text-xs text-gray-600 text-right pt-2">
        Last updated: {lastUpdated.toLocaleTimeString()}
      </p>
    </div>
  );
}
