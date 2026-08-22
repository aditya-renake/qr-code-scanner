import { Redis } from '@upstash/redis';
import { Attendee, Checkpoint, ScanLog, VerificationResult } from "./types";
import { generateSignedQRPayload, serializeQRPayload, verifyQRPayload } from "./crypto";

// Initialize Redis from Environment Variables
// Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
const redis = Redis.fromEnv();

const DEFAULT_CHECKPOINTS: Checkpoint[] = [
  {
    id: "cp-gate-entry",
    name: "Main Gate Check-in & Badge Pickup",
    category: "entry",
    description: "Main auditorium entry verification and ID wristband distribution",
    icon: "DoorOpen",
    maxScansPerAttendee: 1,
  },
  {
    id: "cp-lunch-d1",
    name: "Day 1 - Lunch Counter",
    category: "food",
    description: "Access to Day 1 networking lunch buffet",
    icon: "Utensils",
    maxScansPerAttendee: 1,
  },
  {
    id: "cp-swag-kit",
    name: "HackSeries Swag & Kit Desk",
    category: "swag",
    description: "Official HackSeries T-shirt, stickers, badge lanyard, and sponsor goodies",
    icon: "Gift",
    maxScansPerAttendee: 1,
  },
  {
    id: "cp-midnight-snack",
    name: "Midnight Pizza & Red Bull Station",
    category: "food",
    description: "Late-night hackathon energy booster counter",
    icon: "Coffee",
    maxScansPerAttendee: 1,
  },
  {
    id: "cp-lunch-d2",
    name: "Day 2 - Lunch & Finale",
    category: "food",
    description: "Day 2 lunch before project pitch & demo hour",
    icon: "Pizza",
    maxScansPerAttendee: 1,
  },
];

