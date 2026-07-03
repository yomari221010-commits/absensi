import { z } from "zod";
import { getAuthUser, requireAuth } from "@/lib/auth";
import {
  listAttendanceForUser,
  listAllAttendance,
  recordCheckIn,
  recordCheckOut,
} from "@/lib/attendance-db";
import { createNotification } from "@/lib/notifications-db";
import { jsonOk, handleApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const postSchema = z.object({
  type: z.enum(["masuk", "keluar"]),
  photo: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
  accuracy: z.number(),
  address: z.string().min(1),
});

export async function GET(request: Request) {
  try {
    const user = requireAuth(await getAuthUser(request));
    const records =
      user.role === "admin"
        ? await listAllAttendance()
        : await listAttendanceForUser(user.id);
    return jsonOk({ records });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const user = requireAuth(await getAuthUser(request));
    if (user.role !== "employee" && user.role !== "admin") {
      return handleApiError(new Error("Forbidden"));
    }

    const body = postSchema.parse(await request.json());
    const payload = {
      photo: body.photo,
      latitude: body.latitude,
      longitude: body.longitude,
      accuracy: body.accuracy,
      address: body.address,
    };

    const record =
      body.type === "masuk"
        ? await recordCheckIn(user.id, payload)
        : await recordCheckOut(user.id, payload);

    await createNotification(
      user.id,
      body.type === "masuk" ? "Check In Berhasil" : "Check Out Berhasil",
      `Absensi ${body.type === "masuk" ? "masuk" : "keluar"} tercatat pada ${record.checkIn ?? record.checkOut}.`,
      "attendance"
    );

    return jsonOk({ record });
  } catch (err) {
    return handleApiError(err);
  }
}
