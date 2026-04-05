/**
 * Browser push (Web Push API + VAPID).
 * Generate keys: npx web-push generate-vapid-keys
 * Env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL
 */
import webpush from "web-push";
import { neon } from "@neondatabase/serverless";

function configureWebPush(): boolean {
  const pub = process.env.VAPID_PUBLIC_KEY?.trim();
  const priv = process.env.VAPID_PRIVATE_KEY?.trim();
  const mail = process.env.VAPID_EMAIL?.trim() || "noreply@traintopass.com";
  if (!pub || !priv) return false;
  try {
    webpush.setVapidDetails(`mailto:${mail}`, pub, priv);
    return true;
  } catch {
    return false;
  }
}

async function pushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string }
): Promise<void> {
  if (!configureWebPush()) return;
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return;
  const sql = neon(url);
  let rows: { endpoint: string; p256dh: string; auth: string }[] = [];
  try {
    rows = (await sql`
      SELECT endpoint, p256dh, auth
      FROM push_subscriptions
      WHERE user_id = ${userId}::uuid
    `) as typeof rows;
  } catch {
    return;
  }
  const buf = Buffer.from(
    JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url ?? "/dashboard",
    }),
    "utf8"
  );
  for (const sub of rows) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        buf
      );
    } catch {
      /* silent */
    }
  }
}

export async function sendStreakReminder(
  userId: string,
  dayStreak: number
): Promise<void> {
  let enabled = true;
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    try {
      const sql = neon(url);
      const r = (await sql`
        SELECT notification_streak_enabled FROM users WHERE id = ${userId}::uuid
      `) as { notification_streak_enabled: boolean | null }[];
      if (r[0]?.notification_streak_enabled === false) enabled = false;
    } catch {
      /* silent */
    }
  }
  if (!enabled) return;
  await pushToUser(userId, {
    title: "Train to Pass",
    body: `🔥 Day ${dayStreak} streak — don't break it! Complete today's challenge.`,
    url: "/challenge",
  });
}

export async function sendChallengeNotification(
  userId: string,
  challengeTitle: string
): Promise<void> {
  let enabled = true;
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    try {
      const sql = neon(url);
      const r = (await sql`
        SELECT notification_challenge_enabled FROM users WHERE id = ${userId}::uuid
      `) as { notification_challenge_enabled: boolean | null }[];
      if (r[0]?.notification_challenge_enabled === false) enabled = false;
    } catch {
      /* silent */
    }
  }
  if (!enabled) return;
  const preview =
    challengeTitle.length > 80
      ? `${challengeTitle.slice(0, 77)}…`
      : challengeTitle;
  await pushToUser(userId, {
    title: "Train to Pass",
    body: `⚔️ Today's challenge is live: ${preview}. Can you beat it?`,
    url: "/challenge",
  });
}

export async function sendUnitAnnouncement(
  groupId: string,
  message: string
): Promise<void> {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return;
  const sql = neon(url);
  let userIds: string[] = [];
  try {
    const rows = (await sql`
      SELECT gm.user_id::text AS user_id
      FROM group_members gm
      INNER JOIN users u ON u.id = gm.user_id
      WHERE gm.group_id = ${groupId}::uuid
        AND COALESCE(u.notification_unit_enabled, true) = true
    `) as { user_id: string }[];
    userIds = rows.map((r) => String(r.user_id));
  } catch {
    return;
  }
  const preview =
    message.trim().length > 100
      ? `${message.trim().slice(0, 97)}…`
      : message.trim();
  const body = `📢 Your unit posted: ${preview}`;
  for (const uid of userIds) {
    await pushToUser(uid, {
      title: "Train to Pass",
      body,
      url: `/groups/${groupId}`,
    });
  }
}
