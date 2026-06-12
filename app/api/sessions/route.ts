import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getISTDateString } from "@/lib/config";
import { z } from "zod";
import { pusherServer, PUSHER_CHANNELS, PUSHER_EVENTS } from "@/lib/pusher";

const sessionSchema = z.object({
  subject: z.string().min(1),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  durationMinutes: z.number().int().positive(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? getISTDateString();

  const sessions = await prisma.studySession.findMany({
    where: { userId: session.user.id, date },
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json({ sessions });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = sessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { subject, startTime, endTime, durationMinutes } = parsed.data;
    const date = getISTDateString(new Date(startTime));

    const studySession = await prisma.studySession.create({
      data: {
        userId: session.user.id,
        subject,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        durationMinutes,
        date,
      },
    });

    // Trigger Pusher event for real-time leaderboard update
    try {
      await pusherServer.trigger(
        PUSHER_CHANNELS.STUDY_GROUP,
        PUSHER_EVENTS.SESSION_COMPLETED,
        {
          userId: session.user.id,
          userName: session.user.name,
          durationMinutes,
          subject,
        }
      );
    } catch (pusherErr) {
      console.error("Pusher trigger failed:", pusherErr);
      // Non-fatal — don't fail the request
    }

    return NextResponse.json({ session: studySession }, { status: 201 });
  } catch (error) {
    console.error("Session creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
