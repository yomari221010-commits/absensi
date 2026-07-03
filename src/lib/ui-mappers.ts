export type LeaveType =
  | "Sakit"
  | "Izin"
  | "Cuti"
  | "WFH"
  | "Dinas"
  | "Izin Mendadak"
  | "Cuti Khusus";

export interface LeaveRequest {
  id: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  duration: number;
  reason: string;
  attachment?: string;
  notes?: string;
  status: "draft" | "pending" | "approved" | "rejected";
  createdAt: string;
  decisionReason?: string;
  employeeName?: string;
}

export interface ReimItem {
  desc: string;
  amount: number;
}

export interface Reimburse {
  id: string;
  date: string;
  purpose: string;
  project: string;
  items: ReimItem[];
  total: number;
  advance: number;
  balance: number;
  status: "draft" | "in-progress" | "done";
  decision?: "approved" | "rejected";
  decisionReason?: string;
  employeeName?: string;
}

export interface ApiLeave {
  id: number;
  userId: number;
  fullname?: string;
  leaveType: string;
  reason: string;
  startDate: string;
  endDate: string;
  attachment: string | null;
  status: string;
  decisionNote: string | null;
  createdAt: string;
}

export interface ApiReimbursement {
  id: number;
  userId: number;
  fullname?: string;
  title: string;
  description: string | null;
  amount: number;
  receipt: string | null;
  status: string;
  decisionNote: string | null;
  createdAt: string;
}

const LEAVE_TYPE_MAP: Record<string, LeaveType> = {
  izin: "Izin",
  sakit: "Sakit",
  cuti: "Cuti",
  wfh: "WFH",
  dinas: "Dinas",
};

function calcDays(start: string, end: string) {
  if (!start || !end) return 1;
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 1;
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
}

export function mapApiLeave(r: ApiLeave): LeaveRequest {
  const typeKey = r.leaveType.toLowerCase();
  return {
    id: `REQ-${r.id}`,
    type: LEAVE_TYPE_MAP[typeKey] ?? "Izin",
    startDate: r.startDate,
    endDate: r.endDate,
    duration: calcDays(r.startDate, r.endDate),
    reason: r.reason,
    attachment: r.attachment ?? undefined,
    status: (r.status as LeaveRequest["status"]) ?? "pending",
    createdAt: new Date(r.createdAt).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    decisionReason: r.decisionNote ?? undefined,
    employeeName: r.fullname,
  };
}

export function mapApiReimbursement(r: ApiReimbursement): Reimburse {
  const statusMap: Record<string, Reimburse["status"]> = {
    pending: "in-progress",
    approved: "done",
    rejected: "done",
  };
  return {
    id: `RMB-${r.id}`,
    date: new Date(r.createdAt).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    purpose: r.title,
    project: r.description ?? "—",
    items: [{ desc: r.title, amount: r.amount }],
    total: r.amount,
    advance: 0,
    balance: r.amount,
    status: statusMap[r.status] ?? "in-progress",
    decision:
      r.status === "approved" ? "approved" : r.status === "rejected" ? "rejected" : undefined,
    decisionReason: r.decisionNote ?? undefined,
    employeeName: r.fullname,
  };
}

export const EMPTY_WEEKLY_CHART = [
  { day: "Sen", hadir: 0, telat: 0 },
  { day: "Sel", hadir: 0, telat: 0 },
  { day: "Rab", hadir: 0, telat: 0 },
  { day: "Kam", hadir: 0, telat: 0 },
  { day: "Jum", hadir: 0, telat: 0 },
  { day: "Sab", hadir: 0, telat: 0 },
  { day: "Min", hadir: 0, telat: 0 },
];

export const EMPTY_LEAVE_WEEKLY = [
  { day: "Sen", sakit: 0, izin: 0, cuti: 0, wfh: 0 },
  { day: "Sel", sakit: 0, izin: 0, cuti: 0, wfh: 0 },
  { day: "Rab", sakit: 0, izin: 0, cuti: 0, wfh: 0 },
  { day: "Kam", sakit: 0, izin: 0, cuti: 0, wfh: 0 },
  { day: "Jum", sakit: 0, izin: 0, cuti: 0, wfh: 0 },
];

export const EMPTY_MONTHLY_DATA = [
  { month: "Jan", value: 0 },
  { month: "Feb", value: 0 },
  { month: "Mar", value: 0 },
  { month: "Apr", value: 0 },
  { month: "Mei", value: 0 },
  { month: "Jun", value: 0 },
  { month: "Jul", value: 0 },
];
