import { NextResponse } from "next/server";
import { resetScanLogs } from "@/lib/db";

export async function POST() {
  try {
    await resetScanLogs();
    return NextResponse.json({ success: true, message: "Scan logs reset successfully. All attendees can now be re-scanned." });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 });
  }
}
