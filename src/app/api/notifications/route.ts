import { getAuthUser, requireAuth } from "@/lib/auth";
import {
  listNotifications,
  markAllNotificationsRead,
} from "@/lib/notifications-db";
import { jsonOk, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = requireAuth(await getAuthUser(request));
    const notifications = await listNotifications(user.id);
    return jsonOk({ notifications });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = requireAuth(await getAuthUser(request));
    await markAllNotificationsRead(user.id);
    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
