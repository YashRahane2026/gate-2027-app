"use client";

import { useEffect, useState, useRef } from "react";
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
  Puzzle,
  Settings,
  X,
  Loader2,
  Camera,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { useUIStore } from "@/lib/use-ui-store";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/stats", label: "Stats", icon: BarChart2 },
  { href: "/syllabus", label: "Syllabus", icon: BookOpen },
  { href: "/study-group", label: "Study Group", icon: Users },
  { href: "/extension", label: "Extension", icon: Puzzle },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session, update } = useSession();
  const {
    isSidebarCollapsed,
    isMobileSidebarOpen,
    toggleSidebarCollapse,
    setMobileSidebarOpen,
  } = useUIStore();

  // Settings Modal State
  const [showSettings, setShowSettings] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPhoto, setNewPhoto] = useState("");
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [allUsers, setAllUsers] = useState<{ id: string; name: string; email?: string }[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (session?.user) {
      setNewName(session.user.name || "");
      setNewPhoto(session.user.image || "");
    }
  }, [session, showSettings]);

  useEffect(() => {
    const isYashAdmin = session?.user?.email?.toLowerCase() === "yash.dr2004@gmail.com";
    if (showSettings && isYashAdmin) {
      fetch("/api/chat/users")
        .then((res) => res.json())
        .then((data) => {
          setAllUsers(data.users || []);
        })
        .catch((err) => console.error("Error loading directories:", err));
    }
  }, [showSettings, session]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSettingsLoading(true);
    setSettingsError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setNewPhoto(data.url);
      } else {
        const err = await res.json().catch(() => ({}));
        setSettingsError(err.error || "Failed to upload photo.");
      }
    } catch {
      setSettingsError("Connection error while uploading photo.");
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsError("");

    try {
      const res = await fetch("/api/user/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          password: newPassword || undefined,
          image: newPhoto || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Update NextAuth local session state
        await update({
          name: data.user.name,
          image: data.user.image,
        });
        setShowSettings(false);
        setNewPassword("");
        window.location.reload();
      } else {
        const err = await res.json().catch(() => ({}));
        setSettingsError(err.error || "Failed to save settings.");
      }
    } catch {
      setSettingsError("Connection error while saving settings.");
    } finally {
      setSettingsLoading(false);
    }
  };

  const isYashAdmin = session?.user?.email?.toLowerCase() === "yash.dr2004@gmail.com";
  const userDisplayName = session?.user?.name || "";
  const formattedName = (userDisplayName.toLowerCase().includes("yash rahane") || isYashAdmin) && !userDisplayName.includes("(Admin)")
    ? `${userDisplayName} (Admin)`
    : userDisplayName;

  return (
    <>
      {/* Mobile overlay */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-30 md:hidden animate-in fade-in duration-200"
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-12 bottom-0 z-40 flex flex-col transition-all duration-300 ease-in-out",
          "bg-[#0d0d18]/95 backdrop-blur-md border-r border-white/[0.07]",
          "-translate-x-full md:translate-x-0 w-60",
          isMobileSidebarOpen && "translate-x-0 shadow-2xl shadow-black/80",
          isSidebarCollapsed ? "md:w-16" : "md:w-60"
        )}
      >
        {/* Logo area */}
        <div
          className={cn(
            "flex items-center gap-3 px-4 py-5 border-b border-white/[0.07]",
            isSidebarCollapsed && "md:justify-center md:px-2"
          )}
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <div className={cn("min-w-0 transition-opacity", isSidebarCollapsed && "md:opacity-0 md:w-0")}>
            <p className="text-sm font-bold text-white truncate">GATE 2027</p>
            <p className="text-[10px] text-gray-500 truncate">Prep Tracker</p>
          </div>
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
                onClick={() => setMobileSidebarOpen(false)}
                id={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                  active
                    ? "bg-violet-600/20 text-violet-300 border border-violet-500/20"
                    : "text-gray-400 hover:text-white hover:bg-white/5",
                  isSidebarCollapsed && "md:justify-center md:px-2"
                )}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 flex-shrink-0 transition-colors",
                    active ? "text-violet-400" : "group-hover:text-white"
                  )}
                />
                <span className={cn("transition-opacity", isSidebarCollapsed && "md:opacity-0 md:w-0")}>
                  {item.label}
                </span>
                {active && (!isSidebarCollapsed || isMobileSidebarOpen) && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className="border-t border-white/[0.07] p-3 space-y-2">
          {/* User info */}
          {session?.user && (
            <div
              className={cn(
                "flex items-center gap-2.5 px-2 py-2 justify-between",
                isSidebarCollapsed && "md:justify-center md:px-0"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name ?? ""}
                    className="w-8 h-8 rounded-full object-cover border border-white/10 flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {getInitials(session.user.name ?? "U")}
                  </div>
                )}
                <div
                  className={cn(
                    "min-w-0 transition-opacity",
                    isSidebarCollapsed && "md:opacity-0 md:w-0 md:hidden"
                  )}
                >
                  <p className="text-xs font-semibold text-white truncate leading-tight">
                    {formattedName}
                  </p>
                  <p className="text-[10px] text-gray-500 truncate mt-0.5">{session.user.email}</p>
                </div>
              </div>
              
              {/* Settings gear icon inside red square area */}
              {!isSidebarCollapsed && (
                <button
                  type="button"
                  onClick={() => setShowSettings(true)}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all flex-shrink-0"
                  title="Profile Settings"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            id="logout-button"
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200",
              isSidebarCollapsed && "md:justify-center"
            )}
            title={isSidebarCollapsed ? "Sign out" : undefined}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span className={cn("transition-opacity", isSidebarCollapsed && "md:opacity-0 md:w-0")}>
              Sign out
            </span>
          </button>
        </div>

        {/* Collapse toggle (Desktop only) */}
        <button
          onClick={toggleSidebarCollapse}
          className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#1a1a2e] border border-white/10 items-center justify-center text-gray-400 hover:text-white transition-colors z-50"
          id="sidebar-toggle"
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}
        </button>
      </aside>

      {/* Settings Dialog Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#13131f] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 duration-200">
            
            <button 
              type="button"
              onClick={() => setShowSettings(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center mb-6">
              <h2 className="text-md font-bold text-white font-sans mb-4">Edit Profile Settings</h2>
              
              {/* WhatsApp styled circular avatar with upload hover overlay */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="relative w-20 h-20 rounded-full overflow-hidden bg-white/5 border border-white/10 group cursor-pointer"
                title="Change Profile Photo"
              >
                {newPhoto ? (
                  <img src={newPhoto} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xl font-bold text-white">
                    {getInitials(newName || "U")}
                  </div>
                )}
                
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                  <Camera className="w-5 h-5 text-white" />
                  <span className="text-[9px] text-gray-300 font-semibold uppercase">Upload</span>
                </div>
              </div>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoUpload}
                accept="image/*"
                className="hidden"
              />
              {newPhoto && (
                <button
                  type="button"
                  onClick={() => setNewPhoto("")}
                  className="mt-2 text-[10px] font-bold text-rose-400 hover:text-rose-300 transition-colors uppercase tracking-wider font-sans"
                >
                  Remove Photo
                </button>
              )}
            </div>

            {settingsError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl p-3 mb-4 text-center font-sans">
                {settingsError}
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mb-1 font-sans">Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Your display name"
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-all font-sans"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mb-1 font-sans">New Password (Optional)</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters to update"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-all font-sans"
                />
              </div>

              <button
                type="submit"
                disabled={settingsLoading}
                className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-lg shadow-violet-500/20 transition-all flex items-center justify-center gap-2 font-sans"
              >
                {settingsLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "Save Settings"
                )}
              </button>
            </form>

            {/* Admin only monitor directories view */}
            {isYashAdmin && allUsers.length > 0 && (
              <div className="border-t border-white/10 pt-4 mt-4 animate-in fade-in duration-200">
                <h3 className="text-[10px] font-bold text-violet-400 uppercase tracking-wider mb-2 font-sans">
                  Registered Emails Directory ({allUsers.length})
                </h3>
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                  {allUsers.map((u) => {
                    const cleanName = u.name.replace(" (You)", "");
                    return (
                      <div key={u.id} className="flex items-center justify-between text-[9px] font-sans text-gray-300 bg-white/5 p-2 rounded-xl border border-white/5">
                        <span className="font-semibold truncate max-w-[120px]">{cleanName}</span>
                        <span className="text-gray-400 font-mono select-all bg-black/25 px-1.5 py-0.5 rounded border border-white/5">
                          {u.email || "No Email"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
