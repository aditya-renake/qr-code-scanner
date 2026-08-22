export type AttendeeRole = "hacker" | "mentor" | "judge" | "organizer" | "vip" | "volunteer";
export type TrackType = "AI & Machine Learning" | "Web3 & Blockchain" | "FinTech & Security" | "HealthTech & Bio" | "Open Innovation";

export interface Attendee {
  id: string;
  regNumber: string; // e.g. HS-2026-1042
  fullName: string;
  email: string;
  phone: string;
  college: string;
  teamName: string;
  role: AttendeeRole;
  track: TrackType;
  tShirtSize: "S" | "M" | "L" | "XL" | "XXL";
  dietaryPreference: "Vegetarian" | "Non-Vegetarian" | "Vegan" | "Jain";
  createdAt: string;
  status: "approved" | "pending" | "revoked";
  qrToken?: string;
}

export interface Checkpoint {
  id: string;
  name: string;
  category: "entry" | "food" | "swag" | "special";
  description: string;
  icon: string;
  maxScansPerAttendee: number;
}

export interface ScanLog {
  id: string;
  attendeeId: string;
  regNumber: string;
  attendeeName: string;
  checkpointId: string;
  checkpointName: string;
  scannedAt: string;
  scannedBy: string;
  gateLocation: string;
  status: "valid" | "duplicate" | "rejected";
  message?: string;
}

export interface SignedQRPayload {
  v: number;
  id: string; // regNumber
  aid: string; // attendee UUID
  ev: string; // event id: "hackseries-2026"
  role: AttendeeRole;
  name: string;
  ts: number;
  sig: string;
}

export interface VerificationResult {
  success: boolean;
  status: "ADMITTED" | "ALREADY_CHECKED_IN" | "INVALID_SIGNATURE" | "NOT_FOUND" | "REVOKED";
  message: string;
  attendee?: Attendee;
  checkpoint?: Checkpoint;
  firstScannedAt?: string;
  firstScannedGate?: string;
  scanLog?: ScanLog;
}
