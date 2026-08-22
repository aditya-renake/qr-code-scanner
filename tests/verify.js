const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "store.json");
const HMAC_SECRET = "hackseries_secure_hmac_secret_2026_super_key";
const EVENT_CODE = "hackseries-2026";

function computeSignature(id, aid, ev, role, ts) {
  const data = id + "|" + aid + "|" + ev + "|" + role + "|" + ts;
  return crypto.createHmac("sha256", HMAC_SECRET).update(data).digest("hex").slice(0, 32);
}

function verifyQRPayload(rawPayload) {
  try {
    const payload = typeof rawPayload === "string" ? JSON.parse(rawPayload.trim()) : rawPayload;
    if (!payload.id || !payload.aid || !payload.sig || !payload.ts) {
      return { valid: false, error: "Malformed QR payload structure" };
    }
    if (payload.ev !== EVENT_CODE) {
      return { valid: false, error: "QR code belongs to different event" };
    }
    const expectedSig = computeSignature(payload.id, payload.aid, payload.ev, payload.role, payload.ts);
    const sigBuffer = Buffer.from(payload.sig);
    const expectedBuffer = Buffer.from(expectedSig);
    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return { valid: false, error: "Cryptographic signature mismatch (Forged/Tampered)" };
    }
    return { valid: true, payload };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

async function run() {
  console.log("=================================================");
  console.log(" 🛡️  HACKSERIES TICKET SYSTEM VERIFICATION SUITE");
  console.log("=================================================");

  // 1. Generate Authentic Attendee & Ticket
  const attendeeId = "att_test_" + Date.now();
  const regNumber = "HS-2026-7788";
  const ts = Math.floor(Date.now() / 1000);
  const sig = computeSignature(regNumber, attendeeId, EVENT_CODE, "hacker", ts);
  
  const genuineTicket = JSON.stringify({
    v: 1,
    id: regNumber,
    aid: attendeeId,
    ev: EVENT_CODE,
    role: "hacker",
    name: "Aditya Renake",
    ts: ts,
    sig: sig
  });

  console.log("\n1. Testing Genuine Ticket Verification:");
  const test1 = verifyQRPayload(genuineTicket);
  if (!test1.valid) throw new Error("Failed genuine ticket check: " + test1.error);
  console.log("   ✔ Genuine Ticket Signature Validated: PASS");

  // 2. Test Tampered Reg Number
  console.log("\n2. Testing Counterfeit / Tampered Reg Number Rejection:");
  const tamperedTicket = JSON.stringify({
    v: 1,
    id: "HS-2026-FAKE-VIP",
    aid: attendeeId,
    ev: EVENT_CODE,
    role: "hacker",
    name: "Aditya Renake",
    ts: ts,
    sig: sig
  });
  const test2 = verifyQRPayload(tamperedTicket);
  if (test2.valid) throw new Error("Security failure: Tampered ticket was accepted!");
  console.log("   ✔ Forged Reg Number Blocked: PASS (" + test2.error + ")");

  // 3. Test Elevated Role Tampering (Hacker trying to claim Organizer pass)
  console.log("\n3. Testing Role Elevation Tamper Detection:");
  const elevatedRoleTicket = JSON.stringify({
    v: 1,
    id: regNumber,
    aid: attendeeId,
    ev: EVENT_CODE,
    role: "organizer",
    name: "Aditya Renake",
    ts: ts,
    sig: sig
  });
  const test3 = verifyQRPayload(elevatedRoleTicket);
  if (test3.valid) throw new Error("Security failure: Role elevation was accepted!");
  console.log("   ✔ Role Elevation Tamper Blocked: PASS (" + test3.error + ")");

  // 4. Test Event Code Spoofing
  console.log("\n4. Testing Cross-Event Spoofing:");
  const fakeEventTicket = JSON.stringify({
    v: 1,
    id: regNumber,
    aid: attendeeId,
    ev: "other-hackathon-2026",
    role: "hacker",
    name: "Aditya Renake",
    ts: ts,
    sig: sig
  });
  const test4 = verifyQRPayload(fakeEventTicket);
  if (test4.valid) throw new Error("Security failure: Cross-event token was accepted!");
  console.log("   ✔ Cross-Event Token Blocked: PASS (" + test4.error + ")");

  console.log("\n=================================================");
  console.log(" ✅ ALL 4 SECURITY CHECKS PASSED WITH ZERO FLAWS");
  console.log("=================================================\n");
}

run();
