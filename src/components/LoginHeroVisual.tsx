"use client";

import { Fingerprint, MapPin, CheckCircle, Clock, Users } from "lucide-react";

interface LoginHeroVisualProps {
  darkMode: boolean;
}

export function LoginHeroVisual({ darkMode }: LoginHeroVisualProps) {
  const glass = darkMode
    ? { background: "rgba(15,23,42,0.72)", backdropFilter: "blur(20px)", border: "1px solid rgba(99,102,241,0.25)" }
    : { background: "rgba(255,255,255,0.88)", backdropFilter: "blur(20px)", border: "1px solid rgba(99,102,241,0.18)", boxShadow: "0 16px 48px rgba(99,102,241,0.1)" };

  return (
    <div className="relative w-full min-h-[400px] flex items-center justify-center">
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-3xl">
        <div
          className="absolute -top-12 -left-10 w-52 h-52 rounded-full opacity-35 blur-3xl animate-pulse"
          style={{ background: "radial-gradient(circle, #6366f1, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-8 -right-8 w-56 h-56 rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, #8b5cf6, transparent 70%)" }}
        />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(${darkMode ? "rgba(99,102,241,0.3)" : "rgba(99,102,241,0.2)"} 1px, transparent 1px)`,
            backgroundSize: "20px 20px",
          }}
        />
      </div>

      {/* Floating badges */}
      <div
        className="absolute top-4 left-2 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold animate-float-slow"
        style={{ ...glass, color: darkMode ? "#a5b4fc" : "#4f46e5" }}
      >
        <MapPin className="w-3 h-3 text-emerald-400" />
        GPS Aktif
      </div>
      <div
        className="absolute top-14 right-1 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold animate-float"
        style={{ ...glass, color: darkMode ? "#6ee7b7" : "#059669", animationDelay: "0.5s" }}
      >
        <CheckCircle className="w-3 h-3" />
        98% Hadir
      </div>
      <div
        className="absolute bottom-10 left-1 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold animate-float-delay"
        style={{ ...glass, color: darkMode ? "#c4b5fd" : "#7c3aed" }}
      >
        <Fingerprint className="w-3 h-3" />
        Foto Absensi
      </div>

      {/* Main mockup */}
      <div className="relative z-10 w-full animate-float">
        <div
          className="absolute -inset-3 rounded-[2rem] opacity-40 blur-xl"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6, #10b981)" }}
        />

        <div className="relative rounded-[1.75rem] overflow-hidden" style={glass}>
          <div className="px-4 pt-4 pb-3" style={{ background: "linear-gradient(135deg, #312e81, #4c1d95, #6d28d9)" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}>
                  <Fingerprint className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <p className="text-white text-[10px] font-black tracking-wide">PAYROLLIN</p>
                  <p className="text-indigo-200 text-[9px]">Smart HR</p>
                </div>
              </div>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-black" style={{ background: "rgba(255,255,255,0.2)" }}>
                BS
              </div>
            </div>
            <p className="text-indigo-300 text-[9px] uppercase tracking-widest mb-0.5">Waktu Sekarang</p>
            <p className="text-2xl font-black text-white tracking-tight leading-none" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              08:45:12
            </p>
            <p className="text-indigo-300 text-[10px] mt-1 capitalize">Kamis, 3 Juli 2026</p>
          </div>

          <div className="p-3 grid grid-cols-4 gap-1.5">
            {[
              { label: "Hadir", value: "18", color: "#10b981" },
              { label: "Telat", value: "2", color: "#f59e0b" },
              { label: "Izin", value: "1", color: "#6366f1" },
              { label: "Cuti", value: "3", color: "#8b5cf6" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-lg p-1.5 text-center"
                style={{ background: `${s.color}18`, border: `1px solid ${s.color}30` }}
              >
                <p className="text-xs font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[8px] mt-0.5" style={{ color: darkMode ? "#94a3b8" : "#64748b" }}>{s.label}</p>
              </div>
            ))}
          </div>

          <div className="px-3 pb-3">
            <div className="rounded-lg p-2.5" style={{ background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(99,102,241,0.06)" }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] font-bold" style={{ color: darkMode ? "#f1f5f9" : "#0f172a" }}>Tren Mingguan</p>
                <Users className="w-2.5 h-2.5 text-indigo-400" />
              </div>
              <div className="flex items-end gap-1 h-12">
                {[72, 55, 80, 90, 65, 48].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm"
                    style={{
                      height: `${h}%`,
                      background: i % 2 === 0 ? "linear-gradient(180deg, #6366f1, #8b5cf6)" : "linear-gradient(180deg, #10b981, #059669)",
                      opacity: 0.85,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="px-3 pb-4">
            <div className="w-full py-2 rounded-lg flex items-center justify-center gap-1.5 text-white text-[10px] font-bold" style={{ background: "linear-gradient(135deg, #4338ca, #6d28d9)" }}>
              <Clock className="w-3 h-3" />
              Absen Masuk
            </div>
          </div>
        </div>

        <div
          className="absolute right-0 -bottom-3 w-28 rounded-xl p-2.5 z-20 animate-float-slow"
          style={{ ...glass, animationDelay: "1.5s" }}
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-black text-white" style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
              ✓
            </div>
            <div>
              <p className="text-[9px] font-bold" style={{ color: darkMode ? "#f1f5f9" : "#0f172a" }}>Absensi OK</p>
              <p className="text-[8px]" style={{ color: darkMode ? "#94a3b8" : "#64748b" }}>Tepat waktu</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
