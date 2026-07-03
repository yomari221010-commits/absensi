import { z } from "zod";
import { getAuthUser, requireAuth, requireAdmin } from "@/lib/auth";
import { listUsers, createUser, updateUser, deleteUser } from "@/lib/users-db";
import { jsonOk, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  employeeId: z.string().min(1),
  fullname: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  departmentId: z.number().optional(),
  positionId: z.number().optional(),
  role: z.enum(["admin", "employee"]).optional(),
});

export async function GET(request: Request) {
  try {
    const user = requireAuth(await getAuthUser(request));
    requireAdmin(user);
    const users = await listUsers();
    return jsonOk({ users });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const user = requireAuth(await getAuthUser(request));
    requireAdmin(user);
    const body = createSchema.parse(await request.json());
    const created = await createUser(body);
    return jsonOk({ user: created });
  } catch (err) {
    return handleApiError(err);
  }
}
