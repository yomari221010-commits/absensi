import { query, queryOne } from "@/lib/pg";
import { haversineMeters, type OfficeSettings } from "@/lib/geo-utils";
import { getOfficeConfigFromEnv } from "@/lib/office-config";
import {
  toDateKey,
  formatRecordDate,
  shortLocation,
  checkInStatus,
  type AttendanceRecord,
} from "@/lib/attendance-types";

interface AttendanceRow {
  id: number;
  user_id: number;
  date_key: string;
  date_label: string;
  check_in: string | null;
  check_out: string | null;
  check_in_photo: string | null;
  check_out_photo: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  status: string;
  working_hours: number | null;
}

function mapRow(row: AttendanceRow): AttendanceRecord {
  return {
    id: row.id,
    dateKey: row.date_key,
    date: row.date_label,
    checkIn: row.check_in,
    checkOut: row.check_out,
    status: row.status as AttendanceRecord["status"],
    location: row.location,
    latitude: row.latitude,
    longitude: row.longitude,
    accuracy: row.accuracy,
    checkInPhoto: row.check_in_photo,
    checkOutPhoto: row.check_out_photo,
    workingHours: row.working_hours,
    photo: row.check_in_photo ?? row.check_out_photo,
  };
}

function calcWorkingHours(checkIn: string | null, checkOut: string | null): number | null {
  if (!checkIn || !checkOut) return null;
  const [ih, im] = checkIn.split(":").map(Number);
  const [oh, om] = checkOut.split(":").map(Number);
  if ([ih, im, oh, om].some(Number.isNaN)) return null;
  const mins = oh * 60 + om - (ih * 60 + im);
  return mins > 0 ? Math.round((mins / 60) * 100) / 100 : null;
}

export async function getOfficeSettings(): Promise<OfficeSettings> {
  const row = await queryOne<{
    latitude: number;
    longitude: number;
    radius_meters: number;
  }>(`SELECT latitude, longitude, radius_meters FROM office_settings ORDER BY id LIMIT 1`);

  if (row) {
    return {
      latitude: row.latitude,
      longitude: row.longitude,
      radiusMeters: row.radius_meters,
    };
  }

  return getOfficeConfigFromEnv();
}

export async function validateAttendanceLocation(
  latitude: number,
  longitude: number,
  accuracy: number
) {
  if (accuracy > 50) {
    throw new Error("Akurasi GPS harus ≤ 50 meter. Coba di area terbuka.");
  }
  const office = await getOfficeSettings();
  const distance = haversineMeters(
    latitude,
    longitude,
    office.latitude,
    office.longitude
  );
  if (distance > office.radiusMeters) {
    throw new Error(
      `Lokasi di luar radius kantor (${Math.round(distance)}m / maks ${office.radiusMeters}m)`
    );
  }
}

export async function listAttendanceForUser(userId: number): Promise<AttendanceRecord[]> {
  const { rows } = await query<AttendanceRow>(
    `SELECT * FROM attendance WHERE user_id = $1 ORDER BY date_key DESC`,
    [userId]
  );
  return rows.map(mapRow);
}

export async function listAllAttendance(): Promise<
  (AttendanceRecord & { userId: number; fullname: string })[]
> {
  const { rows } = await query<AttendanceRow & { fullname: string }>(
    `SELECT a.*, u.fullname FROM attendance a
     JOIN users u ON u.id = a.user_id
     ORDER BY a.date_key DESC, a.id DESC`
  );
  return rows.map((r) => ({ ...mapRow(r), userId: r.user_id, fullname: r.fullname }));
}

export async function getTodayAttendance(userId: number): Promise<AttendanceRecord | null> {
  const todayKey = toDateKey(new Date());
  const row = await queryOne<AttendanceRow>(
    `SELECT * FROM attendance WHERE user_id = $1 AND date_key = $2`,
    [userId, todayKey]
  );
  return row ? mapRow(row) : null;
}

export async function recordCheckIn(
  userId: number,
  data: {
    photo: string;
    latitude: number;
    longitude: number;
    accuracy: number;
    address: string;
  }
): Promise<AttendanceRecord> {
  await validateAttendanceLocation(data.latitude, data.longitude, data.accuracy);

  const now = new Date();
  const dateKey = toDateKey(now);
  const existing = await queryOne<AttendanceRow>(
    `SELECT * FROM attendance WHERE user_id = $1 AND date_key = $2`,
    [userId, dateKey]
  );

  if (existing?.check_in) {
    throw new Error("Anda sudah absen masuk hari ini");
  }

  const checkIn = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const location = shortLocation(data.address);
  const status = checkInStatus(now);

  if (existing) {
    await query(
      `UPDATE attendance SET
        check_in = $1, check_out = NULL, status = $2, location = $3,
        latitude = $4, longitude = $5, accuracy = $6, check_in_photo = $7,
        working_hours = NULL, updated_at = NOW()
       WHERE user_id = $8 AND date_key = $9`,
      [
        checkIn,
        status,
        location,
        data.latitude,
        data.longitude,
        data.accuracy,
        data.photo,
        userId,
        dateKey,
      ]
    );
  } else {
    await query(
      `INSERT INTO attendance (
        user_id, date_key, date_label, check_in, status, location,
        latitude, longitude, accuracy, check_in_photo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        userId,
        dateKey,
        formatRecordDate(now),
        checkIn,
        status,
        location,
        data.latitude,
        data.longitude,
        data.accuracy,
        data.photo,
      ]
    );
  }

  return (await getTodayAttendance(userId))!;
}

export async function recordCheckOut(
  userId: number,
  data: {
    photo: string;
    latitude: number;
    longitude: number;
    accuracy: number;
    address: string;
  }
): Promise<AttendanceRecord> {
  await validateAttendanceLocation(data.latitude, data.longitude, data.accuracy);

  const now = new Date();
  const dateKey = toDateKey(now);
  const existing = await queryOne<AttendanceRow>(
    `SELECT * FROM attendance WHERE user_id = $1 AND date_key = $2`,
    [userId, dateKey]
  );

  if (!existing?.check_in) {
    throw new Error("Anda belum absen masuk hari ini");
  }
  if (existing.check_out) {
    throw new Error("Anda sudah absen keluar hari ini");
  }

  const checkOut = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const hours = calcWorkingHours(existing.check_in, checkOut);

  await query(
    `UPDATE attendance SET
      check_out = $1, check_out_photo = $2, location = $3,
      latitude = $4, longitude = $5, accuracy = $6,
      working_hours = $7, updated_at = NOW()
     WHERE user_id = $8 AND date_key = $9`,
    [
      checkOut,
      data.photo,
      shortLocation(data.address),
      data.latitude,
      data.longitude,
      data.accuracy,
      hours,
      userId,
      dateKey,
    ]
  );

  return (await getTodayAttendance(userId))!;
}

export async function getAttendanceSummary(userId: number) {
  const { rows } = await query<{ status: string; count: string }>(
    `SELECT status, COUNT(*)::text AS count FROM attendance
     WHERE user_id = $1 GROUP BY status`,
    [userId]
  );
  const summary = { hadir: 0, telat: 0, izin: 0, cuti: 0, sakit: 0, absent: 0, wfh: 0 };
  for (const r of rows) {
    const key = r.status as keyof typeof summary;
    if (key in summary) summary[key] = Number(r.count);
  }
  return summary;
}
