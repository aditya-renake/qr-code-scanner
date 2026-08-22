import { NextResponse } from "next/server";
import { getAllAttendees } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // This makes a real Redis call
    await getAllAttendees();
    return NextResponse.json({
      status: "connected",
      message: "Database connection is healthy.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to connect to the database. Ensure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are correct in Vercel settings.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
