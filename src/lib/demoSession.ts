import { prisma } from "@/lib/prisma";

const DEMO_USER_EMAIL = "demo@investmart.local";

export async function getOrCreateDemoUser() {
  const existing = await prisma.user.findUnique({
    where: { email: DEMO_USER_EMAIL },
  });
  if (existing) return existing;

  return prisma.user.create({
    data: {
      email:    DEMO_USER_EMAIL,
      name:     "Demo User",
      username: "demo",
      cashThb:  1_250_000,
      cashUsd:  0,
    },
  });
}

export async function getDemoUserId(): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where:  { email: DEMO_USER_EMAIL },
    select: { id: true },
  });
  return user?.id ?? null;
}
