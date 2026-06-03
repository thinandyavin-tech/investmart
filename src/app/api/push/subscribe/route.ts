import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/getSession";

export const dynamic = "force-dynamic";

const SubscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth:   z.string().min(1),
  }),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body   = await request.json().catch(() => null);
  const parsed = SubscribeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid subscription" }, { status: 422 });

  const { endpoint, keys } = parsed.data;

  await prisma.pushSubscription.upsert({
    where:  { endpoint },
    update: { userId, p256dh: keys.p256dh, auth: keys.auth },
    create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}) as { endpoint?: string });
  const endpoint = (body as { endpoint?: string }).endpoint;
  if (!endpoint) return NextResponse.json({ error: "Missing endpoint" }, { status: 422 });

  await prisma.pushSubscription.deleteMany({
    where: { userId, endpoint },
  });
  return NextResponse.json({ ok: true });
}
