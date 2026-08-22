import crypto from "crypto";
import { Attendee, SignedQRPayload } from "./types";

const HMAC_SECRET = process.env.QR_SECRET_KEY || "hackseries_secure_hmac_secret_2026_super_key";
const EVENT_CODE = "hackseries-2026";

function computeSignature(id: string, aid: string, ev: string, role: string, ts: number): string {
  const data = `${id}|${aid}|${ev}|${role}|${ts}`;
  return crypto.createHmac("sha256", HMAC_SECRET).update(data).digest("hex").slice(0, 32);
}

export function generateSignedQRPayload(attendee: Attendee): SignedQRPayload {
  const ts = Math.floor(Date.now() / 1000);
  const sig = computeSignature(attendee.regNumber, attendee.id, EVENT_CODE, attendee.role, ts);
  return {
    v: 1,
    id: attendee.regNumber,
    aid: attendee.id,
    ev: EVENT_CODE,
    role: attendee.role,
    name: attendee.fullName,
    ts,
    sig,
  };
}

export function serializeQRPayload(payload: SignedQRPayload): string {
  return JSON.stringify(payload);
}

export function verifyQRPayload(rawPayload: string | SignedQRPayload): {
  valid: boolean;
  payload?: SignedQRPayload;
  error?: string;
} {
  try {
    let payload: SignedQRPayload;
    if (typeof rawPayload === "string") {
      // Clean leading/trailing spaces
      const trimmed = rawPayload.trim();
      payload = JSON.parse(trimmed);
    } else {
      payload = rawPayload;
    }

    if (!payload.id || !payload.aid || !payload.sig || !payload.ts) {
      return { valid: false, error: "Malformed QR code payload structure" };
    }

    if (payload.ev !== EVENT_CODE) {
      return { valid: false, error: "QR code belongs to a different event" };
    }

    const expectedSig = computeSignature(payload.id, payload.aid, payload.ev, payload.role, payload.ts);

    // Constant-time comparison
    const sigBuffer = Buffer.from(payload.sig);
    const expectedBuffer = Buffer.from(expectedSig);

    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return { valid: false, error: "Cryptographic signature check failed (Counterfeit/Tampered Ticket)" };
    }

    return { valid: true, payload };
  } catch (err: any) {
    return { valid: false, error: "Failed to decode QR code data: " + (err.message || "Invalid format") };
  }
}
