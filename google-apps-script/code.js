/**
 * ==============================================================================
 * HACKSERIES 2026 — AUTOMATED QR TICKET & EMAIL ISSUER (GOOGLE APPS SCRIPT)
 * ==============================================================================
 * 
 * Instructions:
 * 1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1RYoYFAmF6FGBMWr5pvSDGgw9nJxeWBe8Yjq8kTkJG8w/edit
 * 2. Click "Extensions" -> "Apps Script".
 * 3. Paste this code into Code.gs and click Save (💾).
 * 4. Ensure you have the Trigger configured:
 *    - Function: onFormSubmit
 *    - Event Source: From spreadsheet
 *    - Event Type: On form submit
 */

var CONFIG = {
  EVENT_NAME: "HackSeries 2026",
  EVENT_CODE: "hackseries-2026",
  EVENT_DATES: "October 24 - 25, 2026",
  EVENT_VENUE: "Main Innovation Auditorium & Arena, Campus Hub",
  HMAC_SECRET: "hackseries_secure_hmac_secret_2026_super_key",
  ORGANIZER_EMAIL: "hackseries.team@gmail.com"
};

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("🎟️ HackSeries Tickets")
    .addItem("🚀 Send Tickets to All Unsent Submissions", "processAllUnsentRows")
    .addItem("🧪 Send Test Ticket to My Email", "sendTestTicket")
    .addToUi();
}

function onFormSubmit(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var row = e ? e.range.getRow() : sheet.getLastRow();
    processRow(sheet, row);
  } catch (err) {
    Logger.log("Error in onFormSubmit: " + err.toString());
  }
}

function processAllUnsentRows() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    SpreadsheetApp.getUi().alert("No submissions found yet in the sheet.");
    return;
  }
  var headers = data[0];
  
  var statusColIndex = findColumnIndex(headers, ["Ticket_Status", "Status", "Ticket Status"]);
  if (statusColIndex === -1) {
    statusColIndex = headers.length;
    sheet.getRange(1, statusColIndex + 1).setValue("Ticket_Status");
  }

  var processedCount = 0;
  for (var i = 1; i < data.length; i++) {
    var rowNum = i + 1;
    var status = data[i][statusColIndex];
    if (!status || status.toString().trim() === "") {
      processRow(sheet, rowNum);
      processedCount++;
    }
  }

  SpreadsheetApp.getUi().alert("Successfully issued & sent " + processedCount + " QR Ticket Pass(es) via email!");
}

function processRow(sheet, rowNum) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var rowValues = sheet.getRange(rowNum, 1, 1, sheet.getLastColumn()).getValues()[0];

  function getVal(aliases, defaultVal) {
    var idx = findColumnIndex(headers, aliases);
    if (idx !== -1 && rowValues[idx] !== undefined && rowValues[idx] !== "") {
      return rowValues[idx].toString().trim();
    }
    return defaultVal || "";
  }

  var email = getVal(["Email", "Email Address", "Your Email", "Email ID"]);
  // Fallback: search row values for an email pattern if header name did not match
  if (!email || email.indexOf("@") === -1) {
    for (var col = 0; col < rowValues.length; col++) {
      var val = rowValues[col] ? rowValues[col].toString().trim() : "";
      if (val.indexOf("@") !== -1 && val.indexOf(".") !== -1) {
        email = val;
        break;
      }
    }
  }

  var fullName = getVal(["Name", "Full Name", "Participant Name", "Your Name", "Name-"], "Participant");
  var phone = getVal(["Phone", "Phone Number", "Mobile", "WhatsApp", "Contact"], "+91 00000 00000");
  var college = getVal(["College", "University", "Institution", "College / Organization"], "Independent Developer");
  var teamName = getVal(["Team", "Team Name", "Name of Team"], "Solo Innovator");
  var role = getVal(["Role", "Participant Role", "Category"], "hacker").toLowerCase();
  var track = getVal(["Track", "Theme", "Domain", "Category Track"], "AI & Machine Learning");
  var tShirtSize = getVal(["T-Shirt Size", "Tshirt Size", "Shirt Size", "Size"], "L");
  var dietaryPreference = getVal(["Diet", "Dietary", "Food Preference", "Meal Preference"], "Vegetarian");

  if (!email || email.indexOf("@") === -1) {
    Logger.log("Skipping row " + rowNum + ": Invalid or missing email address");
    return;
  }

  var randomNum = Math.floor(1000 + Math.random() * 9000);
  var regNumber = "HS-2026-" + randomNum;
  var attendeeId = "att_gas_" + Utilities.getUuid().substring(0, 8);
  var ts = Math.floor(new Date().getTime() / 1000);

  var sig = computeHmacSignature(regNumber, attendeeId, CONFIG.EVENT_CODE, role, ts, CONFIG.HMAC_SECRET);

  var qrPayload = {
    v: 1,
    id: regNumber,
    aid: attendeeId,
    ev: CONFIG.EVENT_CODE,
    role: role,
    name: fullName,
    ts: ts,
    sig: sig
  };
  var qrPayloadString = JSON.stringify(qrPayload);

  var qrUrl = "https://quickchart.io/qr?text=" + encodeURIComponent(qrPayloadString) + "&size=450&ecLevel=H&margin=2";
  var qrBlob;
  try {
    var response = UrlFetchApp.fetch(qrUrl);
    qrBlob = response.getBlob().setName("HackSeries_Pass_" + regNumber + ".png");
  } catch (err) {
    var fallbackUrl = "https://api.qrserver.com/v1/create-qr-code/?size=450x450&ecc=H&data=" + encodeURIComponent(qrPayloadString);
    qrBlob = UrlFetchApp.fetch(fallbackUrl).getBlob().setName("HackSeries_Pass_" + regNumber + ".png");
  }

  sendTicketEmail({
    email: email,
    fullName: fullName,
    regNumber: regNumber,
    role: role,
    teamName: teamName,
    track: track,
    college: college,
    tShirtSize: tShirtSize,
    dietaryPreference: dietaryPreference,
    qrBlob: qrBlob,
    qrPayloadString: qrPayloadString
  });

  setColumnValue(sheet, rowNum, headers, "Reg_ID", regNumber);
  setColumnValue(sheet, rowNum, headers, "Ticket_Status", "ISSUED");
  setColumnValue(sheet, rowNum, headers, "Email_Sent_At", new Date().toLocaleString());
  setColumnValue(sheet, rowNum, headers, "QR_Payload", qrPayloadString);
}

