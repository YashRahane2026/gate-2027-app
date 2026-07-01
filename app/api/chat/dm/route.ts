import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const targetUserId = searchParams.get("userId");

  if (!targetUserId) {
    return NextResponse.json({ error: "Recipient user ID is required" }, { status: 400 });
  }

  try {
    // Mark messages from targetUserId to us as read
    await prisma.directMessage.updateMany({
      where: {
        senderId: targetUserId,
        receiverId: session.user.id,
        read: false,
      },
      data: {
        read: true,
      },
    });

    // Notify the target user that their sent messages have been read
    try {
      await pusherServer.trigger(`user-${targetUserId}`, "dm-read", {
        readerId: session.user.id,
      });
    } catch (pusherErr) {
      console.error("Pusher read receipt trigger failed:", pusherErr);
    }

    const messages = await prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: session.user.id, receiverId: targetUserId },
          { senderId: targetUserId, receiverId: session.user.id },
        ],
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Failed to fetch direct messages:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { receiverId, text, attachmentUrl, attachmentName, replyToId } = body;

    if (!receiverId) {
      return NextResponse.json({ error: "Recipient user ID is required" }, { status: 400 });
    }

    if (!text && !attachmentUrl) {
      return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
    }

    const message = await prisma.directMessage.create({
      data: {
        senderId: session.user.id,
        receiverId,
        text: text || "",
        attachmentUrl: attachmentUrl || null,
        attachmentName: attachmentName || null,
        replyToId: replyToId || null,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Trigger Pusher updates on both recipient and sender channels to sync all active devices
    try {
      await pusherServer.trigger(`user-${receiverId}`, "dm", message);
      await pusherServer.trigger(`user-${session.user.id}`, "dm", message);
    } catch (pusherErr) {
      console.error("Pusher DM trigger failed:", pusherErr);
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Failed to create direct message:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

const ADMIN_EMAILS = [
  "abc@gmail.com",
  "yashd@google.com",
  "yashrahane2026@gmail.com",
  "yashd@live.com"
];

function checkIsAdmin(email?: string | null) {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { messageId, text } = body;

    if (!messageId) {
      return NextResponse.json({ error: "Message ID is required" }, { status: 400 });
    }

    const msg = await prisma.directMessage.findUnique({
      where: { id: messageId }
    });

    if (!msg) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (msg.senderId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden: You can only edit your own messages" }, { status: 403 });
    }

    const updatedMessage = await prisma.directMessage.update({
      where: { id: messageId },
      data: { text },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    try {
      await pusherServer.trigger(`user-${msg.receiverId}`, "dm-edit", updatedMessage);
      await pusherServer.trigger(`user-${msg.senderId}`, "dm-edit", updatedMessage);
    } catch (err) {
      console.error(err);
    }

    return NextResponse.json({ message: updatedMessage });
  } catch (error) {
    console.error("Edit DM error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get("messageId");

    if (!messageId) {
      return NextResponse.json({ error: "Message ID is required" }, { status: 400 });
    }

    const msg = await prisma.directMessage.findUnique({
      where: { id: messageId }
    });

    if (!msg) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const isMe = msg.senderId === session.user.id;
    const isAdmin = checkIsAdmin(session.user.email);

    if (!isMe && !isAdmin) {
      return NextResponse.json({ error: "Forbidden: Only sender or administrator can delete messages" }, { status: 403 });
    }

    await prisma.directMessage.delete({
      where: { id: messageId }
    });

    try {
      await pusherServer.trigger(`user-${msg.receiverId}`, "dm-delete", { messageId });
      await pusherServer.trigger(`user-${msg.senderId}`, "dm-delete", { messageId });
    } catch (err) {
      console.error(err);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete DM error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
