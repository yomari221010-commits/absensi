import type { AttendanceRecord } from "@/lib/attendance-types";

export async function fetchAttendanceHistory(): Promise<AttendanceRecord[]> {
  const res = await fetch("/api/attendance", { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Gagal memuat riwayat");
  return data.records;
}

export async function fetchTodayAttendance(): Promise<AttendanceRecord | null> {
  const res = await fetch("/api/attendance?today=1", { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Gagal memuat absensi hari ini");
  return data.record;
}

export async function submitAttendance(payload: {
  type: "masuk" | "keluar";
  photo: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  address: string;
}): Promise<AttendanceRecord> {
  const res = await fetch("/api/attendance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Gagal menyimpan absensi");
  return data.record;
}
