import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

// The demo_user_id cookie used to hold a bare user id, so anyone could paste a real
// user's id (e.g. from the leaderboard) into the cookie and act as them.
// It is now "<userId>.<hmac>" signed with AUTH_SECRET, and only guest accounts are accepted.

export const DEMO_COOKIE = "demo_user_id";
const GUEST_EMAIL_SUFFIX = "@investmart.guest";

function sign(userId: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return createHmac("sha256", secret).update(`demo:${userId}`).digest("base64url");
}

export function signDemoCookie(userId: string): string {
  return `${userId}.${sign(userId)}`;
}

/** Returns the guest user id from a demo cookie, or null if it is forged or not a guest. */
export async function verifyDemoCookie(value: string | undefined): Promise<string | null> {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot > 0) {
    const userId = value.slice(0, dot);
    const given  = Buffer.from(value.slice(dot + 1));
    const wanted = Buffer.from(sign(userId));
    return given.length === wanted.length && timingSafeEqual(given, wanted) ? userId : null;
  }
  // Legacy unsigned cookie (issued before signing): only honour it for guest accounts,
  // never for a real signed-up user.
  const user = await prisma.user.findUnique({ where: { id: value }, select: { email: true } });
  return user?.email?.endsWith(GUEST_EMAIL_SUFFIX) ? value : null;
}
