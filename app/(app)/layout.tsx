"use client";

import { CountdownBar } from "@/components/countdown-bar";
import { Sidebar } from "@/components/sidebar";
import { useUIStore } from "@/lib/use-ui-store";
import { cn } from "@/lib/utils";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isSidebarCollapsed } = useUIStore();

  return (
    <>
      <CountdownBar />
      <div className="flex min-h-screen pt-12">
        <Sidebar />
        <main
          className={cn(
            "flex-1 transition-all duration-300 min-h-screen",
            // Mobile layout has no sidebar padding
            "pl-0",
            // Desktop layout padding responds to sidebar collapse state
            isSidebarCollapsed ? "md:pl-16" : "md:pl-60"
          )}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
