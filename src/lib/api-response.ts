import { NextResponse } from "next/server";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleApiError(err: unknown) {
  const message = err instanceof Error ? err.message : "Terjadi kesalahan";
  if (message === "Unauthorized") return jsonError(message, 401);
  if (message === "Forbidden") return jsonError(message, 403);
  return jsonError(message, message.includes("sudah") ? 400 : 500);
}
