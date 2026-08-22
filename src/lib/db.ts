import fs from "fs";
import path from "path";
import { Attendee, Checkpoint, ScanLog, VerificationResult } from "./types";
import { generateSignedQRPayload, serializeQRPayload, verifyQRPayload } from "./crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "store.json");

interface DataStore {
  attendees: Attendee[];
  checkpoints: Checkpoint[];
  scanLogs: ScanLog[];
}

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

function ensureDataStore(): DataStore {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const initial: DataStore = {
      attendees: [],
      checkpoints: DEFAULT_CHECKPOINTS,
      scanLogs: [],
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    const data = JSON.parse(raw) as DataStore;
    if (!data.checkpoints || data.checkpoints.length === 0) {
      data.checkpoints = DEFAULT_CHECKPOINTS;
      saveStore(data);
    }
    return data;
  } catch (e) {
    const fallback: DataStore = {
      attendees: [],
      checkpoints: DEFAULT_CHECKPOINTS,
      scanLogs: [],
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(fallback, null, 2), "utf8");
    return fallback;
  }
}

function saveStore(store: DataStore) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tempFile = DB_FILE + ".tmp";
  fs.writeFileSync(tempFile, JSON.stringify(store, null, 2), "utf8");
  fs.renameSync(tempFile, DB_FILE);
}

export function getAllAttendees(): Attendee[] {
  const store = ensureDataStore();
  return store.attendees;
}

export function getAttendeeById(id: string): Attendee | undefined {
  const store = ensureDataStore();
  return store.attendees.find((a) => a.id === id || a.regNumber.toUpperCase() === id.toUpperCase());
}

export function getAttendeeByEmail(email: string): Attendee | undefined {
  const store = ensureDataStore();
  return store.attendees.find((a) => a.email.toLowerCase() === email.toLowerCase());
}

export function createAttendee(data: Omit<Attendee, "id" | "regNumber" | "createdAt" | "status" | "qrToken">): Attendee {
  const store = ensureDataStore();

  const existing = store.attendees.find((a) => a.email.toLowerCase() === data.email.toLowerCase());
  if (existing) {
    throw new Error(`An attendee with email ${data.email} is already registered (${existing.regNumber}).`);
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

  store.attendees.unshift(newAttendee);
  saveStore(store);
  return newAttendee;
}

export function getCheckpoints(): Checkpoint[] {
  const store = ensureDataStore();
  return store.checkpoints;
}

export function getCheckpointById(id: string): Checkpoint | undefined {
  const store = ensureDataStore();
  return store.checkpoints.find((c) => c.id === id);
}

export function getAllScanLogs(): ScanLog[] {
  const store = ensureDataStore();
  return store.scanLogs;
}

export function getScanLogsForAttendee(attendeeId: string): ScanLog[] {
  const store = ensureDataStore();
  return store.scanLogs.filter((s) => s.attendeeId === attendeeId);
}

export function verifyAndProcessScan(params: {
  qrContent: string;
  checkpointId: string;
  scannedBy?: string;
  gateLocation?: string;
}): VerificationResult {
  const store = ensureDataStore();
  const { qrContent, checkpointId, scannedBy = "Gate Staff", gateLocation = "Main Gate North" } = params;

  // 1. Verify Checkpoint
  const checkpoint = store.checkpoints.find((c) => c.id === checkpointId) || store.checkpoints[0];

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
  const attendee = store.attendees.find((a) => a.id === payload.aid || a.regNumber === payload.id);
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

  // 4. Duplicate Check-in Check for this specific Checkpoint
  const previousScans = store.scanLogs.filter(
    (log) => log.attendeeId === attendee.id && log.checkpointId === checkpoint.id && log.status === "valid"
  );

  if (previousScans.length >= checkpoint.maxScansPerAttendee) {
    const lastScan = previousScans[previousScans.length - 1];
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

  store.scanLogs.unshift(newLog);
  saveStore(store);

  return {
    success: true,
    status: "ADMITTED",
    message: `Admitted successfully: ${attendee.fullName} (${attendee.role.toUpperCase()})`,
    attendee,
    checkpoint,
    scanLog: newLog,
  };
}

export function manualCheckInAttendee(attendeeId: string, checkpointId: string, operatorName = "Admin Override"): VerificationResult {
  const store = ensureDataStore();
  const attendee = store.attendees.find((a) => a.id === attendeeId);
  const checkpoint = store.checkpoints.find((c) => c.id === checkpointId) || store.checkpoints[0];

  if (!attendee) {
    return {
      success: false,
      status: "NOT_FOUND",
      message: "Attendee not found",
    };
  }

  const previousScans = store.scanLogs.filter(
    (log) => log.attendeeId === attendee.id && log.checkpointId === checkpoint.id && log.status === "valid"
  );

  if (previousScans.length >= checkpoint.maxScansPerAttendee) {
    const lastScan = previousScans[previousScans.length - 1];
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

  store.scanLogs.unshift(newLog);
  saveStore(store);

  return {
    success: true,
    status: "ADMITTED",
    message: `Manual check-in granted for ${attendee.fullName}`,
    attendee,
    checkpoint,
    scanLog: newLog,
  };
}

export function seedDemoData() {
  const store = ensureDataStore();
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

  store.attendees = [];
  store.scanLogs = [];

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
    store.attendees.push(attendee);
  });

  // Pre-seed some scan logs for realistic telemetry
  const entryCP = store.checkpoints[0];
  const lunchCP = store.checkpoints[1];

  store.scanLogs.push({
    id: "scan_demo_1",
    attendeeId: store.attendees[0].id,
    regNumber: store.attendees[0].regNumber,
    attendeeName: store.attendees[0].fullName,
    checkpointId: entryCP.id,
    checkpointName: entryCP.name,
    scannedAt: new Date(Date.now() - 45 * 60000).toISOString(),
    scannedBy: "Gate 1 - Volunteer",
    gateLocation: "North Auditorium Gate",
    status: "valid",
  });

  store.scanLogs.push({
    id: "scan_demo_2",
    attendeeId: store.attendees[1].id,
    regNumber: store.attendees[1].regNumber,
    attendeeName: store.attendees[1].fullName,
    checkpointId: entryCP.id,
    checkpointName: entryCP.name,
    scannedAt: new Date(Date.now() - 30 * 60000).toISOString(),
    gateLocation: "South Entrance",
    scannedBy: "Gate 2 - Volunteer",
    status: "valid",
  });

  store.scanLogs.push({
    id: "scan_demo_3",
    attendeeId: store.attendees[0].id,
    regNumber: store.attendees[0].regNumber,
    attendeeName: store.attendees[0].fullName,
    checkpointId: lunchCP.id,
    checkpointName: lunchCP.name,
    scannedAt: new Date(Date.now() - 10 * 60000).toISOString(),
    gateLocation: "Dining Hall Counter 1",
    scannedBy: "Catering Lead",
    status: "valid",
  });

  saveStore(store);
  return { attendees: store.attendees.length, scans: store.scanLogs.length };
}

export function resetScanLogs() {
  const store = ensureDataStore();
  store.scanLogs = [];
  saveStore(store);
  return { success: true };
}
