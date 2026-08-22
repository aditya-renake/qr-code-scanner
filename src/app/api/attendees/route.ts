import { NextResponse } from "next/server";
import { getAllAttendees, getAllScanLogs, getCheckpoints, manualCheckInAttendee } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get("search") || "").toLowerCase();
    const role = searchParams.get("role") || "all";

    let attendees = getAllAttendees();
    const scanLogs = getAllScanLogs();
    const checkpoints = getCheckpoints();

    if (role !== "all") {
      attendees = attendees.filter((a) => a.role === role);
    }

    if (search) {
      attendees = attendees.filter(
        (a) =>
          a.fullName.toLowerCase().includes(search) ||
          a.email.toLowerCase().includes(search) ||
          a.regNumber.toLowerCase().includes(search) ||
          a.teamName.toLowerCase().includes(search) ||
          a.college.toLowerCase().includes(search)
      );
    }

    const enhanced = attendees.map((a) => {
      const userScans = scanLogs.filter((s) => s.attendeeId === a.id && s.status === "valid");
      const hasMainEntry = userScans.some((s) => s.checkpointId === checkpoints[0]?.id);
      return {
        ...a,
        isCheckedIn: hasMainEntry,
        scanCount: userScans.length,
        checkpointsClaimed: userScans.map((s) => s.checkpointName),
      };
    });

    return NextResponse.json({ success: true, attendees: enhanced, total: enhanced.length });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { attendeeId, checkpointId, operatorName } = body;

    if (!attendeeId) {
      return NextResponse.json({ success: false, message: "Attendee ID required" }, { status: 400 });
    }

    const result = manualCheckInAttendee(attendeeId, checkpointId || "cp-gate-entry", operatorName || "Admin Manual");
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
