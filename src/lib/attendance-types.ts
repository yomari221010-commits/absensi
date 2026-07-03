export type AttendStatus = "hadir" | "telat" | "izin" | "cuti" | "absent" | "wfh";

export interface AttendanceRecord {
  id: number;
  dateKey: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: AttendStatus;
  location: string | null;
  photo?: string | null;
}

export function toDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatRecordDate(d: Date) {
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function shortLocation(address: string) {
  const part = address.split(",").slice(0, 2).join(",").trim();
  return part.length > 60 ? `${part.slice(0, 57)}...` : part;
}

export function checkInStatus(d: Date): "hadir" | "telat" {
  const mins = d.getHours() * 60 + d.getMinutes();
  return mins <= 9 * 60 ? "hadir" : "telat";
}

export function formatCheckIn(time: string | null) {
  return time ?? "—";
}

export function formatCheckOut(time: string | null) {
  return time ?? "Belum pulang";
}

export function formatTimeRange(checkIn: string | null, checkOut: string | null) {
  if (!checkIn) return "Tidak hadir";
  if (!checkOut) return `${checkIn} · Belum pulang`;
  return `${checkIn} → ${checkOut}`;
}
