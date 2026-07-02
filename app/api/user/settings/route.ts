import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, password, image } = body;

    const emailLower = session.user.email.toLowerCase().trim();

    // 1. Enforce name policy
    if (name) {
      const nameTrimmed = name.trim();
      if (nameTrimmed.length < 2) {
        return NextResponse.json({ error: "Name must be at least 2 characters" }, { status: 400 });
      }

      if (nameTrimmed.toLowerCase().includes("admin") && emailLower !== "yash.dr2004@gmail.com") {
        return NextResponse.json(
          { error: "Only the designated administrator can use the word 'Admin' in their name" },
          { status: 400 }
        );
      }
    }

    // 2. Prepare update data
    const updateData: {
      name?: string;
      image?: string | null;
      hashedPassword?: string;
    } = {};
    if (name) {
      updateData.name = name.trim();
    }
    if (image !== undefined) {
      updateData.image = image;
    }
    if (password) {
      const passwordTrimmed = password.trim();
      if (passwordTrimmed.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
      }
      updateData.hashedPassword = await bcrypt.hash(passwordTrimmed, 12);
    }

    // 3. Update in database
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true
      }
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Profile settings update error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
