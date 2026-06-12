"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  BarChart2,
  BookOpen,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/stats", label: "Stats", icon: BarChart2 },
  { href: "/syllabus", label: "Syllabus", icon: BookOpen },
  { href: "/study-group", label: "Study Group", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-30 md:hidden transition-opacity",
          collapsed ? "opacity-0 pointer-events-none" : "hidden"
        )}
      />

      <aside
        className={cn(
          "fixed left-0 top-12 bottom-0 z-40 flex flex-col transition-all duration-300 ease-in-out",
          "bg-[#0d0d18]/95 backdrop-blur-md border-r border-white/[0.07]",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {/* Logo area */}
        <div className={cn("flex items-center gap-3 px-4 py-5 border-b border-white/[0.07]", collapsed && "justify-center px-2")}>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">GATE 2027</p>
              <p className="text-[10px] text-gray-500 truncate">Prep Tracker</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                id={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                  active
                    ? "bg-violet-600/20 text-violet-300 border border-violet-500/20"
                    : "text-gray-400 hover:text-white hover:bg-white/5",
                  collapsed && "justify-center px-2"
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 flex-shrink-0 transition-colors",
                    active ? "text-violet-400" : "group-hover:text-white"
                  )}
                />
                {!collapsed && <span>{item.label}</span>}
                {active && !collapsed && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className={cn("border-t border-white/[0.07] p-3 space-y-2")}>
          {/* User info */}
          {!collapsed && session?.user && (
            <div className="flex items-center gap-2.5 px-2 py-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {getInitials(session.user.name ?? "U")}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-white truncate">{session.user.name}</p>
                <p className="text-[10px] text-gray-500 truncate">{session.user.email}</p>
              </div>
            </div>
          )}

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            id="logout-button"
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200",
              collapsed && "justify-center"
            )}
            title={collapsed ? "Sign out" : undefined}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#1a1a2e] border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          id="sidebar-toggle"
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}
        </button>
      </aside>
    </>
  );
}
