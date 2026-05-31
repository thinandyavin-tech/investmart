import { NextResponse } from "next/server";
import { getOrCreateDemoUser } from "@/lib/demoSession";
import { cookies } from "next/headers";

export async function POST() {
  const user = await getOrCreateDemoUser();

  const cookieStore = await cookies();
  cookieStore.set("demo_user_id", user.id, {
    httpOnly: true,
    sameSite: "lax",
    maxAge:   60 * 60 * 24 * 30,
    path:     "/",
  });

  return NextResponse.json({ id: user.id, name: user.name, cashThb: user.cashThb, cashUsd: user.cashUsd });
}
