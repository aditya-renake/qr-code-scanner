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

    // Attempt backend async email dispatch (non-blocking)
    sendTicketEmail({ attendee, qrPayloadString: attendee.qrToken || "" }).catch((e) =>
      console.warn("Backend SMTP notice (Apps Script will send fallback if enabled):", e.message)
    );

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #090a10; color: #f8fafc; padding: 24px; border-radius: 16px; max-width: 540px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%); padding: 20px; border-radius: 12px; text-align: center; color: #041f17;">
          <div style="font-size: 11px; font-weight: 900; letter-spacing: 2px;">OFFICIAL EVENT PASS</div>
          <div style="font-size: 26px; font-weight: 900; margin-top: 4px;">HackSeries 2026</div>
        </div>
        <div style="padding: 20px 8px; text-align: center;">
          <p style="font-size: 16px; margin: 0 0 12px 0;">Hey <strong>${attendee.fullName}</strong> 👋</p>
          <p style="font-size: 13px; color: #94a3b8; line-height: 1.5; margin: 0 0 20px 0;">
            Your registration is confirmed! Below is your cryptographically signed event pass. Please present this QR code at the main entrance gate.
          </p>
          <div style="background: #ffffff; border-radius: 16px; padding: 16px; display: inline-block; margin-bottom: 20px;">
            <img src="cid:qrImage" width="220" height="220" style="display: block; margin: 0 auto; border-radius: 8px;" alt="HackSeries Pass" />
            <div style="color: #0f172a; font-family: monospace; font-size: 13px; font-weight: 800; margin-top: 10px;">PASS ID: ${attendee.regNumber}</div>
          </div>
          <table width="100%" style="background: #12141f; border-radius: 12px; padding: 12px; font-size: 12px; text-align: left; margin-bottom: 16px; color: #cbd5e1;">
            <tr><td style="color:#64748b; padding:4px;">Participant:</td><td style="font-weight:700; color:#fff;">${attendee.fullName}</td></tr>
            <tr><td style="color:#64748b; padding:4px;">Role:</td><td style="font-weight:700; color:#10b981; text-transform:uppercase;">${attendee.role}</td></tr>
            <tr><td style="color:#64748b; padding:4px;">Track:</td><td style="font-weight:600; color:#06b6d4;">${attendee.track}</td></tr>
            <tr><td style="color:#64748b; padding:4px;">Team:</td><td style="color:#fff;">${attendee.teamName}</td></tr>
            <tr><td style="color:#64748b; padding:4px;">College / Org:</td><td style="color:#fff;">${attendee.college}</td></tr>
          </table>
          <p style="font-size: 11px; color: #64748b;">📍 Venue: Main Innovation Auditorium • Single Use Gate Entry</p>
        </div>
      </div>
    `;

    return NextResponse.json(
      {
        success: true,
        message: isExisting
          ? "Attendee already registered. Pass re-issued."
          : "Attendee registered and QR pass generated successfully!",
        attendee,
        qrDataURL,
        emailHtml,
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