function computeHmacSignature(id, aid, ev, role, ts, secret) {
  var data = id + "|" + aid + "|" + ev + "|" + role + "|" + ts;
  var byteSignature = Utilities.computeHmacSha256Signature(data, secret);
  var hex = byteSignature.map(function(byte) {
    var b = (byte < 0 ? byte + 256 : byte).toString(16);
    return (b.length == 1 ? "0" : "") + b;
  }).join("");
  return hex.substring(0, 32);
}

function sendTicketEmail(info) {
  var subject = "🎟️ Your Official HackSeries 2026 Entry Pass [" + info.regNumber + "]";

  var htmlBody = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0; padding:0; background-color:#090a10; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#f1f5f9;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#090a10; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background: #12141f; border: 1px solid #232738; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%); padding: 24px; text-align: center;">
              <div style="color: #041f17; font-size: 11px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;">OFFICIAL EVENT PASS</div>
              <div style="color: #041f17; font-size: 28px; font-weight: 900; letter-spacing: -0.5px; margin-top: 4px;">HACKSERIES 2026</div>
              <div style="color: #064e3b; font-size: 13px; font-weight: 600; margin-top: 2px;">` + CONFIG.EVENT_DATES + `</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px;">
              <p style="font-size: 16px; margin: 0 0 16px 0; color: #f8fafc; font-weight: 600;">
                Hey ` + info.fullName + ` 👋,
              </p>
              <p style="font-size: 13px; line-height: 1.6; color: #94a3b8; margin: 0 0 24px 0;">
                Your registration for <strong>HackSeries 2026</strong> is confirmed! Below is your cryptographically signed event pass and QR code. Please present this QR code on your mobile device at the main entrance gate for instant badge pickup and meal check-ins.
              </p>
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background: #ffffff; border-radius: 18px; padding: 20px; text-align: center; margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <img src="cid:qrImage" width="220" height="220" style="display: block; margin: 0 auto; border-radius: 8px;" alt="HackSeries QR Code" />
                    <div style="color: #0f172a; font-family: monospace; font-size: 13px; font-weight: 800; margin-top: 12px; letter-spacing: 1px;">PASS ID: ` + info.regNumber + `</div>
                    <div style="color: #64748b; font-family: monospace; font-size: 10px; margin-top: 2px;">HMAC-SHA256 TAMPER PROTECTED • SINGLE USE ENTRY</div>
                  </td>
                </tr>
              </table>
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background: #090a10; border: 1px solid #1e293b; border-radius: 16px; padding: 16px; margin-bottom: 24px; font-size: 12px;">
                <tr>
                  <td style="color: #64748b; padding: 6px 0; width: 40%;">Participant:</td>
                  <td style="color: #f8fafc; font-weight: 700; padding: 6px 0;">` + info.fullName + `</td>
                </tr>
                <tr>
                  <td style="color: #64748b; padding: 6px 0;">Role / Category:</td>
                  <td style="color: #10b981; font-weight: 700; text-transform: uppercase; padding: 6px 0;">` + info.role + `</td>
                </tr>
                <tr>
                  <td style="color: #64748b; padding: 6px 0;">Team Name:</td>
                  <td style="color: #f8fafc; font-weight: 600; padding: 6px 0;">` + info.teamName + `</td>
                </tr>
                <tr>
                  <td style="color: #64748b; padding: 6px 0;">Innovation Track:</td>
                  <td style="color: #06b6d4; font-weight: 600; padding: 6px 0;">` + info.track + `</td>
                </tr>
                <tr>
                  <td style="color: #64748b; padding: 6px 0;">College / Org:</td>
                  <td style="color: #f8fafc; padding: 6px 0;">` + info.college + `</td>
                </tr>
                <tr>
                  <td style="color: #64748b; padding: 6px 0;">Perks Included:</td>
                  <td style="color: #f8fafc; padding: 6px 0;">Swag Kit (` + info.tShirtSize + `) • ` + info.dietaryPreference + ` Meals</td>
                </tr>
              </table>
              <div style="background: #0f172a; border-left: 4px solid #10b981; padding: 12px 16px; border-radius: 8px; font-size: 11px; color: #94a3b8; line-height: 1.5; margin-bottom: 24px;">
                📍 <strong>Venue:</strong> ` + CONFIG.EVENT_VENUE + `<br/>
                ⚠️ <strong>Important:</strong> Do not share this QR code. It is tied to your registration and can only be scanned once at the entrance gate.
              </div>
              <p style="font-size: 12px; color: #64748b; margin: 0; text-align: center;">
                Questions? Reach out to ` + CONFIG.ORGANIZER_EMAIL + `
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  MailApp.sendEmail({
    to: info.email,
    subject: subject,
    htmlBody: htmlBody,
    inlineImages: {
      qrImage: info.qrBlob
    },
    attachments: [info.qrBlob]
  });
}

