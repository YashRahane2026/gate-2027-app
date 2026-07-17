import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  const isAdmin = session?.user?.email === "yash.dr2004@gmail.com";

  const quotes = [
    { text: "I believe success is a choice.", action: "type" },
    { text: "Is discipline a choice?", action: "type" },
    { text: " Yes.", action: "append", delayBefore: 800 },
    { text: "Is effort a choice?", action: "type" },
    { text: " Yes.", action: "append", delayBefore: 800 },
    { text: "Is hard work a choice?", action: "type" },
    { text: " Yes.", action: "append", delayBefore: 800 },
    { text: "Then success is a choice.", action: "type", delayAfter: 3000 }
  ];

  if (isAdmin) {
    quotes.push({ text: "No one can fucking stop you.", action: "type", delayAfter: 4000 });
  }

  return NextResponse.json({ quotes });
}
