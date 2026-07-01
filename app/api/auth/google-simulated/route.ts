import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Google email and password are required" }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();

    // Verify if it is a gmail address or any other email
    if (!emailLower.includes("@")) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: emailLower }
    });

    if (!existingUser) {
      // Auto-register the new Google user
      const hashedPassword = await bcrypt.hash(password, 10);
      await prisma.user.create({
        data: {
          email: emailLower,
          name: emailLower.split("@")[0], // Set name to email prefix
          hashedPassword
        }
      });
    } else {
      // Validate password if user exists (to prevent logging into someone else's account)
      if (existingUser.hashedPassword) {
        const isValid = await bcrypt.compare(password, existingUser.hashedPassword);
        if (!isValid) {
          return NextResponse.json({ error: "Invalid password for this Google account" }, { status: 401 });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Google simulated login error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
