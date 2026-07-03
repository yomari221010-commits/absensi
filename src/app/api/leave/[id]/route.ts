import { z } from "zod";
import { getAuthUser, requireAuth, requireAdmin } from "@/lib/auth";
import { updateLeaveStatus } from "@/lib/leave-db";
import { jsonOk, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  decisionNote: z.string().optional(),
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
    const record = await updateLeaveStatus(Number(id), user.id, body.status, body.decisionNote);
    return jsonOk({ record });
  } catch (err) {
    return handleApiError(err);
  }
}
