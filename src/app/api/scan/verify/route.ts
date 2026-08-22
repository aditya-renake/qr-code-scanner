import { NextResponse } from "next/server";
import { verifyAndProcessScan } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { qrContent, checkpointId, scannedBy, gateLocation } = body;

    if (!qrContent) {
      return NextResponse.json(
        { success: false, status: "INVALID_SIGNATURE", message: "QR payload is missing" },
        { status: 400 }
      );
    }

    const result = verifyAndProcessScan({
      qrContent,
      checkpointId: checkpointId || "cp-gate-entry",
      scannedBy: scannedBy || "Gate Volunteer #1",
      gateLocation: gateLocation || "Main Auditorium Gate A",
    });

    let httpStatus = 200;
    if (result.status === "ALREADY_CHECKED_IN") httpStatus = 409;
    else if (result.status === "INVALID_SIGNATURE") httpStatus = 400;
    else if (result.status === "NOT_FOUND") httpStatus = 404;
    else if (result.status === "REVOKED") httpStatus = 403;

    return NextResponse.json(result, { status: httpStatus });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, status: "ERROR", message: err.message || "Verification server error" },
      { status: 500 }
    );
  }
}
