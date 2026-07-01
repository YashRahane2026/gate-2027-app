"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

export function PingProvider() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;

    const ping = async () => {
      try {
        await fetch("/api/user/ping", { method: "POST" });
      } catch {
        // Silently fail if offline or database is unreachable
      }
    };

    ping(); // Ping immediately on mount
    const interval = setInterval(ping, 60000); // Ping every 60 seconds

    return () => clearInterval(interval);
  }, [status]);

  return null;
}
