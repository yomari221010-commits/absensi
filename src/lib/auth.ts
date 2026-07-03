import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { queryOne } from "@/lib/pg";
import { ensureDatabase } from "@/lib/db/migrate";

export type UserRole = "admin" | "employee";

export interface AuthUser {
  id: number;
  employeeId: string;
  fullname: string;
  email: string;
  phone: string | null;
  role: UserRole;
  departmentId: number | null;
  positionId: number | null;
  departmentName: string | null;
  positionName: string | null;
  profilePhoto: string | null;
  status: string;
  joinDate: string | null;
}

interface UserRow {
  id: number;
  employee_id: string;
  fullname: string;
  email: string;
  password: string;
  phone: string | null;
  department_id: number | null;
  position_id: number | null;
  role: UserRole;
  profile_photo: string | null;
  status: string;
  join_date: string | null;
  department_name: string | null;
  position_name: string | null;
}

function getJwtSecret() {
  const secret =
    process.env.JWT_SECRET ??
    (process.env.NODE_ENV === "development"
      ? "payrollin-dev-secret-min-32-characters"
      : undefined);
  if (!secret || secret.length < 16) {
    throw new Error("JWT_SECRET belum dikonfigurasi dengan benar");
  }
  return new TextEncoder().encode(secret);
}

function mapUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    employeeId: row.employee_id,
    fullname: row.fullname,
    email: row.email,
    phone: row.phone,
    role: row.role,
    departmentId: row.department_id,
    positionId: row.position_id,
    departmentName: row.department_name,
    positionName: row.position_name,
    profilePhoto: row.profile_photo,
    status: row.status,
    joinDate: row.join_date,
  };
}

const USER_SELECT = `
  SELECT u.*, d.name AS department_name, p.name AS position_name
  FROM users u
  LEFT JOIN departments d ON d.id = u.department_id
  LEFT JOIN positions p ON p.id = u.position_id
`;

export async function findUserByEmail(email: string): Promise<(AuthUser & { password: string }) | null> {
  await ensureDatabase();
  const row = await queryOne<UserRow>(`${USER_SELECT} WHERE u.email = $1`, [
    email.toLowerCase().trim(),
  ]);
  if (!row) return null;
  return { ...mapUser(row), password: row.password };
}

export async function findUserById(id: number): Promise<AuthUser | null> {
  await ensureDatabase();
  const row = await queryOne<UserRow>(`${USER_SELECT} WHERE u.id = $1`, [id]);
  return row ? mapUser(row) : null;
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function createToken(user: AuthUser) {
  return new SignJWT({ sub: String(user.id), role: user.role, email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getJwtSecret());
}

export async function verifyToken(token: string): Promise<{ userId: number; role: UserRole }> {
  const { payload } = await jwtVerify(token, getJwtSecret());
  const userId = Number(payload.sub);
  const role = payload.role as UserRole;
  if (!userId || (role !== "admin" && role !== "employee")) {
    throw new Error("Token tidak valid");
  }
  return { userId, role };
}

export function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7).trim();
}

export async function getAuthUser(request: Request): Promise<AuthUser | null> {
  const token = getBearerToken(request);
  if (!token) return null;
  try {
    const { userId } = await verifyToken(token);
    const user = await findUserById(userId);
    if (!user || user.status !== "active") return null;
    return user;
  } catch {
    return null;
  }
}

export function requireAuth(user: AuthUser | null): AuthUser {
  if (!user) throw new Error("Unauthorized");
  return user;
}

export function requireAdmin(user: AuthUser): void {
  if (user.role !== "admin") throw new Error("Forbidden");
}
