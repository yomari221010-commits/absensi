import type { AttendanceRecord } from "@/lib/attendance-types";
import { apiFetch } from "@/lib/api-client";

export async function fetchAttendanceHistory(): Promise<AttendanceRecord[]> {
  const data = await apiFetch<{ records: AttendanceRecord[] }>("/api/attendance");
  return data.records;
}

export async function fetchTodayAttendance(): Promise<AttendanceRecord | null> {
  const data = await apiFetch<{ record: AttendanceRecord | null }>("/api/attendance/today");
  return data.record;
}

export async function fetchAttendanceSummary() {
  const data = await apiFetch<{
    record: AttendanceRecord | null;
    summary: Record<string, number>;
  }>("/api/attendance/today");
  return data;
}

export async function submitAttendance(payload: {
  type: "masuk" | "keluar";
  photo: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  address: string;
}): Promise<AttendanceRecord> {
  const data = await apiFetch<{ record: AttendanceRecord }>("/api/attendance", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.record;
}

export async function fetchNotifications() {
  const data = await apiFetch<{ notifications: Array<{
    id: number;
    title: string;
    body: string;
    type: string;
    read: boolean;
    time: string;
  }> }>("/api/notifications");
  return data.notifications;
}

export async function fetchLeaves() {
  const data = await apiFetch<{ records: unknown[] }>("/api/leave");
  return data.records;
}

export async function fetchReimbursements() {
  const data = await apiFetch<{ records: unknown[] }>("/api/reimbursement");
  return data.records;
}

export async function fetchAdminDashboard() {
  const data = await apiFetch<{ dashboard: unknown }>("/api/admin/dashboard");
  return data.dashboard;
}
