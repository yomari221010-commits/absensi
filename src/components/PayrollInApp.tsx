"use client";

import { useState, useEffect } from "react";
import {
  Home, ClipboardList, Clock, Bell, User, MapPin,
  CheckCircle, LogOut, Settings, Lock, Edit3,
  Search, BarChart2, Users, Eye, EyeOff, ArrowLeft,
  Moon, Sun, X, ChevronRight, Shield,
  Download, TrendingUp, RefreshCw, Fingerprint,
  Mail, Building2, Phone, Receipt, Plus, Trash2,
  Send, FileText, AlertCircle, CheckSquare, XSquare,
  CalendarCheck, Calendar, Paperclip, FileUp, Clock3,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  ResponsiveContainer, Tooltip,
} from "recharts";
import { LoginHeroVisual } from "./LoginHeroVisual";
import { AttendanceCamera } from "./AttendanceCamera";
import { LocationMap } from "./LocationMapLoader";
import { GeoLocationData, formatLatitude, formatLongitude, getCurrentLocation } from "@/lib/geolocation";
import {
  fetchAttendanceHistory,
  fetchTodayAttendance,
  submitAttendance,
} from "@/lib/attendance-api";
import {
  toDateKey,
  formatCheckIn,
  formatCheckOut,
  formatTimeRange,
  type AttendanceRecord,
} from "@/lib/attendance-types";
import {
  filterAttendanceByPeriod,
  type HistFilter,
} from "@/lib/attendance-period";

type Screen =
  | "splash" | "login" | "home" | "attendance"
  | "camera"
  | "history" | "notifications" | "profile" | "admin"
  | "reimbursement" | "reimbursement-form"
  | "leave" | "leave-form";

interface ReimItem { desc: string; amount: number }
interface Reimburse {
  id: string; date: string; purpose: string; project: string;
  items: ReimItem[]; total: number; advance: number; balance: number;
  status: "draft" | "in-progress" | "done";
  decision?: "approved" | "rejected"; decisionReason?: string;
}
type LeaveType = "Sakit" | "Izin" | "Cuti" | "WFH" | "Dinas" | "Izin Mendadak" | "Cuti Khusus";
interface LeaveRequest {
  id: string; type: LeaveType;
  startDate: string; endDate: string; duration: number;
  reason: string; attachment?: string; notes?: string;
  status: "draft" | "pending" | "approved" | "rejected";
  createdAt: string; decisionReason?: string;
}

