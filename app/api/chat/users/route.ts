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
        isOnline: !!isOnline
      };
    });

    return NextResponse.json({ users: mappedUsers });
  } catch (error) {
    console.error("Failed to fetch chat users:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
