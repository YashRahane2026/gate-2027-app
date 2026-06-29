"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getPusherClient } from "@/lib/pusher";
import { getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Send, Link2, MessageSquare, Users, FileText, ChevronLeft, ArrowRight } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface User {
  id: string;
  name: string;
  image: string | null;
}

interface Message {
  id: string;
  userId: string;
  text: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    image: string | null;
  };
}

interface DMMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    image: string | null;
  };
  receiver: {
    id: string;
    name: string;
    image: string | null;
  };
}

export function StudyGroupChat() {
  const { data: session } = useSession();
  const { toast } = useToast();
  
  // Navigation / UI State
  const [activeTab, setActiveTab] = useState<"group" | "dm">("group");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Data State
  const [users, setUsers] = useState<User[]>([]);
  const [groupMessages, setGroupMessages] = useState<Message[]>([]);
  const [dmMessages, setDmMessages] = useState<DMMessage[]>([]);
  
  // Inputs
  const [inputText, setInputText] = useState("");
  const [showShareForm, setShowShareForm] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [shareName, setShareName] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingDMs, setLoadingDMs] = useState(false);
  
  const myUserId = session?.user?.id;

  // Fetch Users & Group Messages
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, messagesRes] = await Promise.all([
          fetch("/api/chat/users"),
          fetch("/api/chat")
        ]);
        
        if (usersRes.ok) {
          const uData = await usersRes.json();
          setUsers(uData.users || []);
        }
        
        if (messagesRes.ok) {
          const mData = await messagesRes.json();
          setGroupMessages(mData.messages || []);
        }
      } catch (err) {
        console.error("Failed to load chat data", err);
      } finally {
        setLoading(false);
      }
    };

    if (myUserId) {
      fetchData();
    }
  }, [myUserId]);

  // Fetch DMs when user is selected
  useEffect(() => {
    if (!selectedUser || !myUserId) return;

    const fetchDMs = async () => {
      setLoadingDMs(true);
      try {
        const res = await fetch(`/api/chat/dm?userId=${selectedUser.id}`);
        if (res.ok) {
          const data = await res.json();
          setDmMessages(data.messages || []);
        }
      } catch (err) {
        console.error("Failed to fetch DMs", err);
      } finally {
        setLoadingDMs(false);
      }
    };

    fetchDMs();
  }, [selectedUser, myUserId]);

  // Pusher subscriptions
  useEffect(() => {
    if (!myUserId) return;

    let pusherClient: ReturnType<typeof getPusherClient> | null = null;
    try {
      pusherClient = getPusherClient();

      // Subscribe to group chat
      const groupChannel = pusherClient.subscribe("chat");
      groupChannel.bind("message", (newMessage: Message) => {
        setGroupMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });
      });

      // Subscribe to personal DMs channel
      const personalChannel = pusherClient.subscribe(`user-${myUserId}`);
      personalChannel.bind("dm", (newDM: DMMessage) => {
        // Append DM if it belongs to active chat or updates unread counts
        setDmMessages((prev) => {
          if (prev.some((m) => m.id === newDM.id)) return prev;
          
          const isRelated = 
            (newDM.senderId === selectedUser?.id && newDM.receiverId === myUserId) ||
            (newDM.senderId === myUserId && newDM.receiverId === selectedUser?.id);

          if (isRelated) {
            return [...prev, newDM];
          }
          return prev;
        });

        // Notify user if message is from someone else and not selected
        if (newDM.senderId !== selectedUser?.id) {
          toast({
            title: `New DM from ${newDM.sender.name}`,
            description: newDM.text || "Shared a link/material",
          });
        }
      });
    } catch (err) {
      console.error("Pusher setup error in chat component:", err);
    }

    return () => {
      if (pusherClient) {
        try {
          pusherClient.unsubscribe("chat");
          pusherClient.unsubscribe(`user-${myUserId}`);
        } catch {}
      }
    };
  }, [myUserId, selectedUser, toast]);

  // Send Message / Material
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !shareUrl.trim()) return;

    const payload = {
      text: inputText,
      attachmentUrl: shareUrl || null,
      attachmentName: shareName || null,
      receiverId: activeTab === "dm" ? selectedUser?.id : undefined
    };

    // Optimistic reset
    setInputText("");
    setShareUrl("");
    setShareName("");
    setShowShareForm(false);

    try {
      const url = activeTab === "group" ? "/api/chat" : "/api/chat/dm";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        toast({ title: "Failed to send message", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="h-[480px] bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center animate-pulse">
        <div className="text-gray-400 text-sm">Loading chat room...</div>
      </div>
    );
  }

  return (
    <div className="bg-[#13131f] border border-white/10 rounded-2xl overflow-hidden flex flex-col md:flex-row h-[550px]">
      
      {/* LEFT SIDEBAR - Channel & Direct Message list */}
      <div className={cn(
        "w-full md:w-80 border-r border-white/10 flex flex-col bg-[#0d0d15] transition-all",
        activeTab === "dm" && selectedUser ? "hidden md:flex" : "flex"
      )}>
        
        {/* Toggle Headings */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => { setActiveTab("group"); setSelectedUser(null); }}
            className={cn(
              "flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all",
              activeTab === "group"
                ? "border-violet-500 text-white bg-white/5"
                : "border-transparent text-gray-400 hover:text-white"
            )}
          >
            <Users className="w-4 h-4" />
            Group Chat
          </button>
          <button
            onClick={() => setActiveTab("dm")}
            className={cn(
              "flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all",
              activeTab === "dm"
                ? "border-violet-500 text-white bg-white/5"
                : "border-transparent text-gray-400 hover:text-white"
            )}
          >
            <MessageSquare className="w-4 h-4" />
            Direct Msg
          </button>
        </div>

        {/* Channels/Users List Container */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {activeTab === "group" ? (
            <button
              onClick={() => setSelectedUser(null)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl text-left border transition-all",
                !selectedUser
                  ? "border-violet-500/30 bg-violet-500/10 text-white"
                  : "border-transparent hover:bg-white/5 text-gray-300"
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center">
                📢
              </div>
              <div>
                <p className="font-semibold text-sm">Study Material & General</p>
                <p className="text-xs text-gray-500">Global discussion channel</p>
              </div>
            </button>
          ) : (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-500 uppercase px-2 mb-2">Members</p>
              {users.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-500">No other members registered yet.</div>
              ) : (
                users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className={cn(
                      "w-full flex items-center gap-3 p-2.5 rounded-xl text-left border transition-all",
                      selectedUser?.id === u.id
                        ? "border-violet-500/30 bg-violet-500/10 text-white"
                        : "border-transparent hover:bg-white/5 text-gray-300"
                    )}
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 text-white font-bold flex items-center justify-center text-xs">
                      {getInitials(u.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{u.name}</p>
                      <p className="text-xs text-emerald-400">Online</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-gray-300 transition-colors" />
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT CHAT WINDOW */}
      <div className={cn(
        "flex-1 flex flex-col bg-[#111119] relative h-full",
        activeTab === "dm" && !selectedUser ? "hidden md:flex" : "flex"
      )}>
        
        {/* Chat header */}
        <div className="h-16 border-b border-white/10 px-4 flex items-center justify-between bg-[#0d0d15]">
          <div className="flex items-center gap-3 min-w-0">
            {activeTab === "dm" && selectedUser && (
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white md:hidden"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h3 className="font-semibold text-white text-sm truncate">
                {selectedUser ? `💬 Private: ${selectedUser.name}` : "📢 Global Study Group Chat"}
              </h3>
              <p className="text-xs text-gray-500">
                {selectedUser ? "Direct messages are private" : "Shared study resources & chat"}
              </p>
            </div>
          </div>
        </div>

        {/* Message feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* DM Load Indicator */}
          {loadingDMs && (
            <div className="text-center text-xs text-gray-500 py-4 animate-pulse">Loading DMs...</div>
          )}

          {/* Messages loop */}
          {activeTab === "group" ? (
            groupMessages.length === 0 ? (
              <div className="text-center py-20 text-gray-500 text-xs">
                💬 No messages yet. Say hello and share mock links or study material!
              </div>
            ) : (
              groupMessages.map((msg) => {
                const isMe = msg.userId === myUserId;
                return (
                  <div key={msg.id} className={cn("flex gap-3", isMe ? "justify-end" : "justify-start")}>
                    {!isMe && (
                      <div className="w-8 h-8 rounded-full bg-violet-600 text-white flex-shrink-0 flex items-center justify-center text-xs font-bold mt-1">
                        {getInitials(msg.user?.name || "User")}
                      </div>
                    )}
                    <div className="max-w-[70%] space-y-1">
                      {!isMe && <p className="text-[10px] text-gray-500">{msg.user?.name}</p>}
                      <div className={cn(
                        "p-3 rounded-2xl text-sm border",
                        isMe
                          ? "bg-violet-600 border-violet-500/20 text-white rounded-tr-none"
                          : "bg-white/5 border-white/10 text-gray-100 rounded-tl-none"
                      )}>
                        <p className="break-words whitespace-pre-wrap">{msg.text}</p>
                        
                        {/* Material attachment */}
                        {msg.attachmentUrl && (
                          <a
                            href={msg.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              "mt-2 p-2 rounded-xl flex items-center gap-2 text-xs font-medium border transition-colors",
                              isMe
                                ? "bg-white/15 border-white/10 text-white hover:bg-white/25"
                                : "bg-[#13131f] border-white/10 text-violet-300 hover:text-violet-200"
                            )}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span className="truncate flex-1">
                              {msg.attachmentName || "Download shared file"}
                            </span>
                          </a>
                        )}
                      </div>
                      <p className={cn("text-[9px] text-gray-600", isMe ? "text-right" : "text-left")}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })
            )
          ) : (
            selectedUser && (
              dmMessages.length === 0 ? (
                <div className="text-center py-20 text-gray-500 text-xs">
                  🔒 Private chat with {selectedUser.name}. Start a conversation!
                </div>
              ) : (
                dmMessages.map((msg) => {
                  const isMe = msg.senderId === myUserId;
                  return (
                    <div key={msg.id} className={cn("flex gap-3", isMe ? "justify-end" : "justify-start")}>
                      <div className="max-w-[70%] space-y-1">
                        <div className={cn(
                          "p-3 rounded-2xl text-sm border",
                          isMe
                            ? "bg-blue-600 border-blue-500/20 text-white rounded-tr-none"
                            : "bg-white/5 border-white/10 text-gray-100 rounded-tl-none"
                        )}>
                          <p className="break-words whitespace-pre-wrap">{msg.text}</p>
                          
                          {/* DM material attachment */}
                          {msg.attachmentUrl && (
                            <a
                              href={msg.attachmentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(
                                "mt-2 p-2 rounded-xl flex items-center gap-2 text-xs font-medium border transition-colors",
                                isMe
                                  ? "bg-white/15 border-white/10 text-white hover:bg-white/25"
                                  : "bg-[#13131f] border-white/10 text-blue-300 hover:text-blue-200"
                              )}
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span className="truncate flex-1">
                                {msg.attachmentName || "Download shared file"}
                              </span>
                            </a>
                          )}
                        </div>
                        <p className={cn("text-[9px] text-gray-600", isMe ? "text-right" : "text-left")}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )
            )
          )}
        </div>

        {/* Input Bar / Form */}
        {(!selectedUser && activeTab === "dm") ? (
          <div className="h-20 flex items-center justify-center text-gray-500 text-xs bg-[#0d0d15] border-t border-white/10">
            👈 Select a member from the sidebar to chat privately
          </div>
        ) : (
          <form onSubmit={handleSend} className="p-4 bg-[#0d0d15] border-t border-white/10 space-y-3">
            
            {/* Share Material Popup Panel */}
            {showShareForm && (
              <div className="bg-[#13131f] p-3 rounded-xl border border-white/10 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <p className="text-xs font-semibold text-white">Share Resource / Study Material</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="url"
                    value={shareUrl}
                    onChange={(e) => setShareUrl(e.target.value)}
                    placeholder="https://drive.google.com/... or link"
                    className="px-3 py-2 text-xs rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                    required
                  />
                  <input
                    type="text"
                    value={shareName}
                    onChange={(e) => setShareName(e.target.value)}
                    placeholder="Name e.g. DBMS Notes PDF"
                    className="px-3 py-2 text-xs rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                    required
                  />
                </div>
              </div>
            )}

            {/* Input buttons row */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowShareForm(!showShareForm)}
                className={cn(
                  "p-3 rounded-xl border transition-all duration-200",
                  showShareForm 
                    ? "bg-violet-600 border-violet-500 text-white" 
                    : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                )}
                title="Share Study Material Link"
              >
                <Link2 className="w-4 h-4" />
              </button>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={showShareForm ? "Write a message for this attachment..." : "Type a message..."}
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-violet-500 transition-all"
              />
              <button
                type="submit"
                className="p-3 rounded-xl bg-violet-600 text-white hover:bg-violet-500 transition-all font-semibold flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
