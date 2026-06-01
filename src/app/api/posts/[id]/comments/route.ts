import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/getSession";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { validateContent } from "@/lib/postUtils";

const CommentSchema = z.object({
  content:  z.string().min(1).max(500),
  parentId: z.string().optional(),
});

const commentSelect = {
  id:        true,
  content:   true,
  parentId:  true,
  createdAt: true,
  user: {
    select: { id: true, name: true, username: true },
  },
} as const;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;

  const comments = await prisma.comment.findMany({
    where:   { postId, parentId: null },
    orderBy: { createdAt: "asc" },
    select:  commentSelect,
    take:    50,
  });

  return NextResponse.json({ data: comments });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 });
  }

  const { id: postId } = await params;

  const parseResult = CommentSchema.safeParse(await request.json().catch(() => null));
  if (!parseResult.success) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 422 });
  }

  const { content: raw, parentId } = parseResult.data;
  const content = validateContent(raw);
  if (!content) {
    return NextResponse.json({ error: "เนื้อหาไม่ถูกต้อง" }, { status: 422 });
  }

  const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true, userId: true, ticker: true } });
  if (!post) return NextResponse.json({ error: "ไม่พบโพสต์" }, { status: 404 });

  const comment = await prisma.comment.create({
    data:   { postId, userId, content, parentId },
    select: commentSelect,
  });

  // Notify post owner
  if (post.userId !== userId) {
    const commenter = await prisma.user.findUnique({ where: { id: userId }, select: { username: true, name: true } });
    const from = commenter?.username ?? commenter?.name ?? "ผู้ใช้";
    await prisma.notification.create({
      data: {
        userId:  post.userId,
        type:    "comment",
        message: `${from} แสดงความคิดเห็นในโพสต์ของคุณ`,
        link:    `/u/${commenter?.username ?? userId}`,
      },
    });
  }

  return NextResponse.json(comment, { status: 201 });
}
