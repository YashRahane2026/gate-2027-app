import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getISTDateString } from "@/lib/config";
import { z } from "zod";

const todoSchema = z.object({
  text: z.string().min(1),
  targetDetail: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = getISTDateString();

  const todos = await prisma.todoItem.findMany({
    where: { userId: session.user.id, date: today, parentId: null },
    include: {
      subItems: {
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ todos });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = todoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const today = getISTDateString();

  const todo = await prisma.todoItem.create({
    data: {
      userId: session.user.id,
      text: parsed.data.text,
      targetDetail: parsed.data.targetDetail || undefined,
      parentId: parsed.data.parentId || null,
      date: today,
    },
  });

  return NextResponse.json({ todo }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, isCompleted } = body;

  if (!id || typeof isCompleted !== "boolean") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const item = await prisma.todoItem.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!item) {
    return NextResponse.json({ error: "Todo not found" }, { status: 404 });
  }

  if (item.parentId === null) {
    // Parent item (Subject): Toggle itself and all its sub-items
    await prisma.$transaction([
      prisma.todoItem.update({
        where: { id },
        data: { isCompleted },
      }),
      prisma.todoItem.updateMany({
        where: { parentId: id },
        data: { isCompleted },
      }),
    ]);
  } else {
    // Child item (Lecture/detail): Toggle itself
    await prisma.todoItem.update({
      where: { id },
      data: { isCompleted },
    });

    // Check sibling states to update the parent completion
    const siblings = await prisma.todoItem.findMany({
      where: { parentId: item.parentId, userId: session.user.id },
    });
    const allCompleted = siblings.every((s) => s.isCompleted);

    await prisma.todoItem.update({
      where: { id: item.parentId },
      data: { isCompleted: allCompleted },
    });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  await prisma.todoItem.deleteMany({
    where: { id, userId: session.user.id },
  });

  return NextResponse.json({ success: true });
}
