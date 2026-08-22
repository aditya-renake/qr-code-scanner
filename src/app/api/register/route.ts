import { NextResponse } from "next/server";
import { createAttendee, getAttendeeByEmail } from "@/lib/db";
import { generateQRCodeDataURL } from "@/lib/qr";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fullName, email, phone, college, teamName, role, track, tShirtSize, dietaryPreference } = body;

    if (!fullName || !email || !role || !track) {
      return NextResponse.json(
        { success: false, message: "Required fields are missing (Name, Email, Role, Track)" },
        { status: 400 }
      );
    }

    const existing = getAttendeeByEmail(email);
    if (existing) {
      const qrDataURL = await generateQRCodeDataURL(existing.qrToken || "");
      return NextResponse.json(
        {
          success: true,
          message: "Attendee already registered. Returning existing pass.",
          attendee: existing,
          qrDataURL,
          isExisting: true,
        },
        { status: 200 }
      );
    }

    const attendee = createAttendee({
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
        message: "Registration successful! Ticket issued.",
        attendee,
        qrDataURL,
        isExisting: false,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Registration failed" }, { status: 500 });
  }
}
