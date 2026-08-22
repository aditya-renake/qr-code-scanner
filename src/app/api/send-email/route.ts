import { NextResponse } from "next/server";
import { getAttendeeById } from "@/lib/db";
import { sendTicketEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { attendeeId } = await req.json();
    if (!attendeeId) {
      return NextResponse.json({ success: false, message: "Attendee ID is required" }, { status: 400 });
    }

    const attendee = await getAttendeeById(attendeeId);
    if (!attendee) {
      return NextResponse.json({ success: false, message: "Attendee not found" }, { status: 404 });
    }

    const emailResult = await sendTicketEmail({
      attendee,
      qrPayloadString: attendee.qrToken || "",
    });

    if (!emailResult.success) {
      return NextResponse.json({ success: false, message: emailResult.error || "Email failed to send" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Email ticket pass dispatched successfully to ${attendee.email}!`,
      previewUrl: emailResult.previewUrl,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