export async function getAllAttendees(): Promise<Attendee[]> {
  const attendeesMap = await redis.hgetall<Record<string, Attendee>>("hs:attendees");
  if (!attendeesMap) return [];
  return Object.values(attendeesMap).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getAttendeeById(id: string): Promise<Attendee | undefined> {
  // Check if it's a registration number
  if (id.toUpperCase().startsWith("HS-")) {
    const attendeeId = await redis.hget<string>("hs:regs", id.toUpperCase());
    if (!attendeeId) return undefined;
    return (await redis.hget<Attendee>("hs:attendees", attendeeId)) || undefined;
  }
  
  return (await redis.hget<Attendee>("hs:attendees", id)) || undefined;
}

export async function getAttendeeByEmail(email: string): Promise<Attendee | undefined> {
  const attendeeId = await redis.hget<string>("hs:emails", email.toLowerCase());
  if (!attendeeId) return undefined;
  return (await redis.hget<Attendee>("hs:attendees", attendeeId)) || undefined;
}

export async function createAttendee(data: Omit<Attendee, "id" | "regNumber" | "createdAt" | "status" | "qrToken">): Promise<Attendee> {
  const existingId = await redis.hget<string>("hs:emails", data.email.toLowerCase());
  if (existingId) {
    throw new Error(`An attendee with email ${data.email} is already registered.`);
  }

  const id = "att_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36).slice(-4);
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const regNumber = `HS-2026-${randomNum}`;

  const newAttendee: Attendee = {
    ...data,
    id,
    regNumber,
    createdAt: new Date().toISOString(),
    status: "approved",
  };

  const payload = generateSignedQRPayload(newAttendee);
  newAttendee.qrToken = serializeQRPayload(payload);

  // Pipeline for atomic-ish insertion
  const p = redis.pipeline();
  p.hset("hs:attendees", { [id]: newAttendee });
  p.hset("hs:emails", { [data.email.toLowerCase()]: id });
  p.hset("hs:regs", { [regNumber.toUpperCase()]: id });
  await p.exec();

  return newAttendee;
}

export async function getCheckpoints(): Promise<Checkpoint[]> {
  return DEFAULT_CHECKPOINTS;
}

export async function getCheckpointById(id: string): Promise<Checkpoint | undefined> {
  return DEFAULT_CHECKPOINTS.find((c) => c.id === id);
}

export async function getAllScanLogs(): Promise<ScanLog[]> {
  const logs = await redis.lrange<ScanLog>("hs:scanlogs", 0, -1);
  return logs || [];
}

export async function getScanLogsForAttendee(attendeeId: string): Promise<ScanLog[]> {
  const logs = await getAllScanLogs();
  return logs.filter((s) => s.attendeeId === attendeeId);
}

export async function verifyAndProcessScan(params: {
  qrContent: string;
  checkpointId: string;
  scannedBy?: string;
  gateLocation?: string;
}): Promise<VerificationResult> {
  const { qrContent, checkpointId, scannedBy = "Gate Staff", gateLocation = "Main Gate North" } = params;

  // 1. Verify Checkpoint
  const checkpoint = DEFAULT_CHECKPOINTS.find((c) => c.id === checkpointId) || DEFAULT_CHECKPOINTS[0];

  // 2. Cryptographic signature check
  const verifyResult = verifyQRPayload(qrContent);
  if (!verifyResult.valid || !verifyResult.payload) {
    return {
      success: false,
      status: "INVALID_SIGNATURE",
      message: verifyResult.error || "Counterfeit QR ticket detected.",
      checkpoint,
    };
  }

  const payload = verifyResult.payload;

  // 3. Match Attendee in Database
  const attendee = await getAttendeeById(payload.aid);
  if (!attendee) {
    return {
      success: false,
      status: "NOT_FOUND",
      message: `Registration record ${payload.id} was not found in the verified attendee database.`,
      checkpoint,
    };
  }

  if (attendee.status === "revoked") {
    return {
      success: false,
      status: "REVOKED",
      message: `Ticket for ${attendee.fullName} has been revoked by administration.`,
      attendee,
      checkpoint,
    };
  }

  // 4. Duplicate Check-in Check
  const previousScans = await getScanLogsForAttendee(attendee.id);
  const relevantScans = previousScans.filter((log) => log.checkpointId === checkpoint.id && log.status === "valid");

  if (relevantScans.length >= checkpoint.maxScansPerAttendee) {
    const lastScan = relevantScans[0]; // Assuming reverse chronological or we just pick first matched
    return {
      success: false,
      status: "ALREADY_CHECKED_IN",
      message: `Already claimed/scanned at ${new Date(lastScan.scannedAt).toLocaleTimeString()} (${lastScan.gateLocation})`,
      attendee,
      checkpoint,
      firstScannedAt: lastScan.scannedAt,
      firstScannedGate: lastScan.gateLocation,
    };
  }

  // 5. Valid Entry -> Record Scan
  const newLog: ScanLog = {
    id: "scan_" + Math.random().toString(36).substring(2, 9),
    attendeeId: attendee.id,
    regNumber: attendee.regNumber,
    attendeeName: attendee.fullName,
    checkpointId: checkpoint.id,
    checkpointName: checkpoint.name,
    scannedAt: new Date().toISOString(),
    scannedBy,
    gateLocation,
    status: "valid",
    message: "Verified & Admitted",
  };

  await redis.lpush("hs:scanlogs", newLog);

  return {
    success: true,
    status: "ADMITTED",
    message: `Admitted successfully: ${attendee.fullName} (${attendee.role.toUpperCase()})`,
    attendee,
    checkpoint,
    scanLog: newLog,
  };
}

export async function manualCheckInAttendee(attendeeId: string, checkpointId: string, operatorName = "Admin Override"): Promise<VerificationResult> {
  const attendee = await getAttendeeById(attendeeId);
  const checkpoint = DEFAULT_CHECKPOINTS.find((c) => c.id === checkpointId) || DEFAULT_CHECKPOINTS[0];

  if (!attendee) {
    return {
      success: false,
      status: "NOT_FOUND",
      message: "Attendee not found",
    };
  }

  const previousScans = await getScanLogsForAttendee(attendee.id);
  const relevantScans = previousScans.filter((log) => log.checkpointId === checkpoint.id && log.status === "valid");

  if (relevantScans.length >= checkpoint.maxScansPerAttendee) {
    const lastScan = relevantScans[0];
    return {
      success: false,
      status: "ALREADY_CHECKED_IN",
      message: `Already checked in at ${new Date(lastScan.scannedAt).toLocaleTimeString()}`,
      attendee,
      checkpoint,
      firstScannedAt: lastScan.scannedAt,
    };
  }

  const newLog: ScanLog = {
    id: "scan_manual_" + Math.random().toString(36).substring(2, 9),
    attendeeId: attendee.id,
    regNumber: attendee.regNumber,
    attendeeName: attendee.fullName,
    checkpointId: checkpoint.id,
    checkpointName: checkpoint.name,
    scannedAt: new Date().toISOString(),
    scannedBy: operatorName,
    gateLocation: "Manual Admin Desk",
    status: "valid",
    message: "Manual Check-in by Admin",
  };

  await redis.lpush("hs:scanlogs", newLog);

  return {
    success: true,
    status: "ADMITTED",
    message: `Manual check-in granted for ${attendee.fullName}`,
    attendee,
    checkpoint,
    scanLog: newLog,
  };
}

export async function seedDemoData(): Promise<{ attendees: number; scans: number }> {
  // Clear existing
  await redis.del("hs:attendees", "hs:emails", "hs:regs", "hs:scanlogs");

  const demoList = [
    {
      fullName: "Aditya Renake",
      email: "aditya@hackseries.dev",
      phone: "+91 98765 43210",
      college: "IIT Bombay",
      teamName: "Team NeuralForge",
      role: "hacker" as const,
      track: "AI & Machine Learning" as const,
      tShirtSize: "L" as const,
      dietaryPreference: "Vegetarian" as const,
    },
    {
      fullName: "Priya Sharma",
      email: "priya.sharma@techinst.edu",
      phone: "+91 98123 45678",
      college: "BITS Pilani",
      teamName: "CipherZero",
      role: "hacker" as const,
      track: "Web3 & Blockchain" as const,
      tShirtSize: "M" as const,
      dietaryPreference: "Vegetarian" as const,
    },
    {
      fullName: "Dr. Rohan Varma",
      email: "rohan.varma@deepmind.example",
      phone: "+91 98450 11223",
      college: "Google Research / Advisor",
      teamName: "Mentors & Staff",
      role: "mentor" as const,
      track: "AI & Machine Learning" as const,
      tShirtSize: "XL" as const,
      dietaryPreference: "Non-Vegetarian" as const,
    },
    {
      fullName: "Ananya Deshmukh",
      email: "ananya.d@finsec.org",
      phone: "+91 99234 56789",
      college: "COEP Tech",
      teamName: "FinGuardian",
      role: "hacker" as const,
      track: "FinTech & Security" as const,
      tShirtSize: "S" as const,
      dietaryPreference: "Jain" as const,
    },
    {
      fullName: "Vikramaditya Sengupta",
      email: "vikram@venturecapital.io",
      phone: "+91 97111 22334",
      college: "Apex Ventures",
      teamName: "Jury Panel",
      role: "judge" as const,
      track: "Open Innovation" as const,
      tShirtSize: "L" as const,
      dietaryPreference: "Non-Vegetarian" as const,
    },
    {
      fullName: "Kabir Mehta",
      email: "kabir.m@biotech.ac.in",
      phone: "+91 98333 44556",
      college: "IIT Delhi",
      teamName: "BioSynth AI",
      role: "hacker" as const,
      track: "HealthTech & Bio" as const,
      tShirtSize: "M" as const,
      dietaryPreference: "Vegan" as const,
    },
    {
      fullName: "Sneha Patel",
      email: "sneha.lead@hackseries.dev",
      phone: "+91 98666 77889",
      college: "HackSeries Core Team",
      teamName: "Organizing Committee",
      role: "organizer" as const,
      track: "Open Innovation" as const,
      tShirtSize: "M" as const,
      dietaryPreference: "Vegetarian" as const,
    },
    {
      fullName: "Aarav Gupta",
      email: "aarav.g@iiit.ac.in",
      phone: "+91 98777 88990",
      college: "IIIT Hyderabad",
      teamName: "OmniChain",
      role: "hacker" as const,
      track: "Web3 & Blockchain" as const,
      tShirtSize: "L" as const,
      dietaryPreference: "Vegetarian" as const,
    },
  ];

  const p = redis.pipeline();
  const createdAttendees: Attendee[] = [];

  demoList.forEach((data, index) => {
    const id = "att_demo_" + (index + 1);
    const regNumber = `HS-2026-${1001 + index}`;
    const attendee: Attendee = {
      ...data,
      id,
      regNumber,
      createdAt: new Date(Date.now() - (10 - index) * 3600000).toISOString(),
      status: "approved",
    };
    const payload = generateSignedQRPayload(attendee);
    attendee.qrToken = serializeQRPayload(payload);
    
    createdAttendees.push(attendee);

    p.hset("hs:attendees", { [id]: attendee });
    p.hset("hs:emails", { [data.email.toLowerCase()]: id });
    p.hset("hs:regs", { [regNumber]: id });
  });

  await p.exec();

  // Pre-seed some scan logs
  const entryCP = DEFAULT_CHECKPOINTS[0];
  const lunchCP = DEFAULT_CHECKPOINTS[1];

  const p2 = redis.pipeline();

  const logs = [
    {
      id: "scan_demo_1",
      attendeeId: createdAttendees[0].id,
      regNumber: createdAttendees[0].regNumber,
      attendeeName: createdAttendees[0].fullName,
      checkpointId: entryCP.id,
      checkpointName: entryCP.name,
      scannedAt: new Date(Date.now() - 45 * 60000).toISOString(),
      scannedBy: "Gate 1 - Volunteer",
      gateLocation: "North Auditorium Gate",
      status: "valid",
    },
    {
      id: "scan_demo_2",
      attendeeId: createdAttendees[1].id,
      regNumber: createdAttendees[1].regNumber,
      attendeeName: createdAttendees[1].fullName,
      checkpointId: entryCP.id,
      checkpointName: entryCP.name,
      scannedAt: new Date(Date.now() - 30 * 60000).toISOString(),
      gateLocation: "South Entrance",
      scannedBy: "Gate 2 - Volunteer",
      status: "valid",
    },
    {
      id: "scan_demo_3",
      attendeeId: createdAttendees[0].id,
      regNumber: createdAttendees[0].regNumber,
      attendeeName: createdAttendees[0].fullName,
      checkpointId: lunchCP.id,
      checkpointName: lunchCP.name,
      scannedAt: new Date(Date.now() - 10 * 60000).toISOString(),
      gateLocation: "Dining Hall Counter 1",
      scannedBy: "Catering Lead",
      status: "valid",
    }
  ];

  logs.forEach(log => p2.lpush("hs:scanlogs", log));
  await p2.exec();

  return { attendees: demoList.length, scans: logs.length };
}

export async function resetScanLogs(): Promise<{ success: boolean }> {
  await redis.del("hs:scanlogs");
  return { success: true };
}
