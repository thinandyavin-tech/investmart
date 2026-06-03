import webpush from "web-push";
import { prisma } from "@/lib/prisma";

let configured = false;

function configure() {
  if (configured) return;
  const pub  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subj = process.env.VAPID_SUBJECT ?? "mailto:admin@investmart.app";
  if (!pub || !priv) return;
  webpush.setVapidDetails(subj, pub, priv);
  configured = true;
}

export interface PushPayload {
  title: string;
  body:  string;
  url?:  string;
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  configure();
  if (!configured) return;

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return;

  const json = JSON.stringify(payload);
  const dead: string[] = [];

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          json,
        );
      } catch (err: unknown) {
        // 404/410 = subscription expired; clean it up
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) dead.push(sub.endpoint);
      }
    }),
  );

  if (dead.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: dead } } });
  }
}
