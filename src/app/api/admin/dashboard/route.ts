import { getAuthUser, requireAuth, requireAdmin } from "@/lib/auth";
import { getAdminDashboard } from "@/lib/users-db";
import { jsonOk, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = requireAuth(await getAuthUser(request));
    requireAdmin(user);
    const dashboard = await getAdminDashboard();
    return jsonOk({ dashboard });
  } catch (err) {
    return handleApiError(err);
  }
}
