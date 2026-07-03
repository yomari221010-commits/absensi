import { getAuthUser } from "@/lib/auth";
import { jsonOk } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function POST() {
  return jsonOk({ success: true });
}
