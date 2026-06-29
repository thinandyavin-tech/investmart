import { prisma } from "@/lib/prisma";

// Guest emails use a unique UUID per browser — never a shared account
const GUEST_EMAIL_PREFIX = "guest_";
const GUEST_EMAIL_SUFFIX = "@investmart.guest";

export function guestEmail(guestId: string): string {
  return `${GUEST_EMAIL_PREFIX}${guestId}${GUEST_EMAIL_SUFFIX}`;
}

export async function getOrCreateGuestUser(guestId: string) {
  const email = guestEmail(guestId);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;

  return prisma.user.create({
    data: {
      email,
      name:    "Guest",
      cashThb: 1_250_000,
      cashUsd: 0,
    },
  });
}

export async function getGuestUserId(guestId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where:  { email: guestEmail(guestId) },
    select: { id: true },
  });
  return user?.id ?? null;
}
