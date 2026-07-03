import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureDatabase } from "@/lib/db/migrate";
import {
  findUserByEmail,
  verifyPassword,
  createToken,
  type AuthUser,
} from "@/lib/auth";
import { toPublicUser } from "@/lib/users-db";
import { jsonError, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    await ensureDatabase();
    const body = loginSchema.parse(await request.json());
    const user = await findUserByEmail(body.email);
    if (!user) return jsonError("Email atau password salah", 401);

    const valid = await verifyPassword(body.password, user.password);
    if (!valid) return jsonError("Email atau password salah", 401);
    if (user.status !== "active") return jsonError("Akun tidak aktif", 403);

    const { password: _, ...safeUser } = user;
    const token = await createToken(safeUser as AuthUser);

    return NextResponse.json({
      token,
      user: toPublicUser(safeUser as AuthUser),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
