import { toDateKey, type AttendanceRecord } from "./attendance-types";

export type HistFilter = "daily" | "weekly" | "monthly" | "yearly";

const FILTER_LABELS: Record<HistFilter, string> = {
  daily: "Harian",
  weekly: "Mingguan",
  monthly: "Bulanan",
  yearly: "Tahunan",
};

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function filterAttendanceByPeriod(
  records: AttendanceRecord[],
  filter: HistFilter,
  ref = new Date()
): AttendanceRecord[] {
  const todayKey = toDateKey(ref);

  return records
    .filter((record) => {
      const date = parseDateKey(record.dateKey);
      switch (filter) {
        case "daily":
          return record.dateKey === todayKey;
        case "weekly": {
          const start = startOfWeek(ref);
          const end = endOfWeek(ref);
          return date >= start && date <= end;
        }
        case "monthly":
          return (
            date.getMonth() === ref.getMonth() &&
            date.getFullYear() === ref.getFullYear()
          );
        case "yearly":
          return date.getFullYear() === ref.getFullYear();
        default:
          return true;
      }
    })
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}

export function getPeriodLabel(filter: HistFilter, ref = new Date()): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  switch (filter) {
    case "daily":
      return `${FILTER_LABELS.daily} — ${fmt(ref)}`;
    case "weekly": {
      const start = startOfWeek(ref);
      const end = endOfWeek(ref);
      return `${FILTER_LABELS.weekly} — ${fmt(start)} s/d ${fmt(end)}`;
    }
    case "monthly":
      return `${FILTER_LABELS.monthly} — ${ref.toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
      })}`;
    case "yearly":
      return `${FILTER_LABELS.yearly} — ${ref.getFullYear()}`;
    default:
      return FILTER_LABELS[filter];
  }
}

export function getFilterFileSlug(filter: HistFilter, ref = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  switch (filter) {
    case "daily":
      return `harian_${ref.getFullYear()}${pad(ref.getMonth() + 1)}${pad(ref.getDate())}`;
    case "weekly": {
      const start = startOfWeek(ref);
      return `mingguan_${start.getFullYear()}${pad(start.getMonth() + 1)}${pad(start.getDate())}`;
    }
    case "monthly":
      return `bulanan_${ref.getFullYear()}${pad(ref.getMonth() + 1)}`;
    case "yearly":
      return `tahunan_${ref.getFullYear()}`;
    default:
      return filter;
  }
}
