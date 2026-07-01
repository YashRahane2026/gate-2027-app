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
  lastActive?: string;
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
  const cleanUrl = url.split("?")[0].split("#")[0];
  return /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(cleanUrl);
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const myUserId = session?.user?.id;

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
          return [...prev, newMessage];
        });
      });

      // Subscribe to personal DMs channel
      const personalChannel = pusherClient.subscribe(`user-${myUserId}`);
      personalChannel.bind("dm", (newDM: DMMessage) => {
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

        if (newDM.senderId !== selectedUser?.id) {
          toast({
            title: `New DM from ${newDM.sender.name}`,
            description: newDM.text || "Shared a photo/file",
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
        toast({ title: "Upload failed", variant: "destructive" });
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
                users.map((u) => {
                  const isOnline = u.lastActive && (Date.now() - new Date(u.lastActive).getTime()) < 3 * 60 * 1000;
                  return (
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
                      <div className="relative">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 text-white font-bold flex items-center justify-center text-xs">
                          {getInitials(u.name)}
                        </div>
                        {isOnline && (
                          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0d0d15]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{u.name}</p>
                        <p className={cn("text-xs font-medium", isOnline ? "text-emerald-400" : "text-gray-500")}>
                          {isOnline ? "Online" : "Offline"}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-gray-300 transition-colors" />
                    </button>
                  );
                })
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
              <h3 className="font-semibold text-white text-sm truncate flex items-center gap-2">
                {selectedUser ? `💬 Private: ${selectedUser.name}` : "📢 Global Study Group Chat"}
                {selectedUser && (() => {
                  const isOnline = selectedUser.lastActive && (Date.now() - new Date(selectedUser.lastActive).getTime()) < 3 * 60 * 1000;
                  return isOnline && (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  );
                })()}
              </h3>
              <p className="text-xs text-gray-500">
                {selectedUser ? (() => {
                  const isOnline = selectedUser.lastActive && (Date.now() - new Date(selectedUser.lastActive).getTime()) < 3 * 60 * 1000;
                  return isOnline ? "Online" : "Offline";
                })() : "Shared study resources & chat"}
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
                💬 No messages yet. Say hello and share mock links, photos, or study material!
              </div>
            ) : (
              groupMessages.map((msg) => {
                const isMe = msg.userId === myUserId;
                return (
                  <div key={msg.id} className={cn("flex gap-3 group", isMe ? "justify-end" : "justify-start")}>
                    {!isMe && (
                      <div className="w-8 h-8 rounded-full bg-violet-600 text-white flex-shrink-0 flex items-center justify-center text-xs font-bold mt-1">
                        {getInitials(msg.user?.name || "User")}
                      </div>
                    )}
                    <div className={cn("flex gap-2 max-w-[70%]", isMe ? "flex-row-reverse" : "flex-row")}>
                      <div className="space-y-1">
                        {!isMe && <p className="text-[10px] text-gray-500">{msg.user?.name}</p>}
                        
                        {(() => {
                          const hasOnlyImage = msg.attachmentUrl && isImageUrl(msg.attachmentUrl) && !msg.text;
                          return (
                            <div className={cn(
                              "rounded-2xl text-sm border relative overflow-hidden",
                              hasOnlyImage 
                                ? "p-1 bg-black/20 border-white/10 max-w-[260px]" 
                                : "p-3",
                              !hasOnlyImage && (isMe
                                ? "bg-violet-600 border-violet-500/20 text-white rounded-tr-none"
                                : "bg-white/5 border-white/10 text-gray-100 rounded-tl-none"),
                              hasOnlyImage && (isMe ? "rounded-tr-none" : "rounded-tl-none")
                            )}>
                              
                              {/* Replied-To Message Header Quote Box */}
                              {msg.replyTo && (
                                <div className={cn(
                                  "mb-2 p-2 rounded-lg text-xs border-l-2 bg-black/25 text-gray-400 truncate max-w-full",
                                  isMe ? "border-violet-300" : "border-violet-500"
                                )}>
                                  <p className="font-semibold text-[10px] text-violet-300">
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
                                    hasOnlyImage ? "rounded-xl" : "mt-2 rounded-xl"
                                  )}>
                                    <img
                                      src={msg.attachmentUrl}
                                      alt={msg.attachmentName || "Attached image"}
                                      className="w-full h-auto max-h-60 object-contain hover:scale-[1.02] transition-transform duration-250 cursor-pointer"
                                      onClick={() => window.open(msg.attachmentUrl!, "_blank")}
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
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all flex items-center justify-center self-center h-8 w-8"
                        title="Reply"
                      >
                        <CornerUpLeft className="w-4 h-4" />
                      </button>
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
                    <div key={msg.id} className={cn("flex gap-3 group", isMe ? "justify-end" : "justify-start")}>
                      <div className={cn("flex gap-2 max-w-[70%]", isMe ? "flex-row-reverse" : "flex-row")}>
                        <div className="space-y-1">
                          
                          {(() => {
                            const hasOnlyImage = msg.attachmentUrl && isImageUrl(msg.attachmentUrl) && !msg.text;
                            return (
                              <div className={cn(
                                "rounded-2xl text-sm border relative overflow-hidden",
                                hasOnlyImage 
                                  ? "p-1 bg-black/20 border-white/10 max-w-[260px]" 
                                  : "p-3",
                                !hasOnlyImage && (isMe
                                  ? "bg-blue-600 border-blue-500/20 text-white rounded-tr-none"
                                  : "bg-white/5 border-white/10 text-gray-100 rounded-tl-none"),
                                hasOnlyImage && (isMe ? "rounded-tr-none" : "rounded-tl-none")
                              )}>
                                
                                {/* DM Replied-To Message Header Quote Box */}
                                {msg.replyTo && (
                                  <div className={cn(
                                    "mb-2 p-2 rounded-lg text-xs border-l-2 bg-black/25 text-gray-400 truncate max-w-full",
                                    isMe ? "border-blue-300" : "border-blue-500"
                                  )}>
                                    <p className="font-semibold text-[10px] text-blue-300">
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
                                      hasOnlyImage ? "rounded-xl" : "mt-2 rounded-xl"
                                    )}>
                                      <img
                                        src={msg.attachmentUrl}
                                        alt={msg.attachmentName || "Attached image"}
                                        className="w-full h-auto max-h-60 object-contain hover:scale-[1.02] transition-transform duration-250 cursor-pointer"
                                        onClick={() => window.open(msg.attachmentUrl!, "_blank")}
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
                                  )
                                )}
                              </div>
                            );
                          })()}

                          <p className={cn("text-[9px] text-gray-600", isMe ? "text-right" : "text-left")}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all flex items-center justify-center self-center h-8 w-8"
                          title="Reply"
                        >
                          <CornerUpLeft className="w-4 h-4" />
                        </button>
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
          <div className="bg-[#13131f] px-4 py-2.5 border-t border-white/10 border-l-4 border-violet-500 bg-violet-500/5 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider">
                Replying to {replyToMessage.senderName}
              </p>
              <p className="text-xs text-gray-400 truncate mt-0.5">
                {replyToMessage.text || "📎 Attachment / Photo"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReplyToMessage(null)}
              className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Selected Attachment Preview Banner directly above input bar */}
        {shareUrl && (
          <div className="bg-[#13131f] px-4 py-2.5 border-t border-white/10 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center gap-3 min-w-0">
              {isImageUrl(shareUrl) ? (
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/20 border border-white/10 flex-shrink-0">
                  <img src={shareUrl} className="w-full h-full object-cover" alt="Preview" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {isImageUrl(shareUrl) ? "📸 Photo ready to send" : "📂 File ready to send"}
                </p>
                <p className="text-[10px] text-gray-500 truncate">{shareName}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setShareUrl(""); setShareName(""); }}
              className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Input Bar / Form */}
        {(!selectedUser && activeTab === "dm") ? (
          <div className="h-20 flex items-center justify-center text-gray-500 text-xs bg-[#0d0d15] border-t border-white/10">
            👈 Select a member from the sidebar to chat privately
          </div>
        ) : (
          <form onSubmit={handleSend} className="p-4 bg-[#0d0d15] border-t border-white/10 space-y-3">
            
            {/* Share External Material Link Panel */}
            {showShareForm && (
              <div className="bg-[#13131f] p-3 rounded-xl border border-white/10 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <p className="text-xs font-semibold text-white">Share Resource / Web Link</p>
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
                  "p-3 rounded-xl border transition-all duration-200 bg-white/5 border-white/10 text-gray-400 hover:text-white flex items-center justify-center h-11 w-11",
                  uploading && "opacity-50 cursor-not-allowed"
                )}
                title="Upload Photo or File"
              >
                {uploading ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <Paperclip className="w-4 h-4" />
                )}
              </button>

              {/* Paste URL Link Button */}
              <button
                type="button"
                onClick={() => setShowShareForm(!showShareForm)}
                className={cn(
                  "p-3 rounded-xl border transition-all duration-200 h-11 w-11 flex items-center justify-center",
                  showShareForm 
                    ? "bg-violet-600 border-violet-500 text-white" 
                    : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                )}
                title="Paste Study Material Link"
              >
                <Link2 className="w-4 h-4" />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={replyToMessage ? "Write a reply..." : (shareUrl ? "Add a caption/message for file..." : "Type a message...")}
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-violet-500 transition-all h-11"
              />
              
              <button
                type="submit"
                className="p-3 rounded-xl bg-violet-600 text-white hover:bg-violet-500 transition-all font-semibold flex items-center justify-center h-11 w-11"
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
