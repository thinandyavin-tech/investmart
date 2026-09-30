import { NextRequest, NextResponse } from "next/server";
import { getOrCreateGuestUser }      from "@/lib/demoSession";
import { signDemoCookie }                from "@/lib/demoCookie";
import { cookies }                   from "next/headers";
import { z }                         from "zod";

const BodySchema = z.object({
  guestId: z.string().uuid(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "invalid JSON" }, { status: 400 }); }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "guestId must be a valid UUID" }, { status: 422 });
  }

  const user = await getOrCreateGuestUser(parsed.data.guestId);

  const jar = await cookies();
  jar.set("demo_user_id", signDemoCookie(user.id), {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   60 * 60 * 24 * 30,
    path:     "/",
  });

  return NextResponse.json({
    id:      user.id,
    name:    user.name,
    cashThb: user.cashThb,
    cashUsd: user.cashUsd,
  });
}
