import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      where: {
        id: { not: session.user.id }
      },
      select: {
        id: true,
        name: true,
        image: true,
        lastActive: true
      },
      orderBy: {
        name: "asc"
      }
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Failed to fetch chat users:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
