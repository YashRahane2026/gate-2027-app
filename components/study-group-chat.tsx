"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { getPusherClient } from "@/lib/pusher";
import { getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Send, Link2, MessageSquare, Users, FileText, ChevronLeft, ArrowRight, CornerUpLeft, X, Paperclip } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface User {
  id: string;
  name: string;
  image: string | null;
  isOnline?: boolean;
  lastMessageAt?: string | null;
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
  replyToId?: string | null;
  replyTo?: {
    id: string;
    text: string;
    user?: {
      id: string;
      name: string;
    };
  } | null;
}

interface DMMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  createdAt: string;
  read?: boolean;
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
  replyToId?: string | null;
  replyTo?: {
    id: string;
    text: string;
    sender?: {
      id: string;
      name: string;
    };
  } | null;
}

const isImageUrl = (url: string | null) => {
  if (!url) return false;
  if (url.startsWith("data:image/")) return true;
  const cleanUrl = url.split("?")[0].split("#")[0];
  return /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(cleanUrl);
};

const formatChatDate = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  
  const isSameDay = (d1: Date, d2: Date) => 
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();

  if (isSameDay(date, today)) return "Today";

  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(date, yesterday)) return "Yesterday";

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(today.getDate() - 7);
  if (date > oneWeekAgo) {
    return date.toLocaleDateString("en-US", { weekday: "long" });
  }

  return date.toLocaleDateString("en-GB"); // "dd/mm/yyyy" like "23/06/2026"
};

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
  const [unreadSenders, setUnreadSenders] = useState<string[]>([]);
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);
  
  // Inputs & Uploads
  const [inputText, setInputText] = useState("");
  const [showShareForm, setShowShareForm] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [shareName, setShareName] = useState("");
  const [uploading, setUploading] = useState(false);

  // Reply State
  const [replyToMessage, setReplyToMessage] = useState<{
    id: string;
    text: string;
    senderName: string;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingDMs, setLoadingDMs] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const feedContainerRef = useRef<HTMLDivElement>(null);

  const myUserId = session?.user?.id;

  // Scroll to bottom helper (internally scrolls the chat feed only, preventing parent window jumping)
  const scrollToBottom = () => {
    if (feedContainerRef.current) {
      feedContainerRef.current.scrollTo({
        top: feedContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [groupMessages, dmMessages, selectedUser, activeTab]);

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

  // Clear unread sender badge when chat is opened
  useEffect(() => {
    if (selectedUser) {
      setUnreadSenders((prev) => prev.filter((id) => id !== selectedUser.id));
    }
  }, [selectedUser]);

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
          if (prev.some((m) => m.id === newMessage.id)) return prev;
          
          // Replace matching temporary optimistic message
          const tempIdx = prev.findIndex(
            (m) => m.id.startsWith("temp-") && m.text === newMessage.text && m.userId === newMessage.userId
          );
          if (tempIdx !== -1) {
            const next = [...prev];
            next[tempIdx] = newMessage;
            return next;
          }
          return [...prev, newMessage];
        });
      });

      // Subscribe to personal DMs channel
      const personalChannel = pusherClient.subscribe(`user-${myUserId}`);
      
      // Real-time direct message receive
      personalChannel.bind("dm", (newDM: DMMessage) => {
        setDmMessages((prev) => {
          if (prev.some((m) => m.id === newDM.id)) return prev;
          
          // Replace matching temporary optimistic DM
          const tempIdx = prev.findIndex(
            (m) => m.id.startsWith("temp-") && m.text === newDM.text && m.senderId === newDM.senderId
          );
          if (tempIdx !== -1) {
            const next = [...prev];
            next[tempIdx] = newDM;
            return next;
          }
          
          const isRelated = 
            (newDM.senderId === selectedUser?.id && newDM.receiverId === myUserId) ||
            (newDM.senderId === myUserId && newDM.receiverId === selectedUser?.id);

          if (isRelated) {
            return [...prev, newDM];
          }
          return prev;
        });

        // Update lastMessageAt to reorder lists in real time
        setUsers((prevUsers) => {
          const targetId = newDM.senderId === myUserId ? newDM.receiverId : newDM.senderId;
          return prevUsers.map((u) => {
            if (u.id === targetId) {
              return { ...u, lastMessageAt: newDM.createdAt };
            }
            return u;
          });
        });

        // Push to unread senders state if not actively reading their messages
        if (newDM.senderId !== selectedUser?.id) {
          setUnreadSenders((prev) => {
            if (prev.includes(newDM.senderId)) return prev;
            return [...prev, newDM.senderId];
          });
          toast({
            title: `New DM from ${newDM.sender.name}`,
            description: newDM.text || "Shared a photo/file",
          });
        }
      });

      // Real-time message read receipts (blue double ticks)
      personalChannel.bind("dm-read", (data: { readerId: string }) => {
        if (selectedUser?.id === data.readerId) {
          setDmMessages((prev) =>
            prev.map((m) => (m.senderId === myUserId ? { ...m, read: true } : m))
          );
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

  // Handle local file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setShareUrl(data.url);
        setShareName(data.name);
        toast({ title: "File uploaded successfully!" });
      } else {
        const errData = await res.json().catch(() => ({}));
        toast({
          title: "Upload failed",
          description: errData.error || "Something went wrong during file processing.",
          variant: "destructive"
        });
      }
    } catch {
      toast({ title: "Upload failed due to connection error", variant: "destructive" });
    } finally {
      setUploading(false);
      // Reset input value to allow uploading same file name again
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Send Message / Material
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !shareUrl.trim()) return;

    const payload = {
      text: inputText,
      attachmentUrl: shareUrl || null,
      attachmentName: shareName || null,
      replyToId: replyToMessage?.id || null,
      receiverId: activeTab === "dm" ? selectedUser?.id : undefined
    };

    // Construct optimistic message to append instantly
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      userId: myUserId!,
      text: payload.text || "",
      attachmentUrl: payload.attachmentUrl,
      attachmentName: payload.attachmentName,
      createdAt: new Date().toISOString(),
      replyToId: payload.replyToId,
      user: {
        id: myUserId!,
        name: session?.user?.name || "Me",
        image: session?.user?.image || null
      },
      replyTo: payload.replyToId ? {
        id: payload.replyToId,
        text: replyToMessage?.text || "",
        user: {
          id: "",
          name: replyToMessage?.senderName || ""
        }
      } : null
    };

    if (activeTab === "group") {
      setGroupMessages((prev) => [...prev, optimisticMessage]);
    } else if (activeTab === "dm" && selectedUser) {
      const optimisticDM: DMMessage = {
        id: tempId,
        senderId: myUserId!,
        receiverId: selectedUser.id,
        text: payload.text || "",
        attachmentUrl: payload.attachmentUrl,
        attachmentName: payload.attachmentName,
        createdAt: new Date().toISOString(),
        replyToId: payload.replyToId,
        read: false,
        sender: {
          id: myUserId!,
          name: session?.user?.name || "Me",
          image: session?.user?.image || null
        },
        receiver: {
          id: selectedUser.id,
          name: selectedUser.name,
          image: selectedUser.image
        },
        replyTo: payload.replyToId ? {
          id: payload.replyToId,
          text: replyToMessage?.text || "",
          sender: {
            id: "",
            name: replyToMessage?.senderName || ""
          }
        } : null
      };
      setDmMessages((prev) => [...prev, optimisticDM]);
      
      // Update sidebar sort timestamp on sending message
      setUsers((prevUsers) => {
        return prevUsers.map((u) => {
          if (u.id === selectedUser.id) {
            return { ...u, lastMessageAt: optimisticDM.createdAt };
          }
          return u;
        });
      });
    }

    // Reset inputs
    setInputText("");
    setShareUrl("");
    setShareName("");
    setShowShareForm(false);
    setReplyToMessage(null);

    try {
      const url = activeTab === "group" ? "/api/chat" : "/api/chat/dm";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        toast({ title: "Failed to send message", variant: "destructive" });
        // Rollback optimistic update
        if (activeTab === "group") {
          setGroupMessages((prev) => prev.filter((m) => m.id !== tempId));
        } else {
          setDmMessages((prev) => prev.filter((m) => m.id !== tempId));
        }
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
      if (activeTab === "group") {
        setGroupMessages((prev) => prev.filter((m) => m.id !== tempId));
      } else {
        setDmMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
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
    <div className="bg-[#13131f] border border-white/10 rounded-2xl overflow-hidden flex flex-col md:flex-row h-[550px] relative">
      
      {/* 1. LEFT SIDEBAR - Direct Message users list (hidden in Group chat to save space) */}
      {activeTab === "dm" && (
        <div className={cn(
          "w-full md:w-48 border-r border-white/10 flex flex-col bg-[#0d0d15] transition-all flex-shrink-0",
          activeTab === "dm" && selectedUser ? "hidden md:flex" : "flex"
        )}>
          {/* Users List Container */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-gray-500 uppercase px-2 mb-1">Members</p>
              {users.length === 0 ? (
                <div className="text-center py-8 text-[10px] text-gray-500">No other members registered yet.</div>
              ) : (
                [...users]
                  .sort((a, b) => {
                    const aUnread = unreadSenders.includes(a.id);
                    const bUnread = unreadSenders.includes(b.id);
                    // Pinned unread chats on top
                    if (aUnread && !bUnread) return -1;
                    if (!aUnread && bUnread) return 1;

                    // Sort by last conversation time (newest first)
                    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
                    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
                    if (aTime !== bTime) {
                      return bTime - aTime;
                    }

                    // Fallback to alphabetical sorting
                    return a.name.localeCompare(b.name);
                  })
                  .map((u) => {
                    const isOnline = u.isOnline;
                    const hasUnread = unreadSenders.includes(u.id);
                    return (
                      <button
                        key={u.id}
                        onClick={() => setSelectedUser(u)}
                        className={cn(
                          "w-full flex items-center gap-2 p-2 rounded-lg text-left border transition-all",
                          selectedUser?.id === u.id
                            ? "border-violet-500/30 bg-violet-500/10 text-white"
                            : "border-transparent hover:bg-white/5 text-gray-300"
                        )}
                      >
                        <div className="relative flex-shrink-0">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 text-white font-bold flex items-center justify-center text-[10px]">
                            {getInitials(u.name)}
                          </div>
                          {isOnline && (
                            <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border-2 border-[#0d0d15]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-xs truncate">{u.name}</p>
                          <p className={cn("text-[9px] font-medium", isOnline ? "text-emerald-400" : "text-gray-500")}>
                            {isOnline ? "Online" : "Offline"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {hasUnread ? (
                            <span className="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse flex-shrink-0">
                              New
                            </span>
                          ) : (
                            <ArrowRight className="w-3 h-3 text-gray-600 group-hover:text-gray-300 transition-colors flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. MIDDLE NARROW VERTICAL NAV */}
      <div className={cn(
        "w-full md:w-16 border-r border-white/10 flex md:flex-col bg-[#0b0b10] py-3 gap-2 flex-shrink-0 justify-around md:justify-start",
        activeTab === "dm" && selectedUser ? "hidden md:flex" : "flex"
      )}>
        <button
          onClick={() => { setActiveTab("group"); setSelectedUser(null); }}
          className={cn(
            "flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-semibold gap-1 transition-all w-12 h-12 mx-auto",
            activeTab === "group"
              ? "bg-violet-600 text-white shadow-lg shadow-violet-500/10"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          )}
        >
          <Users className="w-4 h-4" />
          Group
        </button>
        <button
          onClick={() => setActiveTab("dm")}
          className={cn(
            "flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-semibold gap-1 transition-all w-12 h-12 mx-auto",
            activeTab === "dm"
              ? "bg-violet-600 text-white shadow-lg shadow-violet-500/10"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          )}
        >
          <div className="relative">
            <MessageSquare className="w-4 h-4" />
            {unreadSenders.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full border border-[#0b0b10] animate-pulse" />
            )}
          </div>
          DM
        </button>
      </div>

      {/* 3. RIGHT CHAT WINDOW */}
      <div className={cn(
        "flex-1 flex flex-col bg-[#111119] relative h-full min-w-0",
        activeTab === "dm" && !selectedUser ? "hidden md:flex" : "flex"
      )}>
        
        {/* Chat header */}
        <div className="h-14 border-b border-white/10 px-4 flex items-center justify-between bg-[#0d0d15]">
          <div className="flex items-center gap-3 min-w-0">
            {activeTab === "dm" && selectedUser && (
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white md:hidden"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h3 className="font-semibold text-white text-xs truncate flex items-center gap-2 font-sans">
                {selectedUser ? `💬 Private: ${selectedUser.name}` : "📢 Global Study Group Chat"}
                {selectedUser && selectedUser.isOnline && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
              </h3>
              <p className="text-[10px] text-gray-500 font-sans">
                {selectedUser 
                  ? (selectedUser.isOnline ? "Online" : "Offline") 
                  : "Shared study resources & chat"}
              </p>
            </div>
          </div>
        </div>

        {/* Message feed */}
        <div ref={feedContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* DM Load Indicator */}
          {loadingDMs && (
            <div className="text-center text-xs text-gray-500 py-4 animate-pulse">Loading DMs...</div>
          )}

          {/* Messages loop */}
          {activeTab === "group" ? (
            groupMessages.length === 0 ? (
              <div className="text-center py-20 text-gray-500 text-xs">
                💬 No messages yet. Say hello and share mock links, photos, or study material!
              </div>
            ) : (
              groupMessages.map((msg, index) => {
                const isMe = msg.userId === myUserId;
                const prevMsg = groupMessages[index - 1];
                const showDateSeparator = !prevMsg || 
                  new Date(msg.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString();

                return (
                  <div key={msg.id} className="space-y-4">
                    {showDateSeparator && (
                      <div className="flex justify-center my-3 select-none">
                        <span className="bg-[#1e1e2f] border border-white/5 text-[9px] text-gray-400 px-3 py-1 rounded-full font-semibold font-sans uppercase tracking-wider shadow-md">
                          {formatChatDate(msg.createdAt)}
                        </span>
                      </div>
                    )}
                    <div className={cn("flex gap-3 group", isMe ? "justify-end" : "justify-start")}>
                      {!isMe && (
                        <div className="w-8 h-8 rounded-full bg-violet-600 text-white flex-shrink-0 flex items-center justify-center text-xs font-bold mt-1">
                          {getInitials(msg.user?.name || "User")}
                        </div>
                      )}
                      <div className={cn("flex gap-2 max-w-[75%]", isMe ? "flex-row-reverse" : "flex-row")}>
                        <div className="space-y-1 min-w-0">
                          {!isMe && <p className="text-[10px] text-gray-500">{msg.user?.name}</p>}
                          
                          {(() => {
                            const hasOnlyImage = msg.attachmentUrl && isImageUrl(msg.attachmentUrl) && !msg.text;
                            return (
                              <div className={cn(
                                "rounded-2xl text-xs border relative overflow-hidden",
                                hasOnlyImage 
                                  ? "p-1 bg-black/20 border-white/10 max-w-[280px]" 
                                  : "p-2.5",
                                !hasOnlyImage && (isMe
                                  ? "bg-violet-600 border-violet-500/20 text-white rounded-tr-none"
                                  : "bg-white/5 border-white/10 text-gray-100 rounded-tl-none"),
                                hasOnlyImage && (isMe ? "rounded-tr-none" : "rounded-tl-none")
                              )}>
                                
                                {/* Replied-To Message Header Quote Box */}
                                {msg.replyTo && (
                                  <div className={cn(
                                    "mb-1.5 p-1.5 rounded-lg text-[10px] border-l-2 bg-black/25 text-gray-400 truncate max-w-full",
                                    isMe ? "border-violet-300" : "border-violet-500"
                                  )}>
                                    <p className="font-semibold text-[9px] text-violet-300">
                                      {msg.replyTo.user?.id === myUserId ? "You" : msg.replyTo.user?.name}
                                    </p>
                                    <p className="truncate text-gray-400 mt-0.5">{msg.replyTo.text || "📎 Attachment / Photo"}</p>
                                  </div>
                                )}

                                {!hasOnlyImage && msg.text && <p className="break-words whitespace-pre-wrap">{msg.text}</p>}
                                
                                {/* Photo / Material attachment */}
                                {msg.attachmentUrl && (
                                  isImageUrl(msg.attachmentUrl) ? (
                                    <div className={cn(
                                      "overflow-hidden border border-white/10 bg-black/25",
                                      hasOnlyImage ? "rounded-xl" : "mt-1.5 rounded-xl"
                                    )}>
                                      <img
                                        src={msg.attachmentUrl}
                                        alt={msg.attachmentName || "Attached image"}
                                        className="w-full h-auto max-h-64 object-cover hover:scale-[1.02] transition-transform duration-250 cursor-pointer"
                                        onClick={() => setActiveLightboxImage(msg.attachmentUrl)}
                                      />
                                      {!hasOnlyImage && msg.attachmentName && (
                                        <p className="text-[9px] text-gray-400 px-2 py-1 bg-black/30 truncate">
                                          📸 {msg.attachmentName}
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <a
                                      href={msg.attachmentUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={cn(
                                        "mt-1.5 p-2 rounded-xl flex items-center gap-1.5 text-[10px] font-medium border transition-colors",
                                        isMe
                                          ? "bg-white/15 border-white/10 text-white hover:bg-white/25"
                                          : "bg-[#13131f] border-white/10 text-violet-300 hover:text-violet-200"
                                      )}
                                    >
                                      <FileText className="w-3 h-3 flex-shrink-0" />
                                      <span className="truncate flex-1">
                                        {msg.attachmentName || "Download shared file"}
                                      </span>
                                    </a>
                                  )
                                )}
                              </div>
                            );
                          })()}
                          
                          <p className={cn("text-[9px] text-gray-600", isMe ? "text-right" : "text-left")}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>

                        {/* WhatsApp-like Reply Icon Button on message hover */}
                        <button
                          type="button"
                          onClick={() => setReplyToMessage({
                            id: msg.id,
                            text: msg.text,
                            senderName: isMe ? "You" : (msg.user?.name || "User")
                          })}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all flex items-center justify-center self-center h-7 w-7"
                          title="Reply"
                        >
                          <CornerUpLeft className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
                dmMessages.map((msg, index) => {
                  const isMe = msg.senderId === myUserId;
                  const prevMsg = dmMessages[index - 1];
                  const showDateSeparator = !prevMsg || 
                    new Date(msg.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString();

                  return (
                    <div key={msg.id} className="space-y-4">
                      {showDateSeparator && (
                        <div className="flex justify-center my-3 select-none">
                          <span className="bg-[#1e1e2f] border border-white/5 text-[9px] text-gray-400 px-3 py-1 rounded-full font-semibold font-sans uppercase tracking-wider shadow-md">
                            {formatChatDate(msg.createdAt)}
                          </span>
                        </div>
                      )}
                      <div className={cn("flex gap-3 group", isMe ? "justify-end" : "justify-start")}>
                        <div className={cn("flex gap-2 max-w-[75%]", isMe ? "flex-row-reverse" : "flex-row")}>
                          <div className="space-y-1 min-w-0">
                            
                            {(() => {
                              const hasOnlyImage = msg.attachmentUrl && isImageUrl(msg.attachmentUrl) && !msg.text;
                              return (
                                <div className={cn(
                                  "rounded-2xl text-xs border relative overflow-hidden",
                                  hasOnlyImage 
                                    ? "p-1 bg-black/20 border-white/10 max-w-[280px]" 
                                    : "p-2.5",
                                  !hasOnlyImage && (isMe
                                    ? "bg-blue-600 border-blue-500/20 text-white rounded-tr-none"
                                    : "bg-white/5 border-white/10 text-gray-100 rounded-tl-none"),
                                  hasOnlyImage && (isMe ? "rounded-tr-none" : "rounded-tl-none")
                                )}>
                                  
                                  {/* DM Replied-To Message Header Quote Box */}
                                  {msg.replyTo && (
                                    <div className={cn(
                                      "mb-1.5 p-1.5 rounded-lg text-[10px] border-l-2 bg-black/25 text-gray-400 truncate max-w-full",
                                      isMe ? "border-blue-300" : "border-blue-500"
                                    )}>
                                      <p className="font-semibold text-[9px] text-blue-300">
                                        {msg.replyTo.sender?.id === myUserId ? "You" : msg.replyTo.sender?.name}
                                      </p>
                                      <p className="truncate text-gray-400 mt-0.5">{msg.replyTo.text || "📎 Attachment / Photo"}</p>
                                    </div>
                                  )}

                                  {!hasOnlyImage && msg.text && <p className="break-words whitespace-pre-wrap">{msg.text}</p>}
                                  
                                  {/* DM Photo / Material attachment */}
                                  {msg.attachmentUrl && (
                                    isImageUrl(msg.attachmentUrl) ? (
                                      <div className={cn(
                                        "overflow-hidden border border-white/10 bg-black/25",
                                        hasOnlyImage ? "rounded-xl" : "mt-1.5 rounded-xl"
                                      )}>
                                        <img
                                          src={msg.attachmentUrl}
                                          alt={msg.attachmentName || "Attached image"}
                                          className="w-full h-auto max-h-64 object-cover hover:scale-[1.02] transition-transform duration-250 cursor-pointer"
                                          onClick={() => setActiveLightboxImage(msg.attachmentUrl)}
                                        />
                                        {!hasOnlyImage && msg.attachmentName && (
                                          <p className="text-[9px] text-gray-400 px-2 py-1 bg-black/30 truncate">
                                            📸 {msg.attachmentName}
                                          </p>
                                        )}
                                      </div>
                                    ) : (
                                      <a
                                        href={msg.attachmentUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={cn(
                                          "mt-1.5 p-2 rounded-xl flex items-center gap-1.5 text-[10px] font-medium border transition-colors",
                                          isMe
                                            ? "bg-white/15 border-white/10 text-white hover:bg-white/25"
                                            : "bg-[#13131f] border-white/10 text-blue-300 hover:text-blue-200"
                                        )}
                                      >
                                        <FileText className="w-3 h-3 flex-shrink-0" />
                                        <span className="truncate flex-1">
                                          {msg.attachmentName || "Download shared file"}
                                        </span>
                                      </a>
                                    )
                                  )}
                                </div>
                              );
                            })()}

                            <p className={cn("text-[9px] text-gray-600 flex items-center justify-end gap-1", isMe ? "text-right" : "text-left")}>
                              <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {isMe && (
                                <span className={cn(
                                  "text-[9px] font-bold select-none leading-none",
                                  msg.id.startsWith("temp-") ? "text-gray-500" : (msg.read ? "text-sky-400 font-extrabold" : "text-gray-500")
                                )}>
                                  {msg.id.startsWith("temp-") ? "✓" : "✓✓"}
                                </span>
                              )}
                            </p>
                          </div>

                          {/* WhatsApp-like Reply Icon Button on DM hover */}
                          <button
                            type="button"
                            onClick={() => setReplyToMessage({
                              id: msg.id,
                              text: msg.text,
                              senderName: isMe ? "You" : (msg.sender.name || "User")
                            })}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all flex items-center justify-center self-center h-7 w-7"
                            title="Reply"
                          >
                            <CornerUpLeft className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )
            )
          )}
        </div>

        {/* Replying-to Preview Banner directly above input bar */}
        {replyToMessage && (
          <div className="bg-[#13131f] px-4 py-2 border-t border-white/10 border-l-4 border-violet-500 bg-violet-500/5 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-semibold text-violet-400 uppercase tracking-wider">
                Replying to {replyToMessage.senderName}
              </p>
              <p className="text-xs text-gray-400 truncate mt-0.5">
                {replyToMessage.text || "📎 Attachment / Photo"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReplyToMessage(null)}
              className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Selected Attachment Preview Banner directly above input bar */}
        {shareUrl && (
          <div className="bg-[#13131f] px-4 py-2 border-t border-white/10 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center gap-2.5 min-w-0">
              {isImageUrl(shareUrl) ? (
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-black/20 border border-white/10 flex-shrink-0">
                  <img src={shareUrl} className="w-full h-full object-cover" alt="Preview" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {isImageUrl(shareUrl) ? "📸 Photo ready to send" : "📂 File ready to send"}
                </p>
                <p className="text-[9px] text-gray-500 truncate">{shareName}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setShareUrl(""); setShareName(""); }}
              className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Input Bar / Form */}
        {(!selectedUser && activeTab === "dm") ? (
          <div className="h-16 flex items-center justify-center text-gray-500 text-xs bg-[#0d0d15] border-t border-white/10">
            👈 Select a member from the sidebar to chat privately
          </div>
        ) : (
          <form onSubmit={handleSend} className="p-3 bg-[#0d0d15] border-t border-white/10 space-y-2">
            
            {/* Share External Material Link Panel */}
            {showShareForm && (
              <div className="bg-[#13131f] p-2.5 rounded-xl border border-white/10 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <p className="text-xs font-semibold text-white">Share Resource / Web Link</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="url"
                    value={shareUrl}
                    onChange={(e) => setShareUrl(e.target.value)}
                    placeholder="https://drive.google.com/... or link"
                    className="px-2.5 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                    required
                  />
                  <input
                    type="text"
                    value={shareName}
                    onChange={(e) => setShareName(e.target.value)}
                    placeholder="Name e.g. DBMS Notes PDF"
                    className="px-2.5 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                    required
                  />
                </div>
              </div>
            )}

            {/* Hidden Input File Element for local upload */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
            />

            {/* Input row */}
            <div className="flex items-center gap-2">
              
              {/* Local Photo/File Upload Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={cn(
                  "p-2.5 rounded-xl border transition-all duration-200 bg-white/5 border-white/10 text-gray-400 hover:text-white flex items-center justify-center h-9 w-9 flex-shrink-0",
                  uploading && "opacity-50 cursor-not-allowed"
                )}
                title="Upload Photo or File"
              >
                {uploading ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <Paperclip className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Paste URL Link Button */}
              <button
                type="button"
                onClick={() => setShowShareForm(!showShareForm)}
                className={cn(
                  "p-2.5 rounded-xl border transition-all duration-200 h-9 w-9 flex items-center justify-center flex-shrink-0",
                  showShareForm 
                    ? "bg-violet-600 border-violet-500 text-white" 
                    : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                )}
                title="Paste Study Material Link"
              >
                <Link2 className="w-3.5 h-3.5" />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={replyToMessage ? "Write a reply..." : (shareUrl ? "Add a caption/message for file..." : "Type a message...")}
                className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-violet-500 transition-all h-9 min-w-0"
              />
              
              <button
                type="submit"
                className="p-2.5 rounded-xl bg-violet-600 text-white hover:bg-violet-500 transition-all font-semibold flex items-center justify-center h-9 w-9 flex-shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 4. PREMIUM LIGHTBOX OVERLAY */}
      {activeLightboxImage && (
        <div 
          className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setActiveLightboxImage(null)}
        >
          {/* Close Button */}
          <button 
            onClick={() => setActiveLightboxImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-50"
          >
            <X className="w-6 h-6" />
          </button>
          
          {/* Image Container */}
          <div className="relative max-w-full max-h-[85vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img 
              src={activeLightboxImage} 
              alt="Full size view" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200"
            />
          </div>
          
          <p className="text-gray-400 text-xs mt-4 font-sans">Click anywhere to close</p>
        </div>
      )}
    </div>
  );
}
