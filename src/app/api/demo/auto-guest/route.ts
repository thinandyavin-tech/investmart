import { type NextRequest, NextResponse } from "next/server";
import { getOrCreateGuestUser }          from "@/lib/demoSession";
import { signDemoCookie }                from "@/lib/demoCookie";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const guestId = crypto.randomUUID();
  const guest   = await getOrCreateGuestUser(guestId);

  const home = new URL("/", request.url);
  const res  = NextResponse.redirect(home);
  res.cookies.set("demo_user_id", signDemoCookie(guest.id), {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   60 * 60 * 24 * 30,
    path:     "/",
  });
  return res;
}
