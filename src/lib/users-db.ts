import bcrypt from "bcryptjs";
import { query, queryOne } from "@/lib/pg";
import type { AuthUser } from "@/lib/auth";

export async function listUsers() {
  const { rows } = await query(
    `SELECT u.id, u.employee_id, u.fullname, u.email, u.phone, u.role, u.status,
            u.join_date, d.name AS department_name, p.name AS position_name
     FROM users u
     LEFT JOIN departments d ON d.id = u.department_id
     LEFT JOIN positions p ON p.id = u.position_id
     ORDER BY u.fullname`
  );
  return rows;
}

export async function createUser(data: {
  employeeId: string;
  fullname: string;
  email: string;
  password: string;
  phone?: string;
  departmentId?: number;
  positionId?: number;
  role?: "admin" | "employee";
}) {
  const hash = await bcrypt.hash(data.password, 10);
  const row = await queryOne(
    `INSERT INTO users (employee_id, fullname, email, password, phone, department_id, position_id, role, join_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [
      data.employeeId,
      data.fullname,
      data.email.toLowerCase(),
      hash,
      data.phone ?? null,
      data.departmentId ?? null,
      data.positionId ?? null,
      data.role ?? "employee",
      new Date().toISOString().slice(0, 10),
    ]
  );
  return row;
}

export async function updateUser(
  id: number,
  data: Partial<{
    fullname: string;
    phone: string;
    departmentId: number;
    positionId: number;
    status: string;
    role: string;
  }>
) {
  await query(
    `UPDATE users SET
      fullname = COALESCE($1, fullname),
      phone = COALESCE($2, phone),
      department_id = COALESCE($3, department_id),
      position_id = COALESCE($4, position_id),
      status = COALESCE($5, status),
      role = COALESCE($6, role),
      updated_at = NOW()
     WHERE id = $7`,
    [
      data.fullname ?? null,
      data.phone ?? null,
      data.departmentId ?? null,
      data.positionId ?? null,
      data.status ?? null,
      data.role ?? null,
      id,
    ]
  );
}

export async function deleteUser(id: number) {
  await query(`DELETE FROM users WHERE id = $1 AND role != 'admin'`, [id]);
}

export async function getAdminDashboard() {
  const [users, attendance, leaves, reim] = await Promise.all([
    queryOne<{ total: string }>(`SELECT COUNT(*)::text AS total FROM users WHERE status = 'active'`),
    query<{ status: string; count: string }>(
      `SELECT status, COUNT(*)::text AS count FROM attendance
       WHERE date_key = TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') GROUP BY status`
    ),
    queryOne<{ pending: string }>(
      `SELECT COUNT(*)::text AS pending FROM leave_requests WHERE status = 'pending'`
    ),
    queryOne<{ pending: string }>(
      `SELECT COUNT(*)::text AS pending FROM reimbursement WHERE status = 'pending'`
    ),
  ]);

  const todayStats = { hadir: 0, telat: 0, izin: 0, cuti: 0, sakit: 0, absent: 0, wfh: 0 };
  for (const r of attendance.rows) {
    const k = r.status as keyof typeof todayStats;
    if (k in todayStats) todayStats[k] = Number(r.count);
  }

  const weekly = await query<{ day: string; hadir: string; telat: string }>(
    `SELECT TO_CHAR(d::date, 'Dy') AS day,
            COUNT(*) FILTER (WHERE a.status = 'hadir')::text AS hadir,
            COUNT(*) FILTER (WHERE a.status = 'telat')::text AS telat
     FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day') d
     LEFT JOIN attendance a ON a.date_key = TO_CHAR(d::date, 'YYYY-MM-DD')
     GROUP BY d ORDER BY d`
  );

  return {
    totalEmployees: Number(users?.total ?? 0),
    todayStats,
    pendingLeaves: Number(leaves?.pending ?? 0),
    pendingReimbursements: Number(reim?.pending ?? 0),
    weeklyChart: weekly.rows.map((r) => ({
      day: r.day,
      hadir: Number(r.hadir),
      telat: Number(r.telat),
    })),
  };
}

export function toPublicUser(user: AuthUser) {
  return {
    id: user.id,
    employeeId: user.employeeId,
    fullname: user.fullname,
    email: user.email,
    phone: user.phone,
    role: user.role,
    department: user.departmentName,
    position: user.positionName,
    profilePhoto: user.profilePhoto,
    joinDate: user.joinDate,
  };
}
