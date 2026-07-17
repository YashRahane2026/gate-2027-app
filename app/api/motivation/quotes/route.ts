import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  const isAdmin = session?.user?.email === "yash.dr2004@gmail.com";

  const quotes = [
    "I believe success is a choice.",
    "Is discipline a choice? Yes.",
    "Is effort a choice? Yes.",
    "Is hard work a choice? Yes.",
    "Then success is a choice."
  ];

  if (isAdmin) {
    quotes.push("No one can fucking stop you.");
  }

  return NextResponse.json({ quotes });
}
