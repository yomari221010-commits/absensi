import { ensureDatabase } from "@/lib/db/migrate";
import { jsonOk, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** Jalankan migrasi + seed — berguna setelah deploy pertama di Railway */
export async function POST() {
  try {
    if (process.env.NODE_ENV === "production" && process.env.MIGRATE_SECRET) {
      // optional protection in production
    }
    await ensureDatabase();
    return jsonOk({ success: true, message: "Database siap" });
  } catch (err) {
    return handleApiError(err);
  }
}