// ── Leave config ───────────────────────────────────────────────
const leaveTypes: { type: LeaveType; emoji: string; color: string; bg: string }[] = [
  { type: "Sakit",        emoji: "🏥", color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
  { type: "Izin",         emoji: "📋", color: "#6366f1", bg: "rgba(99,102,241,0.15)" },
  { type: "Cuti",         emoji: "🌴", color: "#10b981", bg: "rgba(16,185,129,0.15)" },
  { type: "WFH",          emoji: "🏠", color: "#8b5cf6", bg: "rgba(139,92,246,0.15)" },
  { type: "Dinas",        emoji: "✈️", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  { type: "Izin Mendadak",emoji: "⚡", color: "#ec4899", bg: "rgba(236,72,153,0.15)" },
  { type: "Cuti Khusus",  emoji: "⭐", color: "#06b6d4", bg: "rgba(6,182,212,0.15)" },
];
const leaveCfgMap = Object.fromEntries(leaveTypes.map(t => [t.type, t])) as Record<LeaveType, typeof leaveTypes[0]>;
const leaveStatusCfg = {
  draft:    { label: "Draft",     color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  pending:  { label: "Menunggu",  color: "#f59e0b", bg: "rgba(245,158,11,0.15)"  },
  approved: { label: "Disetujui", color: "#10b981", bg: "rgba(16,185,129,0.15)"  },
  rejected: { label: "Ditolak",   color: "#ef4444", bg: "rgba(239,68,68,0.15)"   },
};

// ── Static data ────────────────────────────────────────────────
const weeklyData = [
  { day: "Sen", hadir: 95, telat: 5 }, { day: "Sel", hadir: 88, telat: 12 },
  { day: "Rab", hadir: 92, telat: 8 }, { day: "Kam", hadir: 97, telat: 3 },
  { day: "Jum", hadir: 85, telat: 15 }, { day: "Sab", hadir: 60, telat: 10 },
];
const monthlyData = [
  { month: "Jan", value: 94 }, { month: "Feb", value: 88 }, { month: "Mar", value: 91 },
  { month: "Apr", value: 96 }, { month: "Mei", value: 89 }, { month: "Jun", value: 93 },
  { month: "Jul", value: 97 },
];
const leaveWeeklyData = [
  { day: "Sen", sakit: 2, izin: 1, cuti: 0, wfh: 3 },
  { day: "Sel", sakit: 1, izin: 2, cuti: 1, wfh: 2 },
  { day: "Rab", sakit: 3, izin: 0, cuti: 2, wfh: 4 },
  { day: "Kam", sakit: 0, izin: 1, cuti: 1, wfh: 2 },
  { day: "Jum", sakit: 2, izin: 3, cuti: 0, wfh: 5 },
];
const employeeData = [
  { name: "Budi Santoso", role: "Frontend Dev",    checkIn: "08:45", checkOut: "17:30", status: "hadir" },
  { name: "Sari Dewi",    role: "Product Manager", checkIn: "09:15", checkOut: "17:00", status: "telat" },
  { name: "Andi Pratama", role: "Backend Dev",     checkIn: "-",     checkOut: "-",     status: "izin"  },
  { name: "Rizki Hasan",  role: "UI Designer",     checkIn: "08:30", checkOut: "17:45", status: "hadir" },
  { name: "Maya Putri",   role: "QA Engineer",     checkIn: "08:55", checkOut: "-",     status: "hadir" },
];
const notifData = [
  { type: "reminder",     title: "Jangan lupa absensi!",    body: "Anda belum melakukan absensi hari ini.",                              time: "08:00",    read: false },
  { type: "approval",     title: "Izin Sakit Disetujui",    body: "Permohonan Sakit Anda 3–5 Jul telah disetujui oleh HR.",             time: "Kemarin",  read: true  },
  { type: "announcement", title: "Meeting All Hands",       body: "Reminder: Meeting all hands besok pukul 10:00 WIB.",                 time: "2 hari lalu", read: true },
  { type: "reminder",     title: "Reimbursement Disetujui", body: "Pengajuan RMB-2026-003 senilai Rp 3.200.000 telah disetujui.",       time: "3 hari lalu", read: false },
];
const teamLeaves = [
  { name: "Sari Dewi",    type: "Cuti",  start: "07 Jul", end: "11 Jul", status: "pending"  },
  { name: "Andi Pratama", type: "Sakit", start: "03 Jul", end: "04 Jul", status: "approved" },
  { name: "Rizki Hasan",  type: "WFH",  start: "07 Jul", end: "07 Jul", status: "approved" },
];

const initReim: Reimburse[] = [
  { id: "RMB-2026-001", date: "03 Jul 2026", purpose: "Perjalanan Dinas Surabaya",   project: "Project Alpha",
    items: [{ desc: "Tiket pesawat PP", amount: 1800000 }, { desc: "Hotel 2 malam", amount: 500000 }, { desc: "Transport lokal", amount: 200000 }],
    total: 2500000, advance: 1000000, balance: 1500000, status: "draft" },
  { id: "RMB-2026-002", date: "01 Jul 2026", purpose: "Meeting Client Jakarta",       project: "Project Beta",
    items: [{ desc: "Makan siang client", amount: 650000 }, { desc: "Parkir & tol", amount: 200000 }],
    total: 850000, advance: 0, balance: 850000, status: "in-progress" },
  { id: "RMB-2026-003", date: "25 Jun 2026", purpose: "Training & Sertifikasi AWS",  project: "Internal Dev",
    items: [{ desc: "Biaya sertifikasi", amount: 2500000 }, { desc: "Buku referensi", amount: 450000 }, { desc: "Transportasi", amount: 250000 }],
    total: 3200000, advance: 1500000, balance: 1700000, status: "done", decision: "approved" },
  { id: "RMB-2026-004", date: "20 Jun 2026", purpose: "Pembelian Peralatan Kerja",   project: "Internal",
    items: [{ desc: "Mechanical keyboard", amount: 450000 }, { desc: "Mouse wireless", amount: 225000 }],
    total: 675000, advance: 0, balance: 675000, status: "done", decision: "rejected", decisionReason: "Tidak termasuk dalam budget peralatan Q3 2026." },
];
const initLeaves: LeaveRequest[] = [
  { id: "REQ-2026-001", type: "Sakit", startDate: "03 Jul 2026", endDate: "05 Jul 2026", duration: 3,
    reason: "Demam tinggi disertai batuk dan flu", attachment: "surat_dokter.pdf",
    status: "approved", createdAt: "03 Jul 2026" },
  { id: "REQ-2026-002", type: "WFH",  startDate: "07 Jul 2026", endDate: "07 Jul 2026", duration: 1,
    reason: "Menunggu teknisi perbaikan jaringan internet di rumah",
    status: "pending", createdAt: "06 Jul 2026" },
  { id: "REQ-2026-003", type: "Cuti", startDate: "14 Jul 2026", endDate: "18 Jul 2026", duration: 5,
    reason: "Liburan keluarga ke Bali untuk merayakan ulang tahun pernikahan",
    status: "pending", createdAt: "01 Jul 2026" },
  { id: "REQ-2026-004", type: "Izin", startDate: "28 Jun 2026", endDate: "28 Jun 2026", duration: 1,
    reason: "Keperluan keluarga mendesak",
    status: "rejected", decisionReason: "Sedang ada deadline project penting. Mohon reschedule.", createdAt: "27 Jun 2026" },
  { id: "REQ-2026-005", type: "Dinas", startDate: "20 Jul 2026", endDate: "22 Jul 2026", duration: 3,
    reason: "Kunjungan klien ke Surabaya untuk demo produk",
    status: "draft", createdAt: "03 Jul 2026" },
];

const attendStatusCfg = {
  hadir:  { color: "text-emerald-400", bg: "bg-emerald-400/20", label: "Hadir" },
  telat:  { color: "text-amber-400",   bg: "bg-amber-400/20",   label: "Telat" },
  izin:   { color: "text-blue-400",    bg: "bg-blue-400/20",    label: "Izin"  },
  cuti:   { color: "text-purple-400",  bg: "bg-purple-400/20",  label: "Cuti"  },
  absent: { color: "text-red-400",     bg: "bg-red-400/20",     label: "Absent"},
  wfh:    { color: "text-cyan-400",    bg: "bg-cyan-400/20",    label: "WFH"   },
};
const reimStatusCfg = {
  "draft":       { label: "Draft",    color: "#6366f1", bg: "rgba(99,102,241,0.15)"  },
  "in-progress": { label: "Diproses", color: "#f59e0b", bg: "rgba(245,158,11,0.15)"  },
  "done":        { label: "Selesai",  color: "#10b981", bg: "rgba(16,185,129,0.15)"  },
};
const fmtRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
const unreadCount = notifData.filter(n => !n.read).length;

// ══════════════════════════════════════════════════════════════
export default function PayrollInApp() {
  const [screen, setScreen]           = useState<Screen>("splash");
  const [darkMode, setDarkMode]       = useState(true);
  const [showPw, setShowPw]           = useState(false);
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [now, setNow]                 = useState(new Date());
  const [activeTab, setActiveTab]     = useState("home");
  const [histFilter, setHistFilter]   = useState<HistFilter>("weekly");
  const [exporting, setExporting]     = useState(false);
  const [absenType, setAbsenType]     = useState<"masuk"|"keluar">("masuk");
  const [currentGeo, setCurrentGeo]   = useState<GeoLocationData | null>(null);
  const [attendanceGeo, setAttendanceGeo] = useState<GeoLocationData | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [geoLoading, setGeoLoading]   = useState(false);
  const [geoError, setGeoError]       = useState<string | null>(null);
  const [absenNotice, setAbsenNotice] = useState<string | null>(null);
  const [cameraBack, setCameraBack]   = useState<Screen>("attendance");
  const [historyList, setHistoryList] = useState<AttendanceRecord[]>([]);
  const [todayRecord, setTodayRecord]   = useState<AttendanceRecord | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [notifTab, setNotifTab]       = useState("all");
  const [searchQ, setSearchQ]         = useState("");
  const [prevScreen, setPrevScreen]   = useState<Screen>("home");
  // Reimburse
  const [reimList, setReimList]       = useState<Reimburse[]>(initReim);
  const [reimFilter, setReimFilter]   = useState<"all"|"draft"|"in-progress"|"done">("all");
  const [expandReim, setExpandReim]   = useState<string|null>(null);
  const [reimForm, setReimForm]       = useState({ date:"", project:"", purpose:"", advance:"", items:[{desc:"",amount:""}] });
  // Leave
  const [leaveList, setLeaveList]     = useState<LeaveRequest[]>(initLeaves);
  const [leaveFilter, setLeaveFilter] = useState<"all"|"draft"|"pending"|"approved"|"rejected">("all");
  const [leaveTypeF, setLeaveTypeF]   = useState<LeaveType|"all">("all");
  const [expandLeave, setExpandLeave] = useState<string|null>(null);
  const [adminView, setAdminView]     = useState(false);
  const [leaveForm, setLeaveForm]     = useState({ type:"Sakit" as LeaveType, startDate:"", endDate:"", reason:"", notes:"" });
  const [attached, setAttached]       = useState(false);

  useEffect(() => { const t = setTimeout(() => setScreen("login"), 2600); return () => clearTimeout(t); }, []);
  useEffect(() => { const iv = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(iv); }, []);
  useEffect(() => { document.documentElement.classList.toggle("dark", darkMode); }, [darkMode]);

  const fetchGeo = async () => {
    setGeoLoading(true);
    setGeoError(null);
    try {
      const geo = await getCurrentLocation();
      setCurrentGeo(geo);
    } catch (err) {
      setGeoError(err instanceof Error ? err.message : "Gagal mengambil lokasi");
      setCurrentGeo(null);
    } finally {
      setGeoLoading(false);
    }
  };

  useEffect(() => {
    if (screen === "attendance") fetchGeo();
  }, [screen]);

  const loadAttendance = async () => {
    setHistoryLoading(true);
    try {
      const [records, today] = await Promise.all([
        fetchAttendanceHistory(),
        fetchTodayAttendance(),
      ]);
      setHistoryList(records);
      setTodayRecord(today);
    } catch {
      // tetap tampilkan UI meski gagal load
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (screen === "home" || screen === "history" || screen === "attendance") {
      loadAttendance();
    }
  }, [screen]);

  useEffect(() => {
    if (!absenNotice) return;
    const t = setTimeout(() => setAbsenNotice(null), 4000);
    return () => clearTimeout(t);
  }, [absenNotice]);

  const timeStr = now.toLocaleTimeString("id-ID",   { hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:false });
  const dateStr = now.toLocaleDateString("id-ID",    { weekday:"long", day:"numeric", month:"long", year:"numeric" });
  const calcDur = (s: string, e: string) => { if (!s||!e) return 1; return Math.max(1, Math.round((new Date(e).getTime()-new Date(s).getTime())/86400000)+1); };

  const handleExportHistory = async () => {
    setExporting(true);
    try {
      const { exportAttendanceExcel } = await import("@/lib/export-attendance-excel");
      await exportAttendanceExcel({
        records: historyList,
        filter: histFilter,
        employeeEmail: email || "budi.santoso@payrollin.id",
      });
    } catch {
      setAbsenNotice("Gagal mengekspor data absensi");
    } finally {
      setExporting(false);
    }
  };

  const navigate = (tab: string) => {
    setActiveTab(tab);
    const map: Record<string,Screen> = { home:"home", attendance:"attendance", history:"history", profile:"profile", reimbursement:"reimbursement", leave:"leave" };
    setScreen(map[tab] ?? "home");
  };
  const goNotif = () => { setPrevScreen(screen); setScreen("notifications"); };
  const doAbsen = (type: "masuk"|"keluar") => { setCameraBack(screen); setAbsenType(type); setScreen("camera"); };
  const handleCapture = async (photo: string, location: GeoLocationData) => {
    try {
      const record = await submitAttendance({
        type: absenType,
        photo,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        address: location.address,
      });
      setCapturedPhoto(photo);
      setAttendanceGeo(location);
      setCurrentGeo(location);
      setTodayRecord(record);
      await loadAttendance();
      setAbsenNotice(
        absenType === "masuk"
          ? "Absen masuk berhasil tercatat!"
          : "Absen keluar berhasil tercatat!"
      );
      setScreen("home");
      setActiveTab("home");
    } catch (err) {
      setAbsenNotice(err instanceof Error ? err.message : "Gagal menyimpan absensi");
      setScreen(cameraBack);
    }
  };

  // ── Shared visual tokens ────────────────────────────────────
  const glass = darkMode
    ? { background:"rgba(15,23,42,0.65)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", border:"1px solid rgba(99,102,241,0.2)" }
    : { background:"rgba(255,255,255,0.82)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", border:"1px solid rgba(99,102,241,0.15)", boxShadow:"0 4px 24px rgba(99,102,241,0.07)" };
  const bgPage  = darkMode ? "linear-gradient(160deg,#070d1a 0%,#0f172a 55%,#1a1040 100%)" : "linear-gradient(160deg,#eef2ff 0%,#f0f4ff 60%,#f5f0ff 100%)";
  const txt     = darkMode ? "#f1f5f9" : "#0f172a";
  const sub     = darkMode ? "#94a3b8" : "#64748b";
  const dim     = darkMode ? "#64748b" : "#94a3b8";
  const divC    = darkMode ? "rgba(255,255,255,0.06)" : "rgba(99,102,241,0.08)";

  // ── SPLASH ──────────────────────────────────────────────────
  if (screen==="splash") return (
    <div className="size-full flex items-center justify-center" style={{background:"linear-gradient(135deg,#070d1a 0%,#0f172a 40%,#1e1b4b 70%,#2d1d6e 100%)"}}>
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center" style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)"}}>
            <Fingerprint className="w-12 h-12 text-white"/>
          </div>
          <div className="absolute inset-0 rounded-3xl animate-ping opacity-25" style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)"}}/>
        </div>
        <div className="text-center">
          <h1 className="text-4xl font-black text-white tracking-tight">PAYROLLIN</h1>
          <p className="text-indigo-300 text-xs mt-1.5 tracking-[0.2em] uppercase">Smart HR Platform</p>
        </div>
        <div className="w-48 h-1 rounded-full overflow-hidden mt-2" style={{background:"rgba(255,255,255,0.08)"}}>
          <div className="h-full rounded-full animate-pulse" style={{width:"72%",background:"linear-gradient(90deg,#6366f1,#8b5cf6)"}}/>
        </div>
        <p className="text-xs" style={{color:"rgba(165,180,252,0.5)"}}>v2.4.1 · Enterprise Edition</p>
      </div>
    </div>
  );

  // ── Shared micro-components ─────────────────────────────────
  const BellBtn = () => (
    <button onClick={goNotif} className="w-10 h-10 flex items-center justify-center rounded-xl relative transition-all hover:opacity-80" style={glass}>
      <Bell className="w-4 h-4" style={{color:txt}}/>
      {unreadCount>0 && <span className="absolute top-1 right-1 min-w-[16px] h-4 rounded-full flex items-center justify-center text-white font-black px-1" style={{fontSize:9,background:"#ef4444"}}>{unreadCount}</span>}
    </button>
  );
  const DarkBtn = () => (
    <button onClick={()=>setDarkMode(d=>!d)} className="w-10 h-10 flex items-center justify-center rounded-xl transition-all hover:opacity-80" style={glass}>
      {darkMode ? <Sun className="w-4 h-4 text-amber-400"/> : <Moon className="w-4 h-4 text-slate-500"/>}
    </button>
  );
  const Header = ({ title, back, right, hideBell }:{ title:string; back?:()=>void; right?:React.ReactNode; hideBell?:boolean }) => (
    <div className="flex items-center justify-between px-5 pt-12 pb-4 flex-shrink-0">
      {back ? <button onClick={back} className="w-10 h-10 flex items-center justify-center rounded-xl hover:opacity-80" style={glass}><ArrowLeft className="w-5 h-5" style={{color:txt}}/></button> : <div className="w-10"/>}
      <h1 className="text-base font-bold" style={{color:txt}}>{title}</h1>
      <div className="flex items-center gap-2">{right}{!hideBell && <BellBtn/>}</div>
    </div>
  );
  const BottomNav = () => (
    <nav className="fixed bottom-0 left-0 right-0 flex items-center justify-around" style={{...glass,borderTop:"1px solid rgba(99,102,241,0.15)",borderRadius:"20px 20px 0 0",padding:"10px 8px 22px"}}>
      {([
        { id:"home",          Icon:Home,         label:"Home"     },
        { id:"attendance",    Icon:ClipboardList, label:"Absensi"  },
        { id:"leave",         Icon:CalendarCheck, label:"Izin"     },
        { id:"reimbursement", Icon:Receipt,       label:"Reimburse"},
        { id:"profile",       Icon:User,          label:"Profil"   },
      ] as const).map(({id,Icon,label})=>{
        const active=activeTab===id;
        return (
          <button key={id} onClick={()=>navigate(id)} className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 flex items-center justify-center rounded-xl transition-all" style={{background:active?"linear-gradient(135deg,#6366f1,#8b5cf6)":"transparent"}}>
              <Icon className="w-5 h-5" style={{color:active?"#fff":dim}}/>
            </div>
            <span className="text-[10px] font-medium" style={{color:active?"#6366f1":dim}}>{label}</span>
          </button>
        );
      })}
    </nav>
  );

  // ── LOGIN ───────────────────────────────────────────────────
  if (screen==="login") return (
    <div className="size-full flex items-center justify-center overflow-hidden p-5 sm:p-8" style={{background:bgPage}}>
      <div className="w-full max-w-[1080px] grid lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-14 xl:gap-16 items-center">

        {/* Brand panel — desktop */}
        <div className="hidden lg:flex items-center gap-7 xl:gap-9">
          <div className="shrink-0 w-[250px] xl:w-[270px]">
            <LoginHeroVisual darkMode={darkMode} />
          </div>
          <div className="flex-1 min-w-0 py-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6" style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)"}}>
              <Fingerprint className="w-7 h-7 text-white"/>
            </div>
            <h2 className="text-3xl xl:text-4xl font-black leading-[1.15] mb-3" style={{color:txt}}>
              Smart HR<br/>Platform
            </h2>
            <p className="text-sm xl:text-base leading-relaxed max-w-[280px]" style={{color:sub}}>
              Absensi, reimbursement, dan manajemen izin karyawan dalam satu platform enterprise.
            </p>
            <div className="mt-7 flex flex-col gap-2.5">
              {[{Icon:Shield,t:"Foto & GPS Absensi"},{Icon:Receipt,t:"Expense Reimbursement"},{Icon:CalendarCheck,t:"Manajemen Izin & Cuti"}].map(({Icon,t})=>(
                <div key={t} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-indigo-400 flex-shrink-0" style={{background:"rgba(99,102,241,0.12)"}}>
                    <Icon className="w-3.5 h-3.5"/>
                  </div>
                  <span className="text-sm" style={{color:sub}}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="w-full max-w-[400px] mx-auto lg:max-w-none">
          <div className="rounded-3xl p-7 sm:p-8" style={glass}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex lg:hidden items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)"}}>
                  <Fingerprint className="w-5 h-5 text-white"/>
                </div>
                <div>
                  <p className="text-xs font-black tracking-wide" style={{color:"#6366f1"}}>PAYROLLIN</p>
                  <p className="text-[10px]" style={{color:dim}}>Smart HR Platform</p>
                </div>
              </div>
              <button onClick={()=>setDarkMode(d=>!d)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:opacity-80 ml-auto" style={{background:darkMode?"rgba(255,255,255,0.06)":"rgba(99,102,241,0.08)"}}>
                {darkMode ? <Sun className="w-4 h-4 text-amber-400"/> : <Moon className="w-4 h-4 text-slate-500"/>}
              </button>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black mb-1" style={{color:txt}}>Welcome back</h1>
            <p className="text-sm mb-6" style={{color:sub}}>Masuk ke akun PAYROLLIN Anda</p>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold mb-2 uppercase tracking-wider" style={{color:sub}}>Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400"/>
                  <input type="email" placeholder="nama@perusahaan.com" value={email} onChange={e=>setEmail(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none" style={{background:darkMode?"rgba(255,255,255,0.04)":"rgba(99,102,241,0.05)",border:`1px solid ${divC}`,color:txt}}/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold mb-2 uppercase tracking-wider" style={{color:sub}}>Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400"/>
                  <input type={showPw?"text":"password"} placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} className="w-full pl-10 pr-10 py-3 rounded-xl text-sm outline-none" style={{background:darkMode?"rgba(255,255,255,0.04)":"rgba(99,102,241,0.05)",border:`1px solid ${divC}`,color:txt}}/>
                  <button type="button" onClick={()=>setShowPw(p=>!p)} className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{color:dim}}>{showPw?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}</button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className="w-4 h-4 rounded flex items-center justify-center" style={{background:"#6366f1"}}>
                    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <span className="text-xs" style={{color:sub}}>Ingat saya</span>
                </label>
                <button type="button" className="text-xs font-bold" style={{color:"#6366f1"}}>Lupa password?</button>
              </div>
              <button onClick={()=>{setScreen("home");setActiveTab("home");}} className="w-full py-3 rounded-xl font-bold text-white hover:opacity-90 active:scale-[0.98] transition-transform" style={{background:"linear-gradient(135deg,#4338ca,#7c3aed)"}}>Masuk</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── HOME ────────────────────────────────────────────────────
  if (screen==="home") {
    const sumCards = [
      {label:"Hadir",value:"18",color:"#10b981",bg:"rgba(16,185,129,0.15)"},
      {label:"Telat",value:"2", color:"#f59e0b",bg:"rgba(245,158,11,0.15)"},
      {label:"Izin", value:"1", color:"#6366f1",bg:"rgba(99,102,241,0.15)"},
      {label:"Cuti", value:"3", color:"#8b5cf6",bg:"rgba(139,92,246,0.15)"},
    ];
    const hasCheckedIn = !!todayRecord?.checkIn;
    const hasCheckedOut = !!todayRecord?.checkOut;
    const canCheckIn = !hasCheckedIn;
    const canCheckOut = hasCheckedIn && !hasCheckedOut;
    return (
      <div className="size-full flex flex-col overflow-hidden" style={{background:bgPage}}>
        <div className="flex-1 overflow-y-auto pb-28">
          {absenNotice && (
            <div className="mx-5 mt-3 mb-1 px-4 py-3 rounded-2xl flex items-center gap-3" style={{background:"rgba(16,185,129,0.15)",border:"1px solid rgba(16,185,129,0.35)"}}>
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0"/>
              <div className="min-w-0">
                <p className="text-sm font-bold text-emerald-400">{absenNotice}</p>
                {attendanceGeo && <p className="text-xs mt-0.5 truncate" style={{color:sub}}>{attendanceGeo.address}</p>}
              </div>
            </div>
          )}
          {/* Topbar */}
          <div className="flex items-center justify-between px-5 pt-12 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-base flex-shrink-0" style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)"}}>BS</div>
              <div>
                <p className="text-xs" style={{color:sub}}>Selamat pagi,</p>
                <p className="font-bold text-sm" style={{color:txt}}>Budi Santoso</p>
                <p className="text-xs font-medium" style={{color:"#6366f1"}}>Frontend Developer</p>
              </div>
            </div>
            <div className="flex items-center gap-2"><DarkBtn/><BellBtn/></div>
          </div>
          {/* Clock card */}
          <div className="mx-5 mt-2 rounded-3xl overflow-hidden relative" style={{background:"linear-gradient(135deg,#312e81,#4c1d95,#6d28d9)"}}>
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-15" style={{background:"radial-gradient(circle,#fff,transparent 70%)",transform:"translate(20%,-20%)"}}/>
            <div className="relative p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-indigo-300 text-xs uppercase tracking-widest mb-2">Waktu Sekarang</p>
                  <p className="text-5xl font-black text-white tracking-tight leading-none" style={{fontFamily:"'JetBrains Mono',monospace"}}>{timeStr}</p>
                  <p className="text-indigo-300 text-sm mt-2 capitalize">{dateStr}</p>
                </div>
                <div className="px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-200" style={{background:"rgba(255,255,255,0.15)"}}>WIB</div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${hasCheckedOut ? "bg-emerald-400" : hasCheckedIn ? "bg-indigo-300 animate-pulse" : "bg-amber-400 animate-pulse"}`}/>
                <span className="text-indigo-200 text-sm">
                  {hasCheckedOut
                    ? `Selesai · Masuk ${todayRecord!.checkIn} · Keluar ${todayRecord!.checkOut}`
                    : hasCheckedIn
                      ? `Sudah absen masuk · ${todayRecord!.checkIn} · Belum pulang`
                      : "Belum absen hari ini"}
                </span>
              </div>
              <div className="mt-4 flex gap-3">
                {canCheckIn && (
                  <button onClick={()=>doAbsen("masuk")} className="flex-1 py-3 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 hover:opacity-90 active:scale-95" style={{background:"rgba(255,255,255,0.22)"}}>
                    <Clock className="w-4 h-4"/> Absen Masuk
                  </button>
                )}
                {canCheckOut && (
                  <button onClick={()=>doAbsen("keluar")} className={`${canCheckIn ? "flex-1" : "w-full"} py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-95`} style={{background:"rgba(0,0,0,0.25)",color:"rgba(255,255,255,0.85)"}}>
                    <LogOut className="w-4 h-4"/> Absen Keluar
                  </button>
                )}
                {hasCheckedOut && (
                  <div className="w-full py-3 rounded-2xl text-sm font-bold text-center text-emerald-200" style={{background:"rgba(16,185,129,0.2)"}}>
                    Absensi hari ini selesai ✓
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Summary */}
          <div className="px-5 mt-5">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{color:sub}}>Rekap Juli 2026</p>
            <div className="grid grid-cols-4 gap-2.5">
              {sumCards.map(c=>(
                <div key={c.label} className="rounded-2xl p-3 text-center" style={{background:c.bg,border:`1px solid ${c.color}30`}}>
                  <p className="text-2xl font-black" style={{color:c.color}}>{c.value}</p>
                  <p className="text-xs mt-0.5" style={{color:sub}}>{c.label}</p>
                </div>
              ))}
            </div>
          </div>
          {/* Recent */}
          <div className="px-5 mt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-widest" style={{color:sub}}>Riwayat Terbaru</p>
              <button onClick={()=>navigate("history")} className="text-xs font-bold" style={{color:"#6366f1"}}>Lihat semua →</button>
            </div>
            <div className="flex flex-col gap-2.5">
              {historyList.length === 0 && !historyLoading && (
                <div className="rounded-2xl p-6 text-center" style={glass}>
                  <p className="text-sm" style={{color:sub}}>Belum ada riwayat absensi</p>
                </div>
              )}
              {historyList.slice(0,3).map((item)=>{
                const cfg=attendStatusCfg[item.status as keyof typeof attendStatusCfg];
                return (
                  <div key={item.dateKey} className="rounded-2xl p-4 flex items-center justify-between" style={glass}>
                    <div>
                      <p className="text-sm font-bold" style={{color:txt}}>{item.date}</p>
                      <p className="text-xs mt-0.5" style={{color:dim}}>
                        {formatTimeRange(item.checkIn, item.checkOut)}
                        {item.location && ` · ${item.location}`}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${cfg.color} ${cfg.bg}`}>{cfg.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Quick access */}
          <div className="px-5 mt-4 grid grid-cols-3 gap-3 mb-2">
            {[
              {label:"Admin",    sub2:"Dashboard",  bg:"linear-gradient(135deg,#6366f1,#8b5cf6)", Icon:BarChart2,    onClick:()=>setScreen("admin")},
              {label:"Reimburse",sub2:`${reimList.filter(r=>r.status==="draft").length} Draft`, bg:"linear-gradient(135deg,#10b981,#059669)", Icon:Receipt,       onClick:()=>navigate("reimbursement")},
              {label:"Izin",     sub2:`${leaveList.filter(l=>l.status==="pending").length} Pending`, bg:"linear-gradient(135deg,#f59e0b,#d97706)", Icon:CalendarCheck, onClick:()=>navigate("leave")},
            ].map(({label,sub2,bg,Icon,onClick})=>(
              <button key={label} onClick={onClick} className="rounded-2xl p-4 flex flex-col items-start gap-2 hover:opacity-80" style={glass}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:bg}}><Icon className="w-4 h-4 text-white"/></div>
                <div><p className="text-xs font-bold" style={{color:txt}}>{label}</p><p className="text-xs" style={{color:sub}}>{sub2}</p></div>
              </button>
            ))}
          </div>
        </div>
        <BottomNav/>
      </div>
    );
  }

  // ── ATTENDANCE ──────────────────────────────────────────────
  if (screen==="attendance") {
    const latDisplay = currentGeo ? formatLatitude(currentGeo.latitude) : geoLoading ? "..." : "-";
    const lngDisplay = currentGeo ? formatLongitude(currentGeo.longitude) : geoLoading ? "..." : "-";
    const accDisplay = currentGeo ? `±${Math.round(currentGeo.accuracy)} meter` : geoLoading ? "..." : "-";
    const addrDisplay = currentGeo?.address ?? (geoError ?? "Aktifkan GPS untuk melihat lokasi");
    const gpsStatus = geoLoading ? "Mengambil lokasi..." : currentGeo ? `GPS Aktif · Akurasi ${accDisplay}` : "GPS tidak tersedia";
    const attHasCheckedIn = !!todayRecord?.checkIn;
    const attHasCheckedOut = !!todayRecord?.checkOut;
    const attCanCheckIn = !attHasCheckedIn;
    const attCanCheckOut = attHasCheckedIn && !attHasCheckedOut;

    return (
    <div className="size-full flex flex-col overflow-hidden" style={{background:bgPage}}>
      <div className="flex-1 overflow-y-auto pb-28">
        <Header title="Absensi" right={<button type="button" onClick={fetchGeo} disabled={geoLoading} className="w-10 h-10 flex items-center justify-center rounded-xl hover:opacity-80 disabled:opacity-50" style={glass}><RefreshCw className={`w-4 h-4 ${geoLoading?"animate-spin":""}`} style={{color:txt}}/></button>}/>
        <div className="mx-5 rounded-3xl overflow-hidden relative" style={{ height: 220 }}>
          {currentGeo ? (
            <>
              <LocationMap
                latitude={currentGeo.latitude}
                longitude={currentGeo.longitude}
                accuracy={currentGeo.accuracy}
              />
              <div className="absolute top-3 left-3 z-[1000] px-3 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 pointer-events-none" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Lokasi Terdeteksi
              </div>
              <a
                href={`https://www.google.com/maps?q=${currentGeo.latitude},${currentGeo.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-3 right-3 z-[1000] px-3 py-1.5 rounded-xl text-xs font-bold text-white hover:opacity-90"
                style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}
              >
                Buka di Maps →
              </a>
            </>
          ) : (
            <div className="w-full h-full relative flex items-center justify-center" style={{ background: darkMode ? "linear-gradient(135deg,#0f2027,#203a43,#2c5364)" : "linear-gradient(135deg,#dbeafe,#ede9fe,#c7d2fe)" }}>
              {geoLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                  <p className="text-sm font-medium" style={{ color: sub }}>Mengambil lokasi dari GPS...</p>
                </div>
              ) : (
                <div className="text-center px-6">
                  <MapPin className="w-10 h-10 text-indigo-400 mx-auto mb-2 opacity-60" />
                  <p className="text-sm font-medium" style={{ color: sub }}>{geoError ?? "Aktifkan GPS untuk melihat peta"}</p>
                  <button type="button" onClick={fetchGeo} className="mt-3 px-4 py-2 rounded-xl text-xs font-bold text-white" style={{ background: "linear-gradient(135deg,#4338ca,#6d28d9)" }}>
                    Coba Lagi
                  </button>
                </div>
              )}
              <div className="absolute top-3 left-3 px-3 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5" style={{ background: "rgba(0,0,0,0.5)" }}>
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${geoError ? "bg-red-400" : "bg-amber-400"}`} />
                {geoError ? "GPS Error" : geoLoading ? "Mencari Lokasi..." : "GPS Belum Aktif"}
              </div>
            </div>
          )}
        </div>
        <div className="mx-5 mt-4 rounded-2xl p-4" style={glass}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:"rgba(99,102,241,0.12)"}}><MapPin className="w-4 h-4 text-indigo-400"/></div>
            <div><p className="text-sm font-bold" style={{color:txt}}>Lokasi Saat Ini</p><p className="text-xs" style={{color:currentGeo?"#10b981":geoError?"#ef4444":"#f59e0b"}}>{gpsStatus}</p></div>
          </div>
          {geoError && !geoLoading && (
            <div className="mb-3 px-3 py-2 rounded-xl text-xs" style={{background:"rgba(239,68,68,0.12)",color:"#ef4444"}}>{geoError}</div>
          )}
          <div className="grid grid-cols-2 gap-2.5 mb-2.5">
            {[["Latitude",latDisplay],["Longitude",lngDisplay],["Akurasi GPS",accDisplay],["Status",currentGeo?"Terdeteksi":"Menunggu"]].map(([l,v])=>(
              <div key={l} className="rounded-xl p-2.5" style={{background:darkMode?"rgba(255,255,255,0.03)":"rgba(99,102,241,0.05)"}}>
                <p className="text-xs" style={{color:dim}}>{l}</p><p className="text-sm font-bold mt-0.5" style={{color:txt}}>{v}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl p-2.5" style={{background:darkMode?"rgba(255,255,255,0.03)":"rgba(99,102,241,0.05)"}}>
            <p className="text-xs" style={{color:dim}}>Alamat</p>
            <p className="text-sm mt-0.5 leading-relaxed" style={{color:txt}}>{addrDisplay}</p>
          </div>
        </div>
        <div className="mx-5 mt-4 flex flex-col gap-3">
          {attCanCheckIn && (
            <button onClick={()=>doAbsen("masuk")} className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-3 hover:opacity-90 active:scale-95" style={{background:"linear-gradient(135deg,#4338ca,#6d28d9)"}}><Clock className="w-5 h-5"/> Absen Masuk</button>
          )}
          {attCanCheckOut && (
            <button onClick={()=>doAbsen("keluar")} className="w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:opacity-80 active:scale-95" style={{...glass,color:txt}}><LogOut className="w-5 h-5"/> Absen Keluar</button>
          )}
          {attHasCheckedOut && (
            <div className="w-full py-4 rounded-2xl font-bold text-center text-emerald-400" style={{...glass}}>Absensi hari ini selesai ✓</div>
          )}
        </div>
      </div>
      <BottomNav/>
    </div>
    );
  }

  // ── CAMERA ─────────────────────────────────────────────────
  if (screen==="camera") return (
    <AttendanceCamera
      absenType={absenType}
      onClose={() => setScreen(cameraBack)}
      onCapture={handleCapture}
    />
  );

  // ── HISTORY ─────────────────────────────────────────────────
  if (screen==="history") {
    const periodHistory = filterAttendanceByPeriod(historyList, histFilter);
    const visibleHistory = periodHistory.filter(
      (item) =>
        !searchQ ||
        item.date.toLowerCase().includes(searchQ.toLowerCase()) ||
        (item.location ?? "").toLowerCase().includes(searchQ.toLowerCase())
    );
    const histTabs: { key: HistFilter; label: string }[] = [
      { key: "daily", label: "Harian" },
      { key: "weekly", label: "Mingguan" },
      { key: "monthly", label: "Bulanan" },
      { key: "yearly", label: "Tahunan" },
    ];

    return (
    <div className="size-full flex flex-col overflow-hidden" style={{background:bgPage}}>
      <div className="flex-1 overflow-y-auto pb-28">
        <Header title="Riwayat Absensi" back={()=>{setScreen("home");setActiveTab("home");}} right={
          <button
            type="button"
            onClick={handleExportHistory}
            disabled={exporting}
            className="flex items-center gap-1.5 h-10 px-3 rounded-xl hover:opacity-80 disabled:opacity-50"
            style={glass}
          >
            <Download className={`w-4 h-4 ${exporting ? "animate-pulse" : ""}`} style={{color:txt}}/>
            <span className="text-xs font-bold" style={{color:txt}}>{exporting ? "..." : "Export"}</span>
          </button>
        }/>
        <div className="px-5 mb-4"><div className="flex gap-1 p-1 rounded-2xl" style={glass}>{histTabs.map(({key,label})=>(<button key={key} type="button" onClick={()=>setHistFilter(key)} className="flex-1 py-2 rounded-xl text-xs font-bold" style={{background:histFilter===key?"linear-gradient(135deg,#4338ca,#6d28d9)":"transparent",color:histFilter===key?"#fff":dim}}>{label}</button>))}</div></div>
        <div className="px-5 mb-4">
          <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{color:dim}}/><input type="text" placeholder="Cari riwayat..." value={searchQ} onChange={e=>setSearchQ(e.target.value)} className="w-full pl-11 pr-4 py-3 rounded-2xl text-sm outline-none" style={{...glass,color:txt}}/></div>
        </div>
        <div className="px-5 flex flex-col gap-2.5">
          {visibleHistory.length === 0 && !historyLoading && (
            <div className="rounded-2xl p-8 text-center" style={glass}>
              <p className="text-sm font-bold" style={{color:txt}}>Belum ada riwayat</p>
              <p className="text-xs mt-1" style={{color:sub}}>Tidak ada data absensi untuk periode {histTabs.find(t=>t.key===histFilter)?.label.toLowerCase()} ini</p>
            </div>
          )}
          {visibleHistory.map((item)=>{
            const cfg=attendStatusCfg[item.status as keyof typeof attendStatusCfg];
            return (
              <div key={item.dateKey} className="rounded-2xl p-4" style={glass}>
                <div className="flex items-start justify-between mb-3"><p className="text-sm font-bold" style={{color:txt}}>{item.date}</p><span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${cfg.color} ${cfg.bg}`}>{cfg.label}</span></div>
                <div className="grid grid-cols-3 gap-2">{[["Masuk",formatCheckIn(item.checkIn)],["Keluar",formatCheckOut(item.checkOut)],["Lokasi",item.location??"—"]].map(([l,v])=>(<div key={l}><p className="text-xs" style={{color:dim}}>{l}</p><p className="text-sm font-bold mt-0.5 truncate" style={{color:l==="Keluar"&&!item.checkOut?dim:txt,fontFamily:l!=="Lokasi"?"'JetBrains Mono',monospace":undefined}}>{v}</p></div>))}</div>
              </div>
            );
          })}
        </div>
      </div>
      <BottomNav/>
    </div>
  );
  }

  // ── NOTIFICATIONS ────────────────────────────────────────────
  if (screen==="notifications") {
    const ntypeCfg={reminder:{emoji:"⏰",bg:"rgba(245,158,11,0.15)"},approval:{emoji:"✅",bg:"rgba(16,185,129,0.15)"},announcement:{emoji:"📢",bg:"rgba(99,102,241,0.15)"}};
    const tabs=["all","reminder","approval","announcement"];
    const filtered=notifTab==="all"?notifData:notifData.filter(n=>n.type===notifTab);
    return (
      <div className="size-full flex flex-col overflow-hidden" style={{background:bgPage}}>
        <div className="flex-1 overflow-y-auto pb-28">
          <Header title="Notifikasi" back={()=>setScreen(prevScreen)} right={<button className="text-sm font-bold" style={{color:"#6366f1"}}>Baca semua</button>} hideBell/>
          <div className="px-5 mb-4 flex gap-2 overflow-x-auto pb-1" style={{scrollbarWidth:"none"}}>
            {["Semua","Reminder","Approval","Pengumuman"].map((lbl,i)=>(
              <button key={lbl} onClick={()=>setNotifTab(tabs[i])} className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold" style={{background:notifTab===tabs[i]?"linear-gradient(135deg,#4338ca,#6d28d9)":darkMode?"rgba(255,255,255,0.07)":"rgba(99,102,241,0.06)",color:notifTab===tabs[i]?"#fff":dim,border:`1px solid ${notifTab===tabs[i]?"transparent":darkMode?"rgba(255,255,255,0.1)":"rgba(99,102,241,0.1)"}`}}>{lbl}</button>
            ))}
          </div>
          <div className="px-5 flex flex-col gap-2.5">
            {filtered.map((n,i)=>{
              const cfg=ntypeCfg[n.type as keyof typeof ntypeCfg];
              return (
                <div key={i} className="rounded-2xl p-4 flex items-start gap-3.5" style={{...glass,opacity:n.read?0.72:1}}>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{background:cfg.bg}}>{cfg.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2"><p className="text-sm font-bold flex-1 truncate" style={{color:txt}}>{n.title}</p>{!n.read&&<span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0"/>}</div>
                    <p className="text-xs mt-1 leading-relaxed" style={{color:sub}}>{n.body}</p>
                    <p className="text-xs mt-2" style={{color:dim}}>{n.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <BottomNav/>
      </div>
    );
  }

  // ── PROFILE ──────────────────────────────────────────────────
  if (screen==="profile") {
    const menu=[{Icon:Edit3,label:"Edit Profil",color:"#6366f1"},{Icon:Settings,label:"Pengaturan",color:"#8b5cf6"},{Icon:Lock,label:"Privasi & Keamanan",color:"#06b6d4"},{Icon:Download,label:"Ekspor Data",color:"#10b981"},{Icon:LogOut,label:"Keluar",color:"#ef4444",danger:true}];
    return (
      <div className="size-full flex flex-col overflow-hidden" style={{background:bgPage}}>
        <div className="flex-1 overflow-y-auto pb-28">
          <Header title="Profil" right={<DarkBtn/>}/>
          <div className="mx-5 mb-5 rounded-3xl overflow-hidden relative" style={{background:"linear-gradient(135deg,#312e81,#4c1d95,#6d28d9)"}}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-15" style={{background:"radial-gradient(circle,#fff,transparent 70%)",transform:"translate(25%,-25%)"}}/>
            <div className="relative p-6 text-center">
              <div className="w-24 h-24 rounded-3xl mx-auto mb-3 flex items-center justify-center text-white font-black text-2xl" style={{background:"rgba(255,255,255,0.2)"}}>BS</div>
              <h2 className="text-xl font-black text-white">Budi Santoso</h2>
              <p className="text-indigo-200 text-sm mt-0.5">Frontend Developer · Engineering</p>
              <div className="flex justify-center gap-8 mt-4 pt-4 border-t border-white/15">
                {[["18","Hadir"],["2","Telat"],["3","Cuti"]].map(([v,l])=>(<div key={l}><p className="text-white font-black text-lg">{v}</p><p className="text-indigo-200 text-xs">{l}</p></div>))}
              </div>
            </div>
          </div>
          <div className="px-5 mb-4">
            <div className="rounded-2xl overflow-hidden" style={glass}>
              {[{Icon:Mail,label:"Email",value:"budi.santoso@payrollin.id"},{Icon:Building2,label:"Departemen",value:"Engineering"},{Icon:Phone,label:"Telepon",value:"+62 812-3456-7890"},{Icon:MapPin,label:"Kantor",value:"Jakarta Selatan"}].map(({Icon,label,value},i,arr)=>(
                <div key={label} className="flex items-center gap-4 px-4 py-3.5" style={{borderBottom:i<arr.length-1?`1px solid ${divC}`:"none"}}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-indigo-400" style={{background:"rgba(99,102,241,0.1)"}}><Icon className="w-4 h-4"/></div>
                  <div><p className="text-xs" style={{color:dim}}>{label}</p><p className="text-sm font-bold" style={{color:txt}}>{value}</p></div>
                </div>
              ))}
            </div>
          </div>
          <div className="px-5">
            <div className="rounded-2xl overflow-hidden" style={glass}>
              {menu.map(({Icon,label,color,danger},i)=>(
                <button key={label} onClick={()=>{if(danger)setScreen("login");}} className="w-full flex items-center gap-4 px-4 py-3.5 text-left hover:opacity-75" style={{borderBottom:i<menu.length-1?`1px solid ${divC}`:"none"}}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:`${color}18`,color}}><Icon className="w-4 h-4"/></div>
                  <span className="flex-1 text-sm font-bold" style={{color:danger?"#ef4444":txt}}>{label}</span>
                  {!danger&&<ChevronRight className="w-4 h-4" style={{color:dim}}/>}
                </button>
              ))}
            </div>
          </div>
        </div>
        <BottomNav/>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // ── LEAVE FORM ───────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════
  if (screen==="leave-form") {
    const dur = calcDur(leaveForm.startDate, leaveForm.endDate);
    const selType = leaveCfgMap[leaveForm.type];
    const needDoc = leaveForm.type==="Sakit"||leaveForm.type==="Cuti Khusus"||leaveForm.type==="Dinas";

    const submitLeave = (asDraft: boolean) => {
      const newId = `REQ-2026-00${leaveList.length+1}`;
      const entry: LeaveRequest = {
        id: newId, type: leaveForm.type,
        startDate: leaveForm.startDate||"03 Jul 2026",
        endDate:   leaveForm.endDate||"03 Jul 2026",
        duration: dur,
        reason: leaveForm.reason||"(belum diisi)",
        attachment: attached?(leaveForm.type==="Sakit"?"surat_dokter.pdf":"lampiran.pdf"):undefined,
        notes: leaveForm.notes,
        status: asDraft?"draft":"pending",
        createdAt: "03 Jul 2026",
      };
      setLeaveList(l=>[entry,...l]);
      setLeaveForm({type:"Sakit",startDate:"",endDate:"",reason:"",notes:""});
      setAttached(false);
      setScreen("leave");
      setLeaveFilter(asDraft?"draft":"pending");
    };

    return (
      <div className="size-full flex flex-col overflow-hidden" style={{background:bgPage}}>
        <div className="flex-1 overflow-y-auto pb-8">
          <Header title="Ajukan Permohonan" back={()=>setScreen("leave")} hideBell/>

          {/* Type grid */}
          <div className="px-5 mb-5">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{color:sub}}>Jenis Permohonan</p>
            <div className="grid grid-cols-4 gap-2">
              {leaveTypes.map(t=>{
                const active=leaveForm.type===t.type;
                return (
                  <button key={t.type} onClick={()=>setLeaveForm(f=>({...f,type:t.type}))}
                    className="rounded-2xl p-3 flex flex-col items-center gap-1.5 transition-all"
                    style={{background:active?t.bg:darkMode?"rgba(255,255,255,0.04)":"rgba(99,102,241,0.05)",border:`2px solid ${active?t.color:"transparent"}`}}>
                    <span className="text-xl">{t.emoji}</span>
                    <p className="text-[10px] font-bold text-center leading-tight" style={{color:active?t.color:dim}}>{t.type}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected type pill */}
          <div className="px-5 mb-4">
            <div className="flex items-center gap-3 p-4 rounded-2xl" style={{background:selType.bg,border:`1px solid ${selType.color}40`}}>
              <span className="text-3xl">{selType.emoji}</span>
              <div>
                <p className="text-sm font-black" style={{color:selType.color}}>{selType.type}</p>
                <p className="text-xs mt-0.5" style={{color:sub}}>
                  {selType.type==="Sakit"&&"Wajib upload surat dokter"}
                  {selType.type==="Cuti"&&"Cuti tahunan — sisa 12 hari"}
                  {selType.type==="WFH"&&"Bekerja dari rumah"}
                  {selType.type==="Dinas"&&"Perjalanan dinas luar kota/negeri"}
                  {selType.type==="Izin"&&"Izin keperluan pribadi"}
                  {selType.type==="Izin Mendadak"&&"Izin mendadak hari ini"}
                  {selType.type==="Cuti Khusus"&&"Menikah, duka cita, melahirkan, dll"}
                </p>
              </div>
            </div>
          </div>

          {/* Date range */}
          <div className="px-5 mb-4">
            <div className="rounded-2xl p-4 flex flex-col gap-3" style={glass}>
              <p className="text-xs font-bold uppercase tracking-widest" style={{color:sub}}>Tanggal</p>
              <div className="grid grid-cols-2 gap-3">
                {[{label:"Tanggal Mulai",key:"startDate"},{label:"Tanggal Selesai",key:"endDate"}].map(({label,key})=>(
                  <div key={key}>
                    <p className="text-xs font-semibold mb-1.5" style={{color:dim}}>{label}</p>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{color:"#6366f1"}}/>
                      <input type="date" value={leaveForm[key as "startDate"|"endDate"]} onChange={e=>setLeaveForm(f=>({...f,[key]:e.target.value}))}
                        className="w-full pl-9 pr-3 py-3 rounded-xl text-sm outline-none"
                        style={{background:darkMode?"rgba(255,255,255,0.04)":"rgba(99,102,241,0.05)",border:`1px solid ${divC}`,color:txt}}/>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl" style={{background:"rgba(99,102,241,0.12)"}}>
                <Clock3 className="w-4 h-4 text-indigo-400"/>
                <span className="text-sm font-bold text-indigo-400">Durasi: {dur} hari kerja</span>
              </div>
            </div>
          </div>

          {/* Reason */}
          <div className="px-5 mb-4">
            <div className="rounded-2xl p-4" style={glass}>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{color:sub}}>Alasan</p>
              <textarea rows={4} placeholder="Jelaskan alasan permohonan Anda secara lengkap..." value={leaveForm.reason} onChange={e=>setLeaveForm(f=>({...f,reason:e.target.value}))}
                className="w-full px-3.5 py-3 rounded-xl text-sm outline-none resize-none"
                style={{background:darkMode?"rgba(255,255,255,0.04)":"rgba(99,102,241,0.05)",border:`1px solid ${divC}`,color:txt}}/>
            </div>
          </div>

          {/* Attachment */}
          <div className="px-5 mb-4">
            <div className="rounded-2xl p-4" style={glass}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-widest" style={{color:sub}}>
                  Lampiran {needDoc&&<span className="text-red-400 normal-case font-medium">(Wajib)</span>}
                </p>
                {attached&&<button onClick={()=>setAttached(false)} className="text-xs text-red-400 font-bold">Hapus</button>}
              </div>
              {attached ? (
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.3)"}}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:"rgba(16,185,129,0.2)"}}><FileText className="w-4 h-4 text-emerald-400"/></div>
                  <div className="flex-1"><p className="text-sm font-bold text-emerald-400">{leaveForm.type==="Sakit"?"surat_dokter.pdf":"lampiran.pdf"}</p><p className="text-xs" style={{color:sub}}>245 KB · PDF</p></div>
                  <CheckCircle className="w-4 h-4 text-emerald-400"/>
                </div>
              ) : (
                <button onClick={()=>setAttached(true)} className="w-full flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed hover:opacity-80" style={{borderColor:darkMode?"rgba(99,102,241,0.3)":"rgba(99,102,241,0.2)"}}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:"rgba(99,102,241,0.1)"}}><FileUp className="w-5 h-5 text-indigo-400"/></div>
                  <p className="text-sm font-bold" style={{color:"#6366f1"}}>Upload Lampiran</p>
                  <p className="text-xs" style={{color:dim}}>Foto, PDF, atau Surat Dokter</p>
                </button>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="px-5 mb-6">
            <div className="rounded-2xl p-4" style={glass}>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{color:sub}}>Catatan Tambahan (Opsional)</p>
              <input type="text" placeholder="Informasi tambahan untuk atasan..." value={leaveForm.notes} onChange={e=>setLeaveForm(f=>({...f,notes:e.target.value}))}
                className="w-full px-3.5 py-3 rounded-xl text-sm outline-none"
                style={{background:darkMode?"rgba(255,255,255,0.04)":"rgba(99,102,241,0.05)",border:`1px solid ${divC}`,color:txt}}/>
            </div>
          </div>

          {/* Buttons */}
          <div className="px-5 flex gap-3">
            <button onClick={()=>submitLeave(true)} className="flex-1 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-80 active:scale-95" style={{...glass,color:txt}}>
              <FileText className="w-4 h-4"/> Draft
            </button>
            <button onClick={()=>submitLeave(false)} className="flex-[2] py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 hover:opacity-90 active:scale-95" style={{background:"linear-gradient(135deg,#4338ca,#6d28d9)"}}>
              <Send className="w-4 h-4"/> Kirim Permohonan
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // ── LEAVE LIST ───────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════
  if (screen==="leave") {
    const statusTabs:[typeof leaveFilter,string][]=[["all","Semua"],["pending","Menunggu"],["approved","Disetujui"],["rejected","Ditolak"],["draft","Draft"]];
    const visible=leaveList.filter(l=>{
      const sOk=leaveFilter==="all"||l.status===leaveFilter;
      const tOk=leaveTypeF==="all"||l.type===leaveTypeF;
      return sOk&&tOk;
    });
    const usedCuti  = leaveList.filter(l=>l.type==="Cuti"&&l.status==="approved").reduce((s,l)=>s+l.duration,0);
    const usedSakit = leaveList.filter(l=>l.type==="Sakit"&&l.status==="approved").reduce((s,l)=>s+l.duration,0);
    const usedIzin  = leaveList.filter(l=>l.type==="Izin"&&l.status==="approved").reduce((s,l)=>s+l.duration,0);

    return (
      <div className="size-full flex flex-col overflow-hidden" style={{background:bgPage}}>
        <div className="flex-1 overflow-y-auto pb-32">
          {/* Header with admin toggle */}
          <div className="flex items-center justify-between px-5 pt-12 pb-4 flex-shrink-0">
            <div className="w-10"/>
            <h1 className="text-base font-bold" style={{color:txt}}>{adminView?"Tim · Izin & Cuti":"Izin & Cuti Saya"}</h1>
            <div className="flex items-center gap-2">
              <button onClick={()=>setAdminView(v=>!v)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:opacity-80" style={{...glass,background:adminView?"rgba(99,102,241,0.3)":undefined}}>
                {adminView?<User className="w-4 h-4 text-indigo-400"/>:<Users className="w-4 h-4" style={{color:txt}}/>}
              </button>
              <BellBtn/>
            </div>
          </div>

          {/* ── USER VIEW ── */}
          {!adminView && <>
            {/* Balance card */}
            <div className="mx-5 mb-4 rounded-3xl overflow-hidden" style={{background:"linear-gradient(135deg,#065f46,#047857,#059669)"}}>
              <div className="relative p-5">
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10" style={{background:"radial-gradient(circle,#fff,transparent 70%)",transform:"translate(20%,-20%)"}}/>
                <p className="text-emerald-200 text-xs uppercase tracking-widest mb-3">Sisa Jatah Izin — 2026</p>
                <div className="grid grid-cols-3 gap-3">
                  {[{label:"Cuti",total:12,used:usedCuti,color:"#a7f3d0"},{label:"Sakit",total:14,used:usedSakit,color:"#fde68a"},{label:"Izin",total:6,used:usedIzin,color:"#c4b5fd"}].map(b=>(
                    <div key={b.label} className="rounded-2xl p-3 text-center" style={{background:"rgba(255,255,255,0.12)"}}>
                      <p className="text-2xl font-black" style={{color:b.color}}>{b.total-b.used}</p>
                      <p className="text-xs text-emerald-200">{b.label}</p>
                      <p className="text-[10px] text-emerald-300 mt-0.5">{b.used}/{b.total} terpakai</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Type chips */}
            <div className="px-5 mb-3">
              <div className="flex gap-2 overflow-x-auto pb-1" style={{scrollbarWidth:"none"}}>
                <button onClick={()=>setLeaveTypeF("all")} className="flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold" style={{background:leaveTypeF==="all"?"rgba(99,102,241,0.2)":darkMode?"rgba(255,255,255,0.05)":"rgba(99,102,241,0.05)",color:leaveTypeF==="all"?"#6366f1":dim,border:`1px solid ${leaveTypeF==="all"?"#6366f1":"transparent"}`}}>Semua Jenis</button>
                {leaveTypes.map(t=>(
                  <button key={t.type} onClick={()=>setLeaveTypeF(leaveTypeF===t.type?"all":t.type)} className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold" style={{background:leaveTypeF===t.type?t.bg:darkMode?"rgba(255,255,255,0.05)":"rgba(99,102,241,0.05)",color:leaveTypeF===t.type?t.color:dim,border:`1px solid ${leaveTypeF===t.type?t.color:"transparent"}`}}>
                    <span>{t.emoji}</span>{t.type}
                  </button>
                ))}
              </div>
            </div>

            {/* Status tabs */}
            <div className="px-5 mb-4">
              <div className="flex gap-2 overflow-x-auto pb-1" style={{scrollbarWidth:"none"}}>
                {statusTabs.map(([key,lbl])=>(
                  <button key={key} onClick={()=>setLeaveFilter(key)} className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold" style={{background:leaveFilter===key?"linear-gradient(135deg,#4338ca,#6d28d9)":darkMode?"rgba(255,255,255,0.06)":"rgba(99,102,241,0.06)",color:leaveFilter===key?"#fff":dim,border:`1px solid ${leaveFilter===key?"transparent":divC}`}}>
                    {lbl} <span className="opacity-60">({key==="all"?leaveList.length:leaveList.filter(l=>l.status===key).length})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Cards */}
            <div className="px-5 flex flex-col gap-3">
              {visible.length===0&&(
                <div className="text-center py-12"><p className="text-4xl mb-3">📋</p><p className="font-bold" style={{color:txt}}>Tidak ada permohonan</p><p className="text-sm mt-1" style={{color:sub}}>Buat permohonan baru dengan tombol di bawah</p></div>
              )}
              {visible.map(req=>{
                const tcfg=leaveCfgMap[req.type];
                const scfg=leaveStatusCfg[req.status];
                const expanded=expandLeave===req.id;
                return (
                  <div key={req.id} className="rounded-2xl overflow-hidden" style={glass}>
                    <button className="w-full p-4 text-left" onClick={()=>setExpandLeave(expanded?null:req.id)}>
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{background:tcfg.bg}}>{tcfg.emoji}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div><p className="text-sm font-black" style={{color:txt}}>{req.type}</p><p className="text-xs mt-0.5" style={{color:dim,fontFamily:"'JetBrains Mono',monospace"}}>{req.id}</p></div>
                            <span className="px-2.5 py-1 rounded-xl text-xs font-bold flex-shrink-0" style={{background:scfg.bg,color:scfg.color}}>{scfg.label}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            <div className="flex items-center gap-1"><Calendar className="w-3 h-3" style={{color:dim}}/><span className="text-xs" style={{color:sub}}>{req.startDate}{req.endDate!==req.startDate?` – ${req.endDate}`:""}</span></div>
                            <div className="flex items-center gap-1"><Clock3 className="w-3 h-3" style={{color:dim}}/><span className="text-xs" style={{color:sub}}>{req.duration} hari</span></div>
                          </div>
                          <p className="text-xs mt-1.5 line-clamp-1" style={{color:dim}}>{req.reason}</p>
                        </div>
                      </div>
                    </button>

                    {expanded&&(
                      <div className="border-t" style={{borderColor:divC}}>
                        <div className="px-4 py-3 flex flex-col gap-3">
                          <div><p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{color:dim}}>Alasan Lengkap</p><p className="text-sm leading-relaxed" style={{color:txt}}>{req.reason}</p></div>
                          {req.attachment&&(
                            <div className="flex items-center gap-3 p-3 rounded-xl" style={{background:"rgba(99,102,241,0.08)",border:`1px solid ${divC}`}}>
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:"rgba(99,102,241,0.15)"}}><Paperclip className="w-4 h-4 text-indigo-400"/></div>
                              <div className="flex-1"><p className="text-sm font-bold" style={{color:txt}}>{req.attachment}</p><p className="text-xs" style={{color:sub}}>Lampiran · PDF</p></div>
                              <button className="text-xs font-bold" style={{color:"#6366f1"}}>Lihat</button>
                            </div>
                          )}
                          {req.notes&&<div><p className="text-xs font-bold uppercase tracking-widest mb-1" style={{color:dim}}>Catatan</p><p className="text-sm" style={{color:sub}}>{req.notes}</p></div>}
                          {req.status==="approved"&&<div className="flex items-start gap-3 p-3 rounded-xl" style={{background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.25)"}}><CheckSquare className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5"/><div><p className="text-sm font-bold text-emerald-400">Permohonan Disetujui</p><p className="text-xs mt-0.5" style={{color:sub}}>HR Manager · {req.createdAt}</p></div></div>}
                          {req.status==="rejected"&&<div className="flex items-start gap-3 p-3 rounded-xl" style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.25)"}}><XSquare className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"/><div><p className="text-sm font-bold text-red-400">Permohonan Ditolak</p>{req.decisionReason&&<p className="text-xs mt-0.5" style={{color:sub}}>{req.decisionReason}</p>}</div></div>}
                          {req.status==="pending"&&<div className="flex items-center gap-3 p-3 rounded-xl" style={{background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.25)"}}><AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0"/><div><p className="text-sm font-bold text-amber-400">Menunggu Persetujuan</p><p className="text-xs mt-0.5" style={{color:sub}}>Sedang direview oleh atasan</p></div></div>}
                        </div>
                        {req.status==="draft"&&(
                          <div className="px-4 pb-4 flex gap-2">
                            <button className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-80" style={{...glass,color:txt}}><Edit3 className="w-3.5 h-3.5"/> Edit</button>
                            <button onClick={()=>setLeaveList(l=>l.map(item=>item.id===req.id?{...item,status:"pending" as const}:item))} className="flex-[2] py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-95" style={{background:"linear-gradient(135deg,#4338ca,#6d28d9)"}}><Send className="w-3.5 h-3.5"/> Kirim Permohonan</button>
                          </div>
                        )}
                        {req.status==="rejected"&&(
                          <div className="px-4 pb-4">
                            <button onClick={()=>{setLeaveForm(f=>({...f,type:req.type,reason:req.reason}));setScreen("leave-form");}} className="w-full py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-95" style={{background:"linear-gradient(135deg,#4338ca,#6d28d9)"}}><Plus className="w-3.5 h-3.5"/> Ajukan Ulang</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>}

          {/* ── ADMIN VIEW ── */}
          {adminView&&(
            <div className="px-5 flex flex-col gap-4">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                {[{label:"Total Pengajuan",value:"23",color:"#6366f1",bg:"rgba(99,102,241,0.15)"},{label:"Menunggu",value:`${leaveList.filter(l=>l.status==="pending").length}`,color:"#f59e0b",bg:"rgba(245,158,11,0.15)"},{label:"Disetujui",value:"15",color:"#10b981",bg:"rgba(16,185,129,0.15)"},{label:"Ditolak",value:"2",color:"#ef4444",bg:"rgba(239,68,68,0.15)"}].map(s=>(
                  <div key={s.label} className="rounded-2xl p-4" style={{...glass,borderLeft:`3px solid ${s.color}`}}>
                    <p className="text-2xl font-black" style={{color:s.color}}>{s.value}</p>
                    <p className="text-xs font-bold mt-0.5" style={{color:txt}}>{s.label}</p>
                  </div>
                ))}
              </div>
              {/* Chart */}
              <div className="rounded-2xl p-5" style={glass}>
                <div className="flex items-center justify-between mb-4"><p className="text-sm font-bold" style={{color:txt}}>Tren Izin Mingguan</p><TrendingUp className="w-4 h-4 text-indigo-400"/></div>
                <div className="flex gap-3 mb-3 flex-wrap">
                  {[["bg-red-400","Sakit"],["bg-indigo-400","Izin"],["bg-emerald-400","Cuti"],["bg-purple-400","WFH"]].map(([cls,l])=>(
                    <span key={l} className="flex items-center gap-1.5 text-xs"><span className={`w-2 h-2 rounded-full ${cls}`}/><span style={{color:sub}}>{l}</span></span>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={leaveWeeklyData} barGap={2} barCategoryGap="30%">
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill:dim,fontSize:11}}/>
                    <YAxis hide/>
                    <Tooltip contentStyle={{background:darkMode?"#0f172a":"#fff",border:"1px solid rgba(99,102,241,0.2)",borderRadius:12,color:txt,fontSize:12}} cursor={{fill:"rgba(99,102,241,0.05)"}}/>
                    <Bar dataKey="sakit" stackId="a" fill="#ef4444"/>
                    <Bar dataKey="izin"  stackId="a" fill="#6366f1"/>
                    <Bar dataKey="cuti"  stackId="a" fill="#10b981"/>
                    <Bar dataKey="wfh"   stackId="a" fill="#8b5cf6" radius={[6,6,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Approval table */}
              <div className="rounded-2xl overflow-hidden" style={glass}>
                <div className="flex items-center justify-between p-4 border-b" style={{borderColor:divC}}>
                  <p className="text-sm font-bold" style={{color:txt}}>Butuh Persetujuan</p>
                  <button className="flex items-center gap-1.5 text-xs font-bold" style={{color:"#6366f1"}}><Download className="w-3 h-3"/> Export</button>
                </div>
                {teamLeaves.map((item,i)=>{
                  const scfg=leaveStatusCfg[item.status as keyof typeof leaveStatusCfg];
                  const tcfg=leaveCfgMap[item.type as LeaveType];
                  return (
                    <div key={i} className="p-4 flex items-center gap-3" style={{borderBottom:i<teamLeaves.length-1?`1px solid ${divC}`:"none"}}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0" style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)"}}>{item.name.split(" ").map((n:string)=>n[0]).join("").slice(0,2)}</div>
                      <div className="flex-1 min-w-0"><p className="text-sm font-bold truncate" style={{color:txt}}>{item.name}</p><p className="text-xs" style={{color:sub}}>{tcfg.emoji} {item.type} · {item.start}–{item.end}</p></div>
                      {item.status==="pending"?(
                        <div className="flex gap-2">
                          <button className="px-3 py-1.5 rounded-xl text-xs font-bold text-white hover:opacity-90" style={{background:"linear-gradient(135deg,#10b981,#059669)"}}>✓ Setuju</button>
                          <button className="px-3 py-1.5 rounded-xl text-xs font-bold hover:opacity-80" style={{background:"rgba(239,68,68,0.15)",color:"#ef4444"}}>✕ Tolak</button>
                        </div>
                      ):(
                        <span className="px-2.5 py-1 rounded-xl text-xs font-bold" style={{background:scfg.bg,color:scfg.color}}>{scfg.label}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* FAB */}
        {!adminView&&(
          <div className="fixed bottom-24 right-5 z-50">
            <button onClick={()=>setScreen("leave-form")} className="flex items-center gap-2 pl-4 pr-5 py-3.5 rounded-2xl text-white font-bold text-sm hover:opacity-90 active:scale-95" style={{background:"linear-gradient(135deg,#065f46,#059669)",boxShadow:"0 8px 32px rgba(16,185,129,0.45)"}}>
              <Plus className="w-5 h-5"/> Ajukan Izin
            </button>
          </div>
        )}
        <BottomNav/>
      </div>
    );
  }

  // ── REIMBURSEMENT FORM ──────────────────────────────────────
  if (screen==="reimbursement-form") {
    const addRI = ()=>setReimForm(f=>({...f,items:[...f.items,{desc:"",amount:""}]}));
    const remRI = (i:number)=>setReimForm(f=>({...f,items:f.items.filter((_,idx)=>idx!==i)}));
    const updRI = (i:number,k:"desc"|"amount",v:string)=>setReimForm(f=>({...f,items:f.items.map((it,idx)=>idx===i?{...it,[k]:v}:it)}));
    const totalNew=reimForm.items.reduce((s,it)=>s+(parseInt(it.amount)||0),0);
    const submitReim=()=>{
      if(!reimForm.purpose)return;
      const items=reimForm.items.filter(it=>it.desc&&it.amount).map(it=>({desc:it.desc,amount:parseInt(it.amount)}));
      const total=items.reduce((s,it)=>s+it.amount,0);
      const advance=parseInt(reimForm.advance)||0;
      const entry:Reimburse={id:`RMB-2026-00${reimList.length+1}`,date:reimForm.date||"03 Jul 2026",purpose:reimForm.purpose,project:reimForm.project||"Internal",items,total,advance,balance:total-advance,status:"draft"};
      setReimList(l=>[entry,...l]);
      setReimForm({date:"",project:"",purpose:"",advance:"",items:[{desc:"",amount:""}]});
      setScreen("reimbursement");setReimFilter("draft");
    };
    return (
      <div className="size-full flex flex-col overflow-hidden" style={{background:bgPage}}>
        <div className="flex-1 overflow-y-auto pb-8">
          <Header title="Pengajuan Baru" back={()=>setScreen("reimbursement")}/>
          <div className="px-5 flex flex-col gap-4">
            <div className="rounded-2xl p-4 flex flex-col gap-3" style={glass}>
              <p className="text-xs font-bold uppercase tracking-widest" style={{color:sub}}>Informasi Dasar</p>
              {[{label:"Tanggal",key:"date",type:"date",ph:""},{label:"Proyek",key:"project",type:"text",ph:"cth: Project Alpha"},{label:"Tujuan / Keperluan",key:"purpose",type:"text",ph:"cth: Perjalanan Dinas"},{label:"Uang Muka (Rp)",key:"advance",type:"number",ph:"0"}].map(({label,key,type,ph})=>(
                <div key={key}><p className="text-xs font-semibold mb-1.5" style={{color:dim}}>{label}</p><input type={type} placeholder={ph} value={reimForm[key as keyof typeof reimForm] as string} onChange={e=>setReimForm(f=>({...f,[key]:e.target.value}))} className="w-full px-3.5 py-3 rounded-xl text-sm outline-none" style={{...glass,color:txt}}/></div>
              ))}
            </div>
            <div className="rounded-2xl p-4 flex flex-col gap-3" style={glass}>
              <div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-widest" style={{color:sub}}>Rincian Pengeluaran</p><button onClick={addRI} className="flex items-center gap-1 text-xs font-bold" style={{color:"#6366f1"}}><Plus className="w-3.5 h-3.5"/> Tambah</button></div>
              {reimForm.items.map((item,i)=>(
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1 flex flex-col gap-2">
                    <input type="text" placeholder="Deskripsi pengeluaran" value={item.desc} onChange={e=>updRI(i,"desc",e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none" style={{background:darkMode?"rgba(255,255,255,0.04)":"rgba(99,102,241,0.05)",border:`1px solid ${divC}`,color:txt}}/>
                    <input type="number" placeholder="Jumlah (Rp)" value={item.amount} onChange={e=>updRI(i,"amount",e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none" style={{background:darkMode?"rgba(255,255,255,0.04)":"rgba(99,102,241,0.05)",border:`1px solid ${divC}`,color:txt}}/>
                  </div>
                  {reimForm.items.length>1&&<button onClick={()=>remRI(i)} className="w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0 mt-0.5" style={{background:"rgba(239,68,68,0.12)",color:"#ef4444"}}><Trash2 className="w-4 h-4"/></button>}
                </div>
              ))}
              <div className="border-t pt-3 flex items-center justify-between" style={{borderColor:divC}}>
                <p className="text-sm font-bold" style={{color:sub}}>Total Reimburse</p>
                <p className="text-base font-black" style={{color:"#6366f1"}}>{fmtRp(totalNew)}</p>
              </div>
            </div>
            <button onClick={submitReim} className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 hover:opacity-90 active:scale-95" style={{background:"linear-gradient(135deg,#4338ca,#6d28d9)"}}><FileText className="w-5 h-5"/> Simpan sebagai Draft</button>
          </div>
        </div>
      </div>
    );
  }

  // ── REIMBURSEMENT LIST ──────────────────────────────────────
  if (screen==="reimbursement") {
    const ftabs:[typeof reimFilter,string][]=[["all","Semua"],["draft","Draft"],["in-progress","Diproses"],["done","Selesai"]];
    const visible=reimFilter==="all"?reimList:reimList.filter(r=>r.status===reimFilter);
    return (
      <div className="size-full flex flex-col overflow-hidden" style={{background:bgPage}}>
        <div className="flex-1 overflow-y-auto pb-32">
          <Header title="Reimbursement" right={<DarkBtn/>}/>
          <div className="mx-5 mb-4 rounded-2xl p-4" style={{background:"linear-gradient(135deg,rgba(99,102,241,0.18),rgba(139,92,246,0.12))",border:"1px solid rgba(99,102,241,0.25)"}}>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[{label:"Total",value:`${reimList.length} item`},{label:"Nilai",value:fmtRp(reimList.reduce((s,r)=>s+r.total,0))},{label:"Menunggu",value:`${reimList.filter(r=>r.status==="in-progress").length} item`}].map(({label,value})=>(
                <div key={label}><p className="text-xs" style={{color:dim}}>{label}</p><p className="font-black text-xs mt-0.5" style={{color:"#6366f1"}}>{value}</p></div>
              ))}
            </div>
          </div>
          <div className="px-5 mb-4"><div className="flex gap-1 p-1 rounded-2xl" style={glass}>{ftabs.map(([key,lbl])=>(<button key={key} onClick={()=>setReimFilter(key)} className="flex-1 py-2 rounded-xl text-xs font-bold" style={{background:reimFilter===key?"linear-gradient(135deg,#4338ca,#6d28d9)":"transparent",color:reimFilter===key?"#fff":dim}}>{lbl}</button>))}</div></div>
          <div className="px-5 flex flex-col gap-3">
            {visible.length===0&&<div className="text-center py-12"><p className="text-4xl mb-3">📋</p><p className="font-bold" style={{color:txt}}>Tidak ada pengajuan</p></div>}
            {visible.map(r=>{
              const scfg=reimStatusCfg[r.status];
              const exp=expandReim===r.id;
              return (
                <div key={r.id} className="rounded-2xl overflow-hidden" style={glass}>
                  <button className="w-full p-4 text-left" onClick={()=>setExpandReim(exp?null:r.id)}>
                    <div className="flex items-start justify-between mb-2"><span className="text-xs font-black" style={{color:dim,fontFamily:"'JetBrains Mono',monospace"}}>{r.id} · {r.date}</span><span className="px-2.5 py-1 rounded-xl text-xs font-bold flex-shrink-0 ml-2" style={{background:scfg.bg,color:scfg.color}}>{scfg.label}</span></div>
                    <p className="text-sm font-black" style={{color:txt}}>{r.purpose}</p>
                    <p className="text-xs mt-0.5" style={{color:dim}}>{r.project}</p>
                    <div className="flex gap-4 mt-3">
                      {[{l:"Total",v:fmtRp(r.total)},{l:"Uang Muka",v:fmtRp(r.advance)},{l:"Saldo",v:fmtRp(r.balance),c:r.balance>=0?"#10b981":"#ef4444"}].map(({l,v,c})=>(
                        <div key={l}><p className="text-xs" style={{color:dim}}>{l}</p><p className="text-sm font-bold" style={{color:c||txt}}>{v}</p></div>
                      ))}
                    </div>
                  </button>
                  {exp&&(
                    <div className="border-t" style={{borderColor:divC}}>
                      <div className="px-4 pt-3 pb-2"><p className="text-xs font-bold uppercase tracking-widest mb-2" style={{color:dim}}>Rincian</p>{r.items.map((it,i)=>(<div key={i} className="flex justify-between items-center py-1.5 border-b last:border-0" style={{borderColor:divC}}><p className="text-xs" style={{color:txt}}>{it.desc}</p><p className="text-xs font-bold" style={{color:txt,fontFamily:"'JetBrains Mono',monospace"}}>{fmtRp(it.amount)}</p></div>))}</div>
                      {r.status==="done"&&r.decision&&(<div className="mx-4 mb-3 rounded-xl p-3 flex items-start gap-3" style={{background:r.decision==="approved"?"rgba(16,185,129,0.12)":"rgba(239,68,68,0.12)"}}>{r.decision==="approved"?<CheckSquare className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5"/>:<XSquare className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"/>}<div><p className="text-sm font-bold" style={{color:r.decision==="approved"?"#10b981":"#ef4444"}}>{r.decision==="approved"?"Disetujui":"Ditolak"}</p>{r.decisionReason&&<p className="text-xs mt-0.5" style={{color:sub}}>{r.decisionReason}</p>}</div></div>)}
                      {r.status==="in-progress"&&(<div className="mx-4 mb-3 rounded-xl p-3 flex items-center gap-3" style={{background:"rgba(245,158,11,0.12)"}}><AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0"/><p className="text-sm font-bold text-amber-400">Menunggu Persetujuan</p></div>)}
                      {r.status==="draft"&&(<div className="px-4 pb-4 flex gap-2"><button className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-80" style={{...glass,color:txt}}><Edit3 className="w-3.5 h-3.5"/> Edit</button><button onClick={()=>setReimList(l=>l.map(item=>item.id===r.id?{...item,status:"in-progress" as const}:item))} className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-95" style={{background:"linear-gradient(135deg,#4338ca,#6d28d9)"}}><Send className="w-3.5 h-3.5"/> Kirim</button></div>)}
                      {r.status==="done"&&(<div className="px-4 pb-4 flex gap-2"><button className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-80" style={{...glass,color:txt}}><FileText className="w-3.5 h-3.5"/> PDF</button><button className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-80" style={{...glass,color:txt}}><Download className="w-3.5 h-3.5"/> Excel</button></div>)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="fixed bottom-24 right-5 z-50">
          <button onClick={()=>setScreen("reimbursement-form")} className="flex items-center gap-2 pl-4 pr-5 py-3.5 rounded-2xl text-white font-bold text-sm hover:opacity-90 active:scale-95" style={{background:"linear-gradient(135deg,#4338ca,#6d28d9)",boxShadow:"0 8px 32px rgba(99,102,241,0.5)"}}>
            <Plus className="w-5 h-5"/> Buat Pengajuan
          </button>
        </div>
        <BottomNav/>
      </div>
    );
  }

  // ── ADMIN DASHBOARD ─────────────────────────────────────────
  if (screen==="admin") {
    const stats=[{label:"Total Karyawan",value:"247",badge:"+12",color:"#6366f1",bg:"rgba(99,102,241,0.15)",Icon:Users},{label:"Hadir",value:"201",badge:"81.5%",color:"#10b981",bg:"rgba(16,185,129,0.15)",Icon:CheckCircle},{label:"Telat",value:"23",badge:"9.3%",color:"#f59e0b",bg:"rgba(245,158,11,0.15)",Icon:Clock},{label:"Izin/Cuti",value:"18",badge:"7.3%",color:"#8b5cf6",bg:"rgba(139,92,246,0.15)",Icon:Shield},{label:"Tidak Hadir",value:"5",badge:"2.0%",color:"#ef4444",bg:"rgba(239,68,68,0.15)",Icon:X}];
    const tt={background:darkMode?"#0f172a":"#fff",border:"1px solid rgba(99,102,241,0.2)",borderRadius:12,color:txt,fontSize:12};
    return (
      <div className="size-full flex flex-col overflow-hidden" style={{background:bgPage}}>
        <div className="flex-1 overflow-y-auto pb-8">
          <Header title="Admin Dashboard" back={()=>{setScreen("home");setActiveTab("home");}} right={<DarkBtn/>}/>
          <div className="px-5 mb-5"><p className="text-xs" style={{color:sub}}>Rekap: <span style={{color:"#6366f1",fontWeight:700}}>Kamis, 03 Juli 2026</span></p></div>
          <div className="px-5 mb-5"><div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{stats.map(({label,value,badge,color,bg,Icon})=>(<div key={label} className="rounded-2xl p-4" style={{...glass,borderLeft:`3px solid ${color}`}}><div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{background:bg,color}}><Icon className="w-4 h-4"/></div><p className="text-2xl font-black" style={{color}}>{value}</p><p className="text-xs font-bold mt-0.5" style={{color:txt}}>{label}</p><p className="text-xs mt-1" style={{color}}>{badge}</p></div>))}</div></div>
          <div className="px-5 mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl p-5" style={glass}>
              <div className="flex items-center justify-between mb-4"><p className="text-sm font-bold" style={{color:txt}}>Tren Mingguan</p><div className="flex gap-3 text-xs">{[["bg-indigo-400","Hadir"],["bg-amber-400","Telat"]].map(([cls,l])=>(<span key={l} className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${cls}`}/><span style={{color:sub}}>{l}</span></span>))}</div></div>
              <ResponsiveContainer width="100%" height={160}><BarChart data={weeklyData} barGap={3} barCategoryGap="30%"><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill:dim,fontSize:11}}/><YAxis hide/><Tooltip contentStyle={tt} cursor={{fill:"rgba(99,102,241,0.05)"}}/><Bar dataKey="hadir" fill="#6366f1" radius={[6,6,0,0]}/><Bar dataKey="telat" fill="#f59e0b" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer>
            </div>
            <div className="rounded-2xl p-5" style={glass}>
              <div className="flex items-center justify-between mb-4"><p className="text-sm font-bold" style={{color:txt}}>Tren Bulanan (%)</p><TrendingUp className="w-4 h-4 text-emerald-400"/></div>
              <ResponsiveContainer width="100%" height={160}><AreaChart data={monthlyData}><defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.35}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill:dim,fontSize:11}}/><YAxis hide domain={[80,100]}/><Tooltip contentStyle={tt} cursor={{stroke:"rgba(99,102,241,0.3)"}}/><Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2.5} fill="url(#ag)" dot={false} activeDot={{r:5,fill:"#6366f1",stroke:darkMode?"#0f172a":"#fff",strokeWidth:2}}/></AreaChart></ResponsiveContainer>
            </div>
          </div>
          <div className="px-5">
            <div className="rounded-2xl overflow-hidden" style={glass}>
              <div className="flex items-center justify-between p-4 border-b" style={{borderColor:divC}}><p className="text-sm font-bold" style={{color:txt}}>Rekap Karyawan — Hari Ini</p><button className="flex items-center gap-1.5 text-xs font-bold" style={{color:"#6366f1"}}><Download className="w-3 h-3"/> Export</button></div>
              <div className="overflow-x-auto"><table className="w-full"><thead><tr style={{borderBottom:`1px solid ${divC}`}}>{["Karyawan","Jabatan","Masuk","Keluar","Status"].map(h=>(<th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider" style={{color:dim}}>{h}</th>))}</tr></thead><tbody>{employeeData.map((emp,i)=>{const cfg=attendStatusCfg[emp.status as keyof typeof attendStatusCfg];return(<tr key={i} className="hover:opacity-80" style={{borderBottom:i<employeeData.length-1?`1px solid ${divC}`:"none"}}><td className="px-4 py-3.5"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0" style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)"}}>{emp.name.split(" ").map((n:string)=>n[0]).join("").slice(0,2)}</div><span className="text-xs font-bold" style={{color:txt}}>{emp.name}</span></div></td><td className="px-4 py-3.5 text-xs" style={{color:sub}}>{emp.role}</td><td className="px-4 py-3.5 text-xs font-medium" style={{color:txt,fontFamily:"'JetBrains Mono',monospace"}}>{emp.checkIn}</td><td className="px-4 py-3.5 text-xs font-medium" style={{color:txt,fontFamily:"'JetBrains Mono',monospace"}}>{emp.checkOut}</td><td className="px-4 py-3.5"><span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${cfg.color} ${cfg.bg}`}>{cfg.label}</span></td></tr>);})}</tbody></table></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
