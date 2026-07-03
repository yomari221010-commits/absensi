import { z } from "zod";
import { getAuthUser, requireAuth, requireAdmin } from "@/lib/auth";
import { updateUser, deleteUser } from "@/lib/users-db";
import { jsonOk, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  fullname: z.string().optional(),
  phone: z.string().optional(),
  departmentId: z.number().optional(),
  positionId: z.number().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  role: z.enum(["admin", "employee"]).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(await getAuthUser(request));
    requireAdmin(user);
    const { id } = await params;
    const body = patchSchema.parse(await request.json());
    await updateUser(Number(id), {
      fullname: body.fullname,
      phone: body.phone,
      departmentId: body.departmentId,
      positionId: body.positionId,
      status: body.status,
      role: body.role,
    });
    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(await getAuthUser(request));
    requireAdmin(user);
    const { id } = await params;
    await deleteUser(Number(id));
    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
