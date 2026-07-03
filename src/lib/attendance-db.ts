import { getDb } from "./db";
import type { AttendanceRecord, AttendStatus } from "./attendance-types";
import {
  toDateKey,
  formatRecordDate,
  shortLocation,
  checkInStatus,
} from "./attendance-types";

export type { AttendanceRecord, AttendStatus };

interface AttendanceRow {
  id: number;
  date_key: string;
  date_label: string;
  check_in: string | null;
  check_out: string | null;
  status: AttendStatus;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  photo: string | null;
}

function mapRow(row: AttendanceRow): AttendanceRecord {
  return {
    id: row.id,
    dateKey: row.date_key,
    date: row.date_label,
    checkIn: row.check_in,
    checkOut: row.check_out,
    status: row.status,
    location: row.location,
    photo: row.photo,
  };
}

export function listAttendance(): AttendanceRecord[] {
  const rows = getDb()
    .prepare(`SELECT * FROM attendance ORDER BY date_key DESC, id DESC`)
    .all() as AttendanceRow[];
  return rows.map(mapRow);
}

export function getTodayAttendance(): AttendanceRecord | null {
  const todayKey = toDateKey(new Date());
  const row = getDb()
    .prepare(`SELECT * FROM attendance WHERE date_key = ?`)
    .get(todayKey) as AttendanceRow | undefined;
  return row ? mapRow(row) : null;
}

export function recordCheckIn(data: {
  photo: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  address: string;
}): AttendanceRecord {
  const now = new Date();
  const dateKey = toDateKey(now);
  const existing = getDb()
    .prepare(`SELECT * FROM attendance WHERE date_key = ?`)
    .get(dateKey) as AttendanceRow | undefined;

  if (existing?.check_in) {
    throw new Error("Anda sudah absen masuk hari ini");
  }

  const checkIn = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const location = shortLocation(data.address);

  if (existing) {
    getDb()
      .prepare(
        `UPDATE attendance SET
          check_in = ?, check_out = NULL, status = ?, location = ?,
          latitude = ?, longitude = ?, accuracy = ?, photo = ?,
          updated_at = datetime('now')
        WHERE date_key = ?`
      )
      .run(
        checkIn,
        checkInStatus(now),
        location,
        data.latitude,
        data.longitude,
        data.accuracy,
        data.photo,
        dateKey
      );
  } else {
    getDb()
      .prepare(
        `INSERT INTO attendance (
          date_key, date_label, check_in, check_out, status, location,
          latitude, longitude, accuracy, photo
        ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        dateKey,
        formatRecordDate(now),
        checkIn,
        checkInStatus(now),
        location,
        data.latitude,
        data.longitude,
        data.accuracy,
        data.photo
      );
  }

  return getTodayAttendance()!;
}

export function recordCheckOut(data: {
  photo: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  address: string;
}): AttendanceRecord {
  const now = new Date();
  const dateKey = toDateKey(now);
  const existing = getDb()
    .prepare(`SELECT * FROM attendance WHERE date_key = ?`)
    .get(dateKey) as AttendanceRow | undefined;

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

  getDb()
    .prepare(
      `UPDATE attendance SET
        check_out = ?, location = ?, latitude = ?, longitude = ?,
        accuracy = ?, photo = COALESCE(photo, ?), updated_at = datetime('now')
      WHERE date_key = ?`
    )
    .run(
      checkOut,
      shortLocation(data.address),
      data.latitude,
      data.longitude,
      data.accuracy,
      data.photo,
      dateKey
    );

  return getTodayAttendance()!;
}