function sendTestTicket() {
  var myEmail = Session.getActiveUser().getEmail();
  if (!myEmail) {
    SpreadsheetApp.getUi().alert("Could not detect active email. Please run from your Google Account.");
    return;
  }

  var regNumber = "HS-2026-TEST";
  var attendeeId = "att_test_" + Math.floor(Math.random() * 10000);
  var ts = Math.floor(new Date().getTime() / 1000);
  var sig = computeHmacSignature(regNumber, attendeeId, CONFIG.EVENT_CODE, "hacker", ts, CONFIG.HMAC_SECRET);

  var qrPayload = {
    v: 1,
    id: regNumber,
    aid: attendeeId,
    ev: CONFIG.EVENT_CODE,
    role: "hacker",
    name: "Aditya Renake (Test)",
    ts: ts,
    sig: sig
  };
  var qrPayloadString = JSON.stringify(qrPayload);

  var qrUrl = "https://quickchart.io/qr?text=" + encodeURIComponent(qrPayloadString) + "&size=450&ecLevel=H&margin=2";
  var qrBlob = UrlFetchApp.fetch(qrUrl).getBlob().setName("HackSeries_Pass_Test.png");

  sendTicketEmail({
    email: myEmail,
    fullName: "Aditya Renake (Test Pass)",
    regNumber: regNumber,
    role: "hacker",
    teamName: "Team NeuralForge",
    track: "AI & Machine Learning",
    college: "IIT Bombay",
    tShirtSize: "L",
    dietaryPreference: "Vegetarian",
    qrBlob: qrBlob,
    qrPayloadString: qrPayloadString
  });

  SpreadsheetApp.getUi().alert("Test QR ticket email sent to: " + myEmail + "\nCheck your inbox!");
}

function findColumnIndex(headers, possibleNames) {
  for (var i = 0; i < headers.length; i++) {
    var h = headers[i].toString().trim().toLowerCase().replace(/[-_:]/g, " ").replace(/\s+/g, " ");
    for (var j = 0; j < possibleNames.length; j++) {
      var target = possibleNames[j].toLowerCase().replace(/[-_:]/g, " ").replace(/\s+/g, " ");
      if (h === target || h.indexOf(target) !== -1 || target.indexOf(h) !== -1) {
        return i;
      }
    }
  }
  return -1;
}

function setColumnValue(sheet, rowNum, headers, colName, value) {
  var colIdx = findColumnIndex(headers, [colName]);
  if (colIdx === -1) {
    colIdx = sheet.getLastColumn();
    sheet.getRange(1, colIdx + 1).setValue(colName);
  }
  sheet.getRange(rowNum, colIdx + 1).setValue(value);
}
