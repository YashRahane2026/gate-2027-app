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
