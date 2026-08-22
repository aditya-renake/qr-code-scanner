import { NextResponse } from "next/server";
import { seedDemoData } from "@/lib/db";

export async function POST() {
  try {
    const res = await seedDemoData();
    return NextResponse.json({ success: true, message: "Demo data seeded successfully!", ...res });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 });
  }
}
