import { NextResponse } from "next/server";
import { getAllAttendees, createAttendee, getAttendeeByEmail } from "@/lib/db";
import { generateQRCodeDataURL } from "@/lib/qr";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      fullName,
      email,
      phone,
      college,
      teamName,
      role = "hacker",
      track = "AI & Machine Learning",
      tShirtSize = "L",
      dietaryPreference = "Vegetarian",
      regNumber,
      qrToken,
    } = body;

    if (!email || !fullName) {
      return NextResponse.json(
        { success: false, message: "Missing email or full name" },
        { status: 400 }
      );
    }

    const existing = await getAttendeeByEmail(email);
    if (existing) {
      return NextResponse.json({
        success: true,
        message: "Attendee already registered in database",
        attendee: existing,
        isExisting: true,
      });
    }

    const attendee = await createAttendee({
      fullName,
      email,
      phone: phone || "+91 00000 00000",
      college: college || "Individual / Independent",
      teamName: teamName || "Solo Innovator",
      role: role || "hacker",
      track: track || "AI & Machine Learning",
      tShirtSize: tShirtSize || "L",
      dietaryPreference: dietaryPreference || "Vegetarian",
    });

    const qrDataURL = await generateQRCodeDataURL(attendee.qrToken || "");

    return NextResponse.json(
      {
        success: true,
        message: "Attendee synced successfully from Google Forms / Sheets!",
        attendee,
        qrDataURL,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Webhook processing error" },
      { status: 500 }
    );
  }
}
