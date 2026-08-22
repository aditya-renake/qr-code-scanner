# HackSeries Pass — QR Ticket Generation & Gate Check-in System

A complete event ticket management, cryptographically secured QR generation, and real-time gate scanner system built for hackathons like **HackSeries**.

---

## 🌟 What Was Built

### 1. **Cryptographic Anti-Forgery Engine (`src/lib/crypto.ts`)**
- **HMAC-SHA256 Signed Payloads**: QR code data contains an unalterable HMAC signature combining `RegID`, `Attendee UUID`, `Event Code`, `Role`, and issuance `Timestamp`.
- **Tamper Detection**: Altering any detail (such as elevating a participant role to "VIP" or changing the Registration ID) instantly invalidates the signature and triggers an alert at the gate scanner.
- **Timing-Safe Verification**: Employs `crypto.timingSafeEqual` to eliminate timing side-channel attacks.

### 2. **Attendee Registration & Instant Ticket Issuer (`/register`)**
- Full participant sign-up collecting: Name, Email, Phone, College/Organization, Team Name, Innovation Track, Role (Hacker, Mentor, Judge, VIP, Organizer), T-Shirt size, and Dietary preference.
- Instant issuance of cryptographic QR code passes.
- Duplicate email prevention (returns existing pass if already registered).

### 3. **Digital Holographic Attendee Pass (`/ticket/[id]`)**
- **Dynamic Security Pulse Watermark**: Displays a synchronized live clock and animated radar pulse to prevent attendees from using static screenshots from other people.
- **Multi-Stage Checkpoint Tracker**: Visual indicators for `Main Gate Entry`, `Lunch Day 1`, `Swag Bag Kit`, `Midnight Pizza`, and `Lunch Day 2`.
- **One-Click Share & Print**: Shareable link and print-ready CSS formatting for physical badge printing.

### 4. **Organizer Gate Scanner (`/scan`)**
- **Mobile Camera Optical Scanner**: Real-time camera viewfinder with animated target crosshairs powered by HTML5 QR Code.
- **Synthesized Web Audio FX**: Built-in sound feedback without requiring external audio files (pleasant 2-tone melodic chime for admitted entries, double warning buzz for duplicate scans, and low error tone for counterfeits).
- **Zero-Passback Duplicate Protection**: Once an attendee scans into a checkpoint, a second scan triggers an immediate duplicate warning showing the exact prior check-in time and gate.
- **Multi-Checkpoint Switcher**: Switch on-the-fly between Main Entry, Food/Meals, and Swag Distribution counters.
- **Manual Search & Check-in Fallback**: Quick search by Name, Email, or Reg ID if an attendee's phone screen is broken or battery is dead.

### 5. **Command Center & Live Analytics Dashboard (`/dashboard`)**
- Real-time KPIs: Total Registered, Gate Admitted Count, Attendance Percentage, and Security Integrity.
- Multi-Stage Checkpoint Distribution progress bars.
- Searchable & filterable attendee directory (filter by Role and Checked-in status).
- 1-Click Manual Check-in Override.
- Export Attendee & Attendance Report to CSV.
- Seed demo data & reset scan logs actions.

---

## 🧪 Verification & Security Test Results

The cryptographic engine and verification rules were validated through automated test scripts:

| Test Case | Scenario | Expected Result | Status |
| :--- | :--- | :--- | :--- |
| **1. Genuine Ticket Validation** | Valid registration QR code scanned at Gate 1 | Signature verified, Attendee admitted | 🟢 **PASS** |
| **2. Forged Reg ID Detection** | Malicious user alters registration number in QR payload | Cryptographic signature mismatch rejected | 🟢 **PASS** |
| **3. Privilege Escalation Tamper** | Hacker changes role from `hacker` to `organizer` | HMAC signature mismatch rejected | 🟢 **PASS** |
| **4. Anti-Passback Duplicate Scan** | Same ticket scanned a second time at the same checkpoint | Blocked as `ALREADY_CHECKED_IN` with prior timestamp | 🟢 **PASS** |
| **5. Multi-Checkpoint Isolation** | Ticket scanned at Main Gate then scanned at Lunch Counter | Entry succeeded, Lunch succeeded separately | 🟢 **PASS** |
| **6. Cross-Event Token Spoofing** | QR code from another event presented at scanner | Rejected as foreign event code | 🟢 **PASS** |

---

## 🚀 How to Run the Application

The project is located at:
```bash
/Users/adityarenake/.gemini/antigravity/scratch/hackseries-tickets
```

### Start Development Server:
```bash
cd /Users/adityarenake/.gemini/antigravity/scratch/hackseries-tickets
npm run dev
```
Open **`http://localhost:3000`** in your browser.

### Key URLs:
- **`http://localhost:3000/`** — Home portal with event stats and quick lookups
- **`http://localhost:3000/register`** — Attendee sign-up and pass generation
- **`http://localhost:3000/ticket/HS-2026-1001`** — Sample Attendee Digital Holographic Badge
- **`http://localhost:3000/scan`** — Organizer Gate & Food Counter Scanner
- **`http://localhost:3000/dashboard`** — Live Command Center and Attendee Directory
