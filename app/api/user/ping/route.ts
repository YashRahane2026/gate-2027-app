import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { lastActive: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ping failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
