import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const syllabusItemSchema = z.object({
  subject: z.string().min(1),
  itemName: z.string().min(1),
  itemType: z.enum(["Lecture", "Weekly Quiz", "Chapter Test"]).optional().default("Lecture"),
  notes: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await prisma.syllabusItem.findMany({
    where: { userId: session.user.id, parentId: null },
    include: {
      subItems: {
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = syllabusItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const item = await prisma.syllabusItem.create({
    data: {
      userId: session.user.id,
      subject: parsed.data.subject,
      itemName: parsed.data.itemName,
      itemType: parsed.data.itemType,
      notes: parsed.data.notes || undefined,
      parentId: parsed.data.parentId || null,
    },
  });

  return NextResponse.json({ item }, { status: 201 });
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

  const item = await prisma.syllabusItem.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!item) {
    return NextResponse.json({ error: "Syllabus item not found" }, { status: 404 });
  }

  if (item.parentId === null) {
    // Parent item (Chapter): Toggle itself and all its sub-items
    await prisma.$transaction([
      prisma.syllabusItem.update({
        where: { id },
        data: { isCompleted },
      }),
      prisma.syllabusItem.updateMany({
        where: { parentId: id },
        data: { isCompleted },
      }),
    ]);
  } else {
    // Child item (Lecture/detail): Toggle itself
    await prisma.syllabusItem.update({
      where: { id },
      data: { isCompleted },
    });

    // Check sibling states to update the parent completion
    const siblings = await prisma.syllabusItem.findMany({
      where: { parentId: item.parentId, userId: session.user.id },
    });
    const allCompleted = siblings.every((s) => s.isCompleted);

    await prisma.syllabusItem.update({
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

  await prisma.syllabusItem.deleteMany({
    where: { id, userId: session.user.id },
  });

  return NextResponse.json({ success: true });
}
