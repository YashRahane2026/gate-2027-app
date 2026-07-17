import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  const isAdmin = session?.user?.email === "yash.dr2004@gmail.com";

  const quotes = [
    "I believe Success is a Choice.",
    "Is Discipline a Choice? Yes.",
    "Is Effort a Choice? Yes.",
    "Is Hard Work a Choice? Yes.",
    "Then Success is a Choice.",
    "BUT you have to just...",
    "WORK! WORK! WORK!"
  ];

  if (isAdmin) {
    quotes.push("No one can fucking stop you.");
  }

  return NextResponse.json({ quotes });
}
