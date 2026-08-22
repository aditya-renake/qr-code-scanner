import { NextResponse } from "next/server";
import { createAttendee, getAttendeeByEmail } from "@/lib/db";
import { generateQRCodeDataURL } from "@/lib/qr";
import { sendTicketEmail } from "@/lib/email";

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
    } = body;

    if (!email || !fullName) {
      return NextResponse.json(
        { success: false, message: "Missing email or full name" },
        { status: 400 }
      );
    }

    let attendee = await getAttendeeByEmail(email);
    let isExisting = false;

    if (attendee) {
      isExisting = true;
    } else {
      attendee = await createAttendee({
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
    }

    const qrDataURL = await generateQRCodeDataURL(attendee.qrToken || "");

    // Send the email with the QR code attached
    await sendTicketEmail({ attendee, qrPayloadString: attendee.qrToken || "" });

    return NextResponse.json(
      {
        success: true,
        message: isExisting
          ? "Attendee already registered. Re-sent ticket email."
          : "Attendee registered and ticket pass emailed successfully!",
        attendee,
        qrDataURL,
        isExisting,
      },
      { status: isExisting ? 200 : 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Webhook processing error" },
      { status: 500 }
    );
  }
}
