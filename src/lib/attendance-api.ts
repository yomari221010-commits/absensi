import type { AttendanceRecord } from "@/lib/attendance-types";
import { apiFetch } from "@/lib/api-client";
import {
  mapApiLeave,
  mapApiReimbursement,
  type ApiLeave,
  type ApiReimbursement,
  type LeaveRequest,
  type Reimburse,
} from "@/lib/ui-mappers";

export async function fetchAttendanceHistory(): Promise<AttendanceRecord[]> {
  const data = await apiFetch<{ records: AttendanceRecord[] }>("/api/attendance");
  return data.records;
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
  const data = await apiFetch<{
    notifications: Array<{
      id: number;
      title: string;
      body: string;
      type: string;
      read: boolean;
      time: string;
    }>;
  }>("/api/notifications");
  return data.notifications;
}

export async function fetchLeaves(): Promise<LeaveRequest[]> {
  const data = await apiFetch<{ records: ApiLeave[] }>("/api/leave");
  return data.records.map(mapApiLeave);
}

export async function createLeave(payload: {
  leaveType: string;
  reason: string;
  startDate: string;
  endDate: string;
  attachment?: string;
}) {
  const data = await apiFetch<{ record: ApiLeave }>("/api/leave", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapApiLeave(data.record);
}

export async function fetchReimbursements(): Promise<Reimburse[]> {
  const data = await apiFetch<{ records: ApiReimbursement[] }>("/api/reimbursement");
  return data.records.map(mapApiReimbursement);
}

export async function createReimbursement(payload: {
  title: string;
  description?: string;
  amount: number;
  receipt?: string;
}) {
  const data = await apiFetch<{ record: ApiReimbursement }>("/api/reimbursement", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapApiReimbursement(data.record);
}

export interface AdminDashboard {
  totalEmployees: number;
  todayStats: Record<string, number>;
  pendingLeaves: number;
  pendingReimbursements: number;
  weeklyChart: { day: string; hadir: number; telat: number }[];
}

export async function fetchAdminDashboard(): Promise<AdminDashboard> {
  const data = await apiFetch<{ dashboard: AdminDashboard }>("/api/admin/dashboard");
  return data.dashboard;
}

export interface AdminAttendanceRow extends AttendanceRecord {
  fullname?: string;
}

export async function fetchAdminTodayAttendance(): Promise<AdminAttendanceRow[]> {
  const data = await apiFetch<{ records: AdminAttendanceRow[] }>("/api/attendance");
  const today = new Date().toISOString().slice(0, 10);
  return data.records.filter((r) => r.dateKey === today);
}

export async function updateLeaveDecision(
  id: number,
  status: "approved" | "rejected",
  decisionNote?: string
) {
  const data = await apiFetch<{ record: ApiLeave }>(`/api/leave/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status, decisionNote }),
  });
  return mapApiLeave(data.record);
}

export async function updateReimbursementDecision(
  id: number,
  status: "approved" | "rejected",
  decisionNote?: string
) {
  const data = await apiFetch<{ record: ApiReimbursement }>(`/api/reimbursement/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status, decisionNote }),
  });
  return mapApiReimbursement(data.record);
}
