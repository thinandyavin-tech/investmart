import { type NextRequest, NextResponse } from "next/server";
import { getOrCreateGuestUser }          from "@/lib/demoSession";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const guestId = crypto.randomUUID();
  const guest   = await getOrCreateGuestUser(guestId);

  const home = new URL("/", request.url);
  const res  = NextResponse.redirect(home);
  res.cookies.set("demo_user_id", guest.id, {
    httpOnly: true,
    sameSite: "lax",
    maxAge:   60 * 60 * 24 * 30,
    path:     "/",
  });
  return res;
}
