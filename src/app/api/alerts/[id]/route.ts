import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/getSession";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "ยังไม่ได้เข้าสู่ระบบ" }, { status: 401 });

  const { id } = await params;
  const alert = await prisma.priceAlert.findUnique({ where: { id } });
  if (!alert || alert.userId !== userId) {
    return NextResponse.json({ error: "ไม่พบ" }, { status: 404 });
  }

  await prisma.priceAlert.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
