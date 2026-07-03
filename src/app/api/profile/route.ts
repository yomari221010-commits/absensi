import { getAuthUser } from "@/lib/auth";
import { toPublicUser } from "@/lib/users-db";
import { jsonOk, jsonError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return jsonError("Unauthorized", 401);
  return jsonOk({ user: toPublicUser(user) });
}
