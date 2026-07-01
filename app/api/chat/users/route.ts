import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch DMs involving the user to find the latest conversation times
    const lastDMs = await prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: session.user.id },
          { receiverId: session.user.id }
        ]
      },
      select: {
        senderId: true,
        receiverId: true,
        createdAt: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const lastMessageMap: Record<string, Date> = {};
    for (const dm of lastDMs) {
      const otherId = dm.senderId === session.user.id ? dm.receiverId : dm.senderId;
      if (!lastMessageMap[otherId]) {
        lastMessageMap[otherId] = dm.createdAt;
      }
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        image: true,
        lastActive: true,
        focusState: {
          select: {
            isRunning: true
          }
        }
      },
      orderBy: {
        name: "asc"
      }
    });

    const mappedUsers = users.map((u) => {
      const isOnline = 
        (u.lastActive && (Date.now() - new Date(u.lastActive).getTime()) < 3 * 60 * 1000) ||
        (u.focusState?.isRunning === true);

      const isMe = u.id === session.user.id;

      return {
        id: u.id,
        name: isMe ? `${u.name} (You)` : u.name,
        image: u.image,
        isOnline: !!isOnline,
        lastMessageAt: lastMessageMap[u.id] ? lastMessageMap[u.id].toISOString() : null
      };
    });

    return NextResponse.json({ users: mappedUsers });
  } catch (error) {
    console.error("Failed to fetch chat users:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

const ADMIN_EMAILS = [
  "yash.dr2004@gmail.com",
  "yashrahane2026@gmail.com",
  "yashd@google.com",
  "yashd@live.com"
];

function checkIsAdmin(email?: string | null, name?: string | null) {
  if (!email) return false;
  const emailLower = email.toLowerCase();
  const isAdminEmail = ADMIN_EMAILS.includes(emailLower) ||
                       emailLower.includes("yashrahane") ||
                       emailLower.includes("yashd");
  const isAdminName = name && name.toLowerCase().includes("yash rahane");
  return !!(isAdminEmail || isAdminName);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = checkIsAdmin(session.user.email, session.user.name);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden: Admin privileges required" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    if (userId === session.user.id) {
      return NextResponse.json({ error: "You cannot remove yourself" }, { status: 400 });
    }

    // Cascade deletes all related messages and stats
    await prisma.user.delete({
      where: { id: userId }
    });

    const { pusherServer } = await import("@/lib/pusher");
    try {
      await pusherServer.trigger("chat", "user-remove", { userId });
    } catch (pusherErr) {
      console.error("Pusher user-remove trigger failed:", pusherErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete user:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
