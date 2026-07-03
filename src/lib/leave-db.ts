import { query, queryOne } from "@/lib/pg";
import { createNotification, notifyAdmins } from "@/lib/notifications-db";

export interface LeaveRecord {
  id: number;
  userId: number;
  fullname?: string;
  leaveType: string;
  reason: string;
  startDate: string;
  endDate: string;
  attachment: string | null;
  status: string;
  decisionNote: string | null;
  createdAt: string;
}

function mapLeave(row: Record<string, unknown>): LeaveRecord {
  return {
    id: row.id as number,
    userId: row.user_id as number,
    fullname: row.fullname as string | undefined,
    leaveType: row.leave_type as string,
    reason: row.reason as string,
    startDate: row.start_date as string,
    endDate: row.end_date as string,
    attachment: row.attachment as string | null,
    status: row.status as string,
    decisionNote: row.decision_note as string | null,
    createdAt: row.created_at as string,
  };
}

export async function listLeavesForUser(userId: number) {
  const { rows } = await query(
    `SELECT * FROM leave_requests WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return rows.map(mapLeave);
}

export async function listAllLeaves() {
  const { rows } = await query(
    `SELECT l.*, u.fullname FROM leave_requests l
     JOIN users u ON u.id = l.user_id ORDER BY l.created_at DESC`
  );
  return rows.map(mapLeave);
}

export async function createLeave(
  userId: number,
  data: {
    leaveType: string;
    reason: string;
    startDate: string;
    endDate: string;
    attachment?: string;
  }
) {
  const row = await queryOne(
    `INSERT INTO leave_requests (user_id, leave_type, reason, start_date, end_date, attachment)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [
      userId,
      data.leaveType.toLowerCase(),
      data.reason,
      data.startDate,
      data.endDate,
      data.attachment ?? null,
    ]
  );
  await notifyAdmins(
    "Pengajuan Izin Baru",
    `Ada pengajuan ${data.leaveType} baru menunggu review.`,
    "approval"
  );
  return mapLeave(row!);
}

export async function updateLeaveStatus(
  id: number,
  adminId: number,
  status: "approved" | "rejected",
  decisionNote?: string
) {
  const existing = await queryOne<{ user_id: number; leave_type: string }>(
    `SELECT user_id, leave_type FROM leave_requests WHERE id = $1`,
    [id]
  );
  if (!existing) throw new Error("Pengajuan tidak ditemukan");

  await query(
    `UPDATE leave_requests SET status = $1, approved_by = $2, decision_note = $3, updated_at = NOW()
     WHERE id = $4`,
    [status, adminId, decisionNote ?? null, id]
  );

  await createNotification(
    existing.user_id,
    status === "approved" ? "Pengajuan Disetujui" : "Pengajuan Ditolak",
    `Pengajuan ${existing.leave_type} Anda telah ${status === "approved" ? "disetujui" : "ditolak"}.`,
    "approval"
  );

  const row = await queryOne(`SELECT * FROM leave_requests WHERE id = $1`, [id]);
  return mapLeave(row!);
}
