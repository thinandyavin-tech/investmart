"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const ADMIN_EMAIL = "thinandyavin@gmail.com";

async function assertAdmin(): Promise<void> {
  const session = await auth();
  if (!session?.user?.email || session.user.email.toLowerCase() !== ADMIN_EMAIL) {
    throw new Error("Forbidden");
  }
}

export async function banUser(userId: string): Promise<void> {
  await assertAdmin();
  await prisma.user.update({ where: { id: userId }, data: { bannedAt: new Date() } });
  revalidatePath("/admin");
}

export async function unbanUser(userId: string): Promise<void> {
  await assertAdmin();
  await prisma.user.update({ where: { id: userId }, data: { bannedAt: null } });
  revalidatePath("/admin");
}

export async function deleteUserPosts(userId: string): Promise<void> {
  await assertAdmin();
  await prisma.post.deleteMany({ where: { userId } });
  revalidatePath("/admin");
}
