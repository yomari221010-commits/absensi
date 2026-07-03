import { query, queryOne } from "@/lib/pg";

export async function createNotification(
  userId: number,
  title: string,
  message: string,
  type = "system"
) {
  await query(
    `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
    [userId, title, message, type]
  );
}

export async function listNotifications(userId: number) {
  const { rows } = await query<{
    id: number;
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    created_at: string;
  }>(
    `SELECT id, title, message, type, is_read, created_at
     FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [userId]
  );
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.message,
    type: r.type,
    read: r.is_read,
    time: new Date(r.created_at).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));
}

export async function markNotificationRead(userId: number, id: number) {
  await query(
    `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
}

export async function markAllNotificationsRead(userId: number) {
  await query(`UPDATE notifications SET is_read = TRUE WHERE user_id = $1`, [userId]);
}

export async function notifyAdmins(title: string, message: string, type = "approval") {
  const { rows } = await query<{ id: number }>(
    `SELECT id FROM users WHERE role = 'admin' AND status = 'active'`
  );
  for (const admin of rows) {
    await createNotification(admin.id, title, message, type);
  }
}

export async function listAdmins() {
  const { rows } = await query<{ id: number }>(
    `SELECT id FROM users WHERE role = 'admin' AND status = 'active'`
  );
  return rows;
}
