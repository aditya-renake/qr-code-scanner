export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getAllAttendees, getCheckpoints, getAllScanLogs } from "@/lib/db";

export async function GET() {
  try {
    const attendees = await getAllAttendees();
    const checkpoints = await getCheckpoints();
    const scanLogs = await getAllScanLogs();

    const totalRegistered = attendees.length;
    const entryCheckpoint = checkpoints[0];
    
    // Checked in at main gate
    const entryScans = scanLogs.filter((l) => l.checkpointId === entryCheckpoint?.id && l.status === "valid");
    const checkedInAttendeeIds = new Set(entryScans.map((s) => s.attendeeId));
    const totalCheckedIn = checkedInAttendeeIds.size;
    const attendanceRate = totalRegistered > 0 ? Math.round((totalCheckedIn / totalRegistered) * 100) : 0;

    // Checkpoint breakdown
    const checkpointStats = checkpoints.map((cp) => {
      const scans = scanLogs.filter((s) => s.checkpointId === cp.id && s.status === "valid");
      const uniqueScanned = new Set(scans.map((s) => s.attendeeId)).size;
      return {
        id: cp.id,
        name: cp.name,
        category: cp.category,
        totalScans: uniqueScanned,
        maxPossible: totalRegistered,
        percentage: totalRegistered > 0 ? Math.round((uniqueScanned / totalRegistered) * 100) : 0,
      };
    });

    // Role breakdown
    const roleStats: Record<string, number> = {};
    attendees.forEach((a) => {
      roleStats[a.role] = (roleStats[a.role] || 0) + 1;
    });

    // Track breakdown
    const trackStats: Record<string, number> = {};
    attendees.forEach((a) => {
      trackStats[a.track] = (trackStats[a.track] || 0) + 1;
    });

    // Recent activity (latest 15 logs)
    const recentActivity = scanLogs.slice(0, 15);

    return NextResponse.json({
      success: true,
      totalRegistered,
      totalCheckedIn,
      attendanceRate,
      checkpointStats,
      roleStats,
      trackStats,
      recentActivity,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
