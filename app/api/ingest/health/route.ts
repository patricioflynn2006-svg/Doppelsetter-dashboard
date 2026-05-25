import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "doppelsetter-dashboard-ingest",
    timestamp: new Date().toISOString(),
  });
}
