import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(): Promise<NextResponse> {
  const jar = await cookies();
  jar.delete("demo_user_id");
  return NextResponse.json({ ok: true });
}
