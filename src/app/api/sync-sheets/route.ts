import { NextResponse } from "next/server";
import { createAttendee, getAttendeeByEmail } from "@/lib/db";
import { sendTicketEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { sheetUrl, csvContent } = await req.json();
    let rawCSV = csvContent || "";

    if (sheetUrl && !csvContent) {
      const match = sheetUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        const exportUrl = "https://docs.google.com/spreadsheets/d/" + match[1] + "/export?format=csv";
        try {
          const res = await fetch(exportUrl);
          if (res.ok) {
            rawCSV = await res.text();
          }
        } catch (e) {
          console.error("Failed to fetch public CSV export:", e);
        }
      }
    }

    if (!rawCSV.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Please provide CSV content or share your Google Sheet (Anyone with link can view).",
        },
        { status: 400 }
      );
    }

    const lines = rawCSV
      .split(/\r?\n/)
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0);

    if (lines.length <= 1) {
      return NextResponse.json({ success: false, message: "No data rows found in Google Sheet CSV" }, { status: 400 });
    }

    const headers = lines[0].split(",").map((h: string) => h.replace(/[\"\r]/g, "").trim().toLowerCase());

    const getColIdx = (possible: string[]) => {
      for (let i = 0; i < headers.length; i++) {
        for (const p of possible) {
          if (headers[i].includes(p.toLowerCase())) return i;
        }
      }
      return -1;
    };

    const emailIdx = getColIdx(["email", "mail", "email address", "your email"]);
    const nameIdx = getColIdx(["name", "full name", "participant"]);
    const collegeIdx = getColIdx(["college", "university", "org", "institute"]);
    const teamIdx = getColIdx(["team", "team name"]);
    const roleIdx = getColIdx(["role", "category"]);
    const trackIdx = getColIdx(["track", "theme", "domain"]);
    const sizeIdx = getColIdx(["size", "t-shirt"]);
    const dietIdx = getColIdx(["diet", "food", "meal"]);

    const results = [];
    let newIssued = 0;

    for (let r = 1; r < lines.length; r++) {
      const row = lines[r].split(",").map((v: string) => v.replace(/^"|"$/g, "").trim());

      let email = emailIdx !== -1 ? row[emailIdx] : "";
      if (!email || !email.includes("@")) {
        for (const cell of row) {
          if (cell.includes("@") && cell.includes(".")) {
            email = cell;
            break;
          }
        }
      }

      if (!email || !email.includes("@")) continue;

      const fullName = (nameIdx !== -1 ? row[nameIdx] : "") || "Participant";
      const college = (collegeIdx !== -1 ? row[collegeIdx] : "") || "Independent";
      const teamName = (teamIdx !== -1 ? row[teamIdx] : "") || "Solo Innovator";
      const role = ((roleIdx !== -1 ? row[roleIdx] : "") || "hacker").toLowerCase() as any;
      const track = ((trackIdx !== -1 ? row[trackIdx] : "") || "AI & Machine Learning") as any;
      const tShirtSize = ((sizeIdx !== -1 ? row[sizeIdx] : "") || "L") as any;
      const dietaryPreference = ((dietIdx !== -1 ? row[dietIdx] : "") || "Vegetarian") as any;

      let attendee = await getAttendeeByEmail(email);
      let isNew = false;

      if (!attendee) {
        attendee = await createAttendee({
          fullName,
          email,
          phone: "+91 00000 00000",
          college,
          teamName,
          role: ["hacker", "mentor", "judge", "vip", "organizer"].includes(role) ? role : "hacker",
          track,
          tShirtSize: ["S", "M", "L", "XL", "XXL"].includes(tShirtSize) ? tShirtSize : "L",
          dietaryPreference: ["Vegetarian", "Non-Vegetarian", "Vegan", "Jain"].includes(dietaryPreference)
            ? dietaryPreference
            : "Vegetarian",
        });
        isNew = true;
        newIssued++;
      }

      sendTicketEmail({
        attendee,
        qrPayloadString: attendee.qrToken || "",
      }).catch(console.error);

      results.push({
        attendee,
        isNew,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} Google Form submissions! Issued & emailed ${newIssued} new QR passes.`,
      totalProcessed: results.length,
      newIssued,
      attendees: results.map((r) => r.attendee),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
