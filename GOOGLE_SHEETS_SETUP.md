# 📋 Google Forms & Sheets Automated Email + QR Ticket Setup Guide

This guide walks you through connecting your **Google Form & Google Sheet** to the **HackSeries QR Pass System** so that whenever a participant registers via your Google Form, they **automatically receive an email with their cryptographically signed QR ticket badge**.

---

## 🔗 Your Form & Sheet Links:
- **Google Form:** [https://forms.gle/XLfX3wi53wMpmzmD7](https://forms.gle/XLfX3wi53wMpmzmD7)
- **Google Sheet:** [https://docs.google.com/spreadsheets/d/1RYoYFAmF6FGBMWr5pvSDGgw9nJxeWBe8Yjq8kTkJG8w/edit](https://docs.google.com/spreadsheets/d/1RYoYFAmF6FGBMWr5pvSDGgw9nJxeWBe8Yjq8kTkJG8w/edit)

---

## ⚡ 3-Minute Quick Setup

### Step 1: Open Apps Script in Google Sheets
1. Open your [Google Sheet](https://docs.google.com/spreadsheets/d/1RYoYFAmF6FGBMWr5pvSDGgw9nJxeWBe8Yjq8kTkJG8w/edit).
2. In the top navigation menu, click **Extensions** ➔ **Apps Script**.

### Step 2: Paste the Automation Code
1. Delete any existing template code in the code editor (`Code.gs`).
2. Open [`google-apps-script/code.js`](./google-apps-script/code.js) from this repository, copy all the code, and paste it into the editor.
3. Click the **Save** button (💾) or press `Ctrl + S` / `Cmd + S`.

### Step 3: Enable the Automated "On Form Submit" Trigger
1. In the left sidebar of Apps Script, click the **Triggers (clock icon ⏰)**.
2. Click **+ Add Trigger** (blue button in bottom right).
3. Set the following options:
   - **Choose which function to run:** `onFormSubmit`
   - **Choose which deployment should run:** `Head`
   - **Select event source:** `From spreadsheet`
   - **Select event type:** `On form submit`
   - **Failure notification settings:** `Notify me daily`
4. Click **Save**.
5. When prompted, click **Review Permissions** ➔ Choose your Google Account ➔ Click **Advanced** ➔ Click **Go to Untitled project (unsafe)** ➔ Click **Allow**.

---

## 🧪 How to Test It:

### Option A: Send a Test Ticket to Yourself
1. Refresh your Google Sheet in the browser.
2. You will see a new custom menu in the top bar: **🎟️ HackSeries Tickets**.
3. Click **🎟️ HackSeries Tickets** ➔ **🧪 Send Test Ticket to My Email**.
4. Check your Gmail inbox — you will see your official HackSeries pass with your embedded QR code!

### Option B: Fill the Google Form
1. Open the [Google Form](https://forms.gle/XLfX3wi53wMpmzmD7) and submit a test response.
2. Within 3–5 seconds:
   - The participant receives an email with their QR code pass.
   - The Google Sheet updates automatically with `Reg_ID` (e.g. `HS-2026-8942`), `Ticket_Status` (`ISSUED`), and `Email_Sent_At` timestamp!

---

## 🚪 How Gate Check-in Works on Event Day:

1. The attendee shows up at the gate and opens the email on their phone.
2. The volunteer opens **Gate Scanner** at `http://localhost:3000/scan`.
3. Points the camera at the attendee's email QR code.
4. **Valid Entry**: The scanner displays a **Green ADMITTED Badge**, shows their Name, Team, Role, T-shirt size, and plays the audio chime!
5. **Anti-Passback Duplicate Guard**: If someone tries to re-scan or screenshot-share the email, the scanner immediately alerts with **🟡 DUPLICATE DETECTED** and shows the exact prior scan time!
