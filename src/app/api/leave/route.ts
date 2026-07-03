import { z } from "zod";
import { getAuthUser, requireAuth } from "@/lib/auth";
import { listLeavesForUser, listAllLeaves, createLeave } from "@/lib/leave-db";
import { jsonOk, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  leaveType: z.string().min(1),
  reason: z.string().min(3),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  attachment: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = requireAuth(await getAuthUser(request));
    const records =
      user.role === "admin" ? await listAllLeaves() : await listLeavesForUser(user.id);
    return jsonOk({ records });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const user = requireAuth(await getAuthUser(request));
    const body = createSchema.parse(await request.json());
    const record = await createLeave(user.id, body);
    return jsonOk({ record });
  } catch (err) {
    return handleApiError(err);
  }
}
