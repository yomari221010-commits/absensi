import { query, queryOne } from "@/lib/pg";
import { createNotification, notifyAdmins } from "@/lib/notifications-db";

export interface ReimbursementRecord {
  id: number;
  userId: number;
  fullname?: string;
  title: string;
  description: string | null;
  amount: number;
  receipt: string | null;
  status: string;
  decisionNote: string | null;
  createdAt: string;
}

function mapReim(row: Record<string, unknown>): ReimbursementRecord {
  return {
    id: row.id as number,
    userId: row.user_id as number,
    fullname: row.fullname as string | undefined,
    title: row.title as string,
    description: row.description as string | null,
    amount: Number(row.amount),
    receipt: row.receipt as string | null,
    status: row.status as string,
    decisionNote: row.decision_note as string | null,
    createdAt: row.created_at as string,
  };
}

export async function listReimbursementsForUser(userId: number) {
  const { rows } = await query(
    `SELECT * FROM reimbursement WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return rows.map(mapReim);
}

export async function listAllReimbursements() {
  const { rows } = await query(
    `SELECT r.*, u.fullname FROM reimbursement r
     JOIN users u ON u.id = r.user_id ORDER BY r.created_at DESC`
  );
  return rows.map(mapReim);
}

export async function createReimbursement(
  userId: number,
  data: { title: string; description?: string; amount: number; receipt?: string }
) {
  const row = await queryOne(
    `INSERT INTO reimbursement (user_id, title, description, amount, receipt)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [userId, data.title, data.description ?? null, data.amount, data.receipt ?? null]
  );
  await notifyAdmins(
    "Reimbursement Baru",
    `Pengajuan reimbursement "${data.title}" menunggu review.`,
    "approval"
  );
  return mapReim(row!);
}

export async function updateReimbursementStatus(
  id: number,
  adminId: number,
  status: "approved" | "rejected",
  decisionNote?: string
) {
  const existing = await queryOne<{ user_id: number; title: string }>(
    `SELECT user_id, title FROM reimbursement WHERE id = $1`,
    [id]
  );
  if (!existing) throw new Error("Pengajuan tidak ditemukan");

  await query(
    `UPDATE reimbursement SET status = $1, approved_by = $2, decision_note = $3, updated_at = NOW()
     WHERE id = $4`,
    [status, adminId, decisionNote ?? null, id]
  );

  await createNotification(
    existing.user_id,
    status === "approved" ? "Reimbursement Disetujui" : "Reimbursement Ditolak",
    `"${existing.title}" telah ${status === "approved" ? "disetujui" : "ditolak"}.`,
    "approval"
  );

  const row = await queryOne(`SELECT * FROM reimbursement WHERE id = $1`, [id]);
  return mapReim(row!);
}
