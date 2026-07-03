import ExcelJS from "exceljs";
import type { AttendanceRecord } from "./attendance-types";
import {
  filterAttendanceByPeriod,
  getFilterFileSlug,
  getPeriodLabel,
  type HistFilter,
} from "./attendance-period";

const STATUS_LABELS: Record<string, string> = {
  hadir: "Hadir",
  telat: "Telat",
  izin: "Izin",
  cuti: "Cuti",
  absent: "Tidak Hadir",
  wfh: "WFH",
};

const STATUS_COLORS: Record<string, string> = {
  hadir: "FF10B981",
  telat: "FFF59E0B",
  izin: "FF3B82F6",
  cuti: "FF8B5CF6",
  absent: "FFEF4444",
  wfh: "FF06B6D4",
};

const STATUS_BG: Record<string, string> = {
  hadir: "FFD1FAE5",
  telat: "FFFEF3C7",
  izin: "FFDBEAFE",
  cuti: "FFEDE9FE",
  absent: "FFFEE2E2",
  wfh: "FFCFFAFE",
};

function parseTimeToMinutes(time: string | null): number | null {
  if (!time || time === "—") return null;
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function formatDuration(checkIn: string | null, checkOut: string | null): string {
  const inMins = parseTimeToMinutes(checkIn);
  const outMins = parseTimeToMinutes(checkOut);
  if (inMins == null || outMins == null || outMins <= inMins) return "—";
  const diff = outMins - inMins;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  return `${hours} jam ${mins} menit`;
}

function countByStatus(records: AttendanceRecord[]) {
  const counts: Record<string, number> = {
    hadir: 0,
    telat: 0,
    izin: 0,
    cuti: 0,
    absent: 0,
    wfh: 0,
  };
  for (const r of records) {
    counts[r.status] = (counts[r.status] ?? 0) + 1;
  }
  return counts;
}

function avgWorkHours(records: AttendanceRecord[]): string {
  const durations: number[] = [];
  for (const r of records) {
    const inM = parseTimeToMinutes(r.checkIn);
    const outM = parseTimeToMinutes(r.checkOut);
    if (inM != null && outM != null && outM > inM) {
      durations.push(outM - inM);
    }
  }
  if (durations.length === 0) return "—";
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
  const hours = Math.floor(avg / 60);
  const mins = Math.round(avg % 60);
  return `${hours} jam ${mins} menit`;
}

export interface ExportAttendanceOptions {
  records: AttendanceRecord[];
  filter: HistFilter;
  employeeName?: string;
  employeeEmail?: string;
  department?: string;
  referenceDate?: Date;
}

export async function exportAttendanceExcel({
  records,
  filter,
  employeeName = "Budi Santoso",
  employeeEmail = "budi.santoso@payrollin.id",
  department = "Engineering",
  referenceDate = new Date(),
}: ExportAttendanceOptions): Promise<void> {
  const filtered = filterAttendanceByPeriod(records, filter, referenceDate);
  const periodLabel = getPeriodLabel(filter, referenceDate);
  const exportedAt = new Date().toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "PAYROLLIN";
  wb.created = new Date();

  const ws = wb.addWorksheet("Riwayat Absensi", {
    views: [{ showGridLines: false }],
    properties: { defaultRowHeight: 20 },
  });

  ws.columns = [
    { width: 6 },
    { width: 28 },
    { width: 14 },
    { width: 14 },
    { width: 18 },
    { width: 14 },
    { width: 36 },
  ];

  const indigo = "FF4338CA";
  const indigoLight = "FFEEF2FF";
  const slate = "FF64748B";
  const dark = "FF0F172A";
  const white = "FFFFFFFF";
  const border = { style: "thin" as const, color: { argb: "FFE2E8F0" } };

  const titleRow = ws.addRow(["", "PAYROLLIN"]);
  titleRow.height = 32;
  ws.mergeCells("B1:G1");
  titleRow.getCell(2).font = { name: "Calibri", size: 20, bold: true, color: { argb: indigo } };
  titleRow.getCell(2).alignment = { vertical: "middle" };

  const subRow = ws.addRow(["", "Laporan Riwayat Absensi Karyawan"]);
  ws.mergeCells("B2:G2");
  subRow.getCell(2).font = { name: "Calibri", size: 11, color: { argb: slate } };

  ws.addRow([]);

  const metaRows = [
    ["Periode", periodLabel],
    ["Nama Karyawan", employeeName],
    ["Email", employeeEmail],
    ["Departemen", department],
    ["Tanggal Ekspor", exportedAt],
    ["Total Data", `${filtered.length} hari`],
  ];

  metaRows.forEach(([label, value], i) => {
    const row = ws.addRow(["", label, value]);
    row.height = 22;
    const labelCell = row.getCell(2);
    const valueCell = row.getCell(3);
    labelCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: slate } };
    valueCell.font = { name: "Calibri", size: 10, color: { argb: dark } };
    if (i === 0) {
      valueCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: indigo } };
    }
    ws.mergeCells(row.number, 3, row.number, 7);
    valueCell.alignment = { vertical: "middle" };
  });

  const counts = countByStatus(filtered);
  ws.addRow([]);

  const summaryTitle = ws.addRow(["", "Ringkasan Periode"]);
  ws.mergeCells(summaryTitle.number, 2, summaryTitle.number, 7);
  summaryTitle.getCell(2).font = { name: "Calibri", size: 11, bold: true, color: { argb: dark } };
  summaryTitle.height = 24;

  const summaryData = [
    ["Hadir", counts.hadir],
    ["Telat", counts.telat],
    ["Izin", counts.izin],
    ["Cuti", counts.cuti],
    ["Tidak Hadir", counts.absent],
    ["WFH", counts.wfh],
    ["Rata-rata Jam Kerja", avgWorkHours(filtered)],
  ];

  summaryData.forEach(([label, value]) => {
    const row = ws.addRow(["", label, value]);
    row.height = 20;
    row.getCell(2).font = { name: "Calibri", size: 10, color: { argb: slate } };
    row.getCell(3).font = { name: "Calibri", size: 10, bold: true, color: { argb: dark } };
    row.getCell(2).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: indigoLight },
    };
    row.getCell(3).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: indigoLight },
    };
    for (let c = 2; c <= 3; c++) {
      row.getCell(c).border = {
        top: border,
        left: border,
        bottom: border,
        right: border,
      };
    }
    ws.mergeCells(row.number, 3, row.number, 4);
  });

  ws.addRow([]);
  ws.addRow([]);

  const headerRowNum = ws.lastRow!.number + 1;
  const headers = ["No", "Tanggal", "Masuk", "Keluar", "Durasi", "Status", "Lokasi"];
  const headerRow = ws.addRow(["", ...headers]);
  headerRow.height = 28;
  headerRow.eachCell((cell, col) => {
    if (col === 1) return;
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: white } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: indigo },
    };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: border,
      left: border,
      bottom: border,
      right: border,
    };
  });

  if (filtered.length === 0) {
    const emptyRow = ws.addRow([
      "",
      "Tidak ada data absensi untuk periode ini",
      "",
      "",
      "",
      "",
      "",
    ]);
    ws.mergeCells(emptyRow.number, 2, emptyRow.number, 7);
    emptyRow.getCell(2).font = { name: "Calibri", size: 10, italic: true, color: { argb: slate } };
    emptyRow.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
    emptyRow.height = 36;
    for (let c = 2; c <= 7; c++) {
      emptyRow.getCell(c).border = {
        top: border,
        left: border,
        bottom: border,
        right: border,
      };
      emptyRow.getCell(c).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF8FAFC" },
      };
    }
  } else {
    filtered.forEach((record, index) => {
      const checkOut =
        record.checkOut && record.checkOut !== "Belum pulang"
          ? record.checkOut
          : "Belum pulang";
      const row = ws.addRow([
        "",
        index + 1,
        record.date,
        record.checkIn ?? "—",
        checkOut,
        formatDuration(record.checkIn, record.checkOut),
        STATUS_LABELS[record.status] ?? record.status,
        record.location ?? "—",
      ]);
      row.height = 24;
      const isEven = index % 2 === 0;
      const rowBg = isEven ? "FFFFFFFF" : "FFF8FAFC";
      const statusKey = record.status;
      const statusColor = STATUS_COLORS[statusKey] ?? dark;
      const statusBg = STATUS_BG[statusKey] ?? "FFF1F5F9";

      row.eachCell((cell, col) => {
        if (col === 1) return;
        cell.font = {
          name: "Calibri",
          size: 10,
          color: { argb: col === 6 ? statusColor : dark },
        };
        cell.alignment = {
          vertical: "middle",
          horizontal: col === 2 || col === 7 ? "left" : "center",
          wrapText: col === 7,
        };
        cell.border = {
          top: border,
          left: border,
          bottom: border,
          right: border,
        };
        if (col === 6) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: statusBg },
          };
          cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: statusColor } };
        } else {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: rowBg },
          };
        }
        if (col === 3 || col === 4 || col === 5) {
          cell.font = { name: "Consolas", size: 10, color: { argb: dark } };
        }
      });
    });
  }

  const footerRow = ws.addRow([]);
  footerRow.height = 8;
  const noteRow = ws.addRow([
    "",
    "Dokumen ini dibuat otomatis oleh PAYROLLIN · Smart HR Platform",
  ]);
  ws.mergeCells(noteRow.number, 2, noteRow.number, 7);
  noteRow.getCell(2).font = {
    name: "Calibri",
    size: 9,
    italic: true,
    color: { argb: slate },
  };
  noteRow.getCell(2).alignment = { horizontal: "center" };

  ws.autoFilter = {
    from: { row: headerRowNum, column: 2 },
    to: { row: headerRowNum + Math.max(filtered.length, 1), column: 7 },
  };

  ws.views = [{ state: "frozen", ySplit: headerRowNum, showGridLines: false }];

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Absensi_${getFilterFileSlug(filter, referenceDate)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export { filterAttendanceByPeriod, getPeriodLabel, type HistFilter };
