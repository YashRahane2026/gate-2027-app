import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getISTDateString } from "@/lib/config";
import { z } from "zod";
import { pusherServer, PUSHER_CHANNELS, PUSHER_EVENTS } from "@/lib/pusher";

const sessionSchema = z.object({
  subject: z.string().optional(),
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

    const { startTime, endTime, durationMinutes } = parsed.data;
    const rawSubject = parsed.data.subject ?? "";
    const subject = rawSubject.trim() || "General Study";

    // Set date string in IST based on when the session ended
    const date = getISTDateString(new Date(endTime));

    // Deduplication check: prevent rapid duplicate submissions of identical request within 15 seconds
    const fifteenSecsAgo = new Date(Date.now() - 15 * 1000);
    const duplicateSubmission = await prisma.studySession.findFirst({
      where: {
        userId: session.user.id,
        durationMinutes,
        createdAt: {
          gte: fifteenSecsAgo,
        },
      },
    });

    if (duplicateSubmission) {
      return NextResponse.json({ session: duplicateSubmission }, { status: 200 });
    }

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
