import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { applyRateLimit } from "@/lib/rateLimit";

const BCRYPT_ROUNDS = 12;

const SignupSchema = z.object({
  email:    z.string().email("อีเมลไม่ถูกต้อง").max(254).transform((s) => s.toLowerCase().trim()),
  password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร").max(128),
  username: z.string().regex(/^[a-zA-Z0-9_]{3,30}$/, "3-30 ตัวอักษร a-z 0-9 _").optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const limited = await applyRateLimit(req, "auth");
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = SignupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" },
      { status: 422 }
    );
  }

  const { email, password, username } = parsed.data;
  if (email.endsWith("@investmart.guest")) {
    return NextResponse.json({ error: "อีเมลไม่ถูกต้อง" }, { status: 422 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "อีเมลนี้ถูกใช้แล้ว" }, { status: 409 });
  }

  if (username) {
    const takenBy = await prisma.user.findUnique({ where: { username } });
    if (takenBy) {
      return NextResponse.json({ error: "Username นี้ถูกใช้แล้ว" }, { status: 409 });
    }
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      username:  username ?? null,
      cashThb:   1_250_000,
      cashUsd:   0,
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
