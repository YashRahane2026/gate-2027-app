import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const messages = await prisma.chatMessage.findMany({
      take: 50,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        replyTo: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Return in chronological order
    return NextResponse.json({ messages: messages.reverse() });
  } catch (error) {
    console.error("Failed to fetch group chat messages:", error);
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
    const { text, attachmentUrl, attachmentName, replyToId } = body;

    if (!text && !attachmentUrl) {
      return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
    }

    const message = await prisma.chatMessage.create({
      data: {
        userId: session.user.id,
        text: text || "",
        attachmentUrl: attachmentUrl || null,
        attachmentName: attachmentName || null,
        replyToId: replyToId || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        replyTo: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Trigger real-time update via Pusher
    try {
      await pusherServer.trigger("chat", "message", message);
    } catch (pusherErr) {
      console.error("Pusher group chat trigger failed:", pusherErr);
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Failed to create group chat message:", error);
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

    const msg = await prisma.chatMessage.findUnique({
      where: { id: messageId }
    });

    if (!msg) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (msg.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden: You can only edit your own messages" }, { status: 403 });
    }

    const updatedMessage = await prisma.chatMessage.update({
      where: { id: messageId },
      data: { text },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        replyTo: {
          include: {
            user: {
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
      await pusherServer.trigger("chat", "message-edit", updatedMessage);
    } catch (err) {
      console.error(err);
    }

    return NextResponse.json({ message: updatedMessage });
  } catch (error) {
    console.error("Edit message error:", error);
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

    const msg = await prisma.chatMessage.findUnique({
      where: { id: messageId }
    });

    if (!msg) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const isMe = msg.userId === session.user.id;
    const isAdmin = checkIsAdmin(session.user.email);

    if (!isMe && !isAdmin) {
      return NextResponse.json({ error: "Forbidden: Only sender or administrator can delete messages" }, { status: 403 });
    }

    await prisma.chatMessage.delete({
      where: { id: messageId }
    });

    try {
      await pusherServer.trigger("chat", "message-delete", { messageId });
    } catch (err) {
      console.error(err);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete message error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
