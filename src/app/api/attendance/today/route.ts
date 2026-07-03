import { getAuthUser, requireAuth } from "@/lib/auth";
import { getTodayAttendance, getAttendanceSummary } from "@/lib/attendance-db";
import { jsonOk, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = requireAuth(await getAuthUser(request));
    const [record, summary] = await Promise.all([
      getTodayAttendance(user.id),
      getAttendanceSummary(user.id),
    ]);
    return jsonOk({ record, summary });
  } catch (err) {
    return handleApiError(err);
  }
}
