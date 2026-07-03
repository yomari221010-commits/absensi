import { NextResponse } from "next/server";
import { listAttendance, getTodayAttendance, recordCheckIn, recordCheckOut } from "@/lib/attendance-db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get("today") === "1") {
      return NextResponse.json({ record: getTodayAttendance() });
    }
    return NextResponse.json({ records: listAttendance() });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memuat data" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, photo, latitude, longitude, accuracy, address } = body;

    if (type !== "masuk" && type !== "keluar") {
      return NextResponse.json({ error: "Tipe absensi tidak valid" }, { status: 400 });
    }
    if (!photo || latitude == null || longitude == null || !address) {
      return NextResponse.json({ error: "Data foto dan lokasi wajib diisi" }, { status: 400 });
    }

    const payload = {
      photo: String(photo),
      latitude: Number(latitude),
      longitude: Number(longitude),
      accuracy: Number(accuracy ?? 0),
      address: String(address),
    };

    const record =
      type === "masuk" ? recordCheckIn(payload) : recordCheckOut(payload);

    return NextResponse.json({ record });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menyimpan absensi" },
      { status: 400 }
    );
  }
}
