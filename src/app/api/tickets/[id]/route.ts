import { NextResponse } from "next/server";
import { getAttendeeById, getCheckpoints, getScanLogsForAttendee } from "@/lib/db";
import { generateQRCodeDataURL } from "@/lib/qr";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const attendee = await getAttendeeById(id);

    if (!attendee) {
      return NextResponse.json({ success: false, message: "Ticket / Attendee not found" }, { status: 404 });
    }

    const qrDataURL = await generateQRCodeDataURL(attendee.qrToken || "");
    const checkpoints = await getCheckpoints();
    const scanLogs = await getScanLogsForAttendee(attendee.id);

    const checkpointStatus = checkpoints.map((cp) => {
      const logs = scanLogs.filter((l) => l.checkpointId === cp.id && l.status === "valid");
      return {
        ...cp,
        claimed: logs.length > 0,
        claimedAt: logs[0]?.scannedAt || null,
        claimedGate: logs[0]?.gateLocation || null,
      };
    });

    return NextResponse.json({
      success: true,
      attendee,
      qrDataURL,
      checkpoints: checkpointStatus,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Failed to load ticket" }, { status: 500 });
  }
}
