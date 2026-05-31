import { NextRequest, NextResponse } from "next/server";
import { getSessionInfo } from "@/lib/getSession";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 40;

// GET /api/chat?cursor=<id>  — latest messages, paginated backwards
export async function GET(req: NextRequest): Promise<NextResponse> {
  const cursor = req.nextUrl.searchParams.get("cursor");

  const messages = await prisma.chatMessage.findMany({
    take:    PAGE_SIZE,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: "desc" },
    include: { author: { select: { id: true, username: true, name: true } } },
  });

  return NextResponse.json({ messages: messages.reverse() });
}

// POST /api/chat  — send a message (auth required)
export async function POST(req: NextRequest): Promise<NextResponse> {
  const { userId } = await getSessionInfo();
  if (!userId) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนส่งข้อความ" }, { status: 401 });
  }

  let content: string;
  try {
    const body = (await req.json()) as { content?: unknown };
    content    = typeof body.content === "string" ? body.content.trim() : "";
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (!content || content.length > 500) {
    return NextResponse.json({ error: "ข้อความต้องมีความยาว 1–500 ตัวอักษร" }, { status: 422 });
  }

  // Check user is not banned
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { bannedAt: true } });
  if (user?.bannedAt) {
    return NextResponse.json({ error: "บัญชีนี้ถูกระงับ" }, { status: 403 });
  }

  const msg = await prisma.chatMessage.create({
    data:    { content, authorId: userId, isSystem: false },
    include: { author: { select: { id: true, username: true, name: true } } },
  });

  return NextResponse.json({ message: msg }, { status: 201 });
}
