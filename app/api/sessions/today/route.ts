import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getISTDateString } from "@/lib/config";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = getISTDateString();

  const result = await prisma.studySession.aggregate({
    where: { userId: session.user.id, date: today },
    _sum: { durationMinutes: true },
  });

  const totalMinutes = result._sum.durationMinutes ?? 0;

  return NextResponse.json({ totalMinutes, date: today });
}
