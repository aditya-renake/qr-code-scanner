import nodemailer from "nodemailer";
import QRCode from "qrcode";
import { Attendee } from "./types";

interface SendTicketEmailParams {
  attendee: Attendee;
  qrPayloadString: string;
}

export async function sendTicketEmail(params: SendTicketEmailParams): Promise<{ success: boolean; messageId?: string; previewUrl?: string | false; error?: string }> {
  const { attendee, qrPayloadString } = params;

  try {
    const qrBuffer = await QRCode.toBuffer(qrPayloadString, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 400,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });

    // Direct Brevo REST API Support (works with xkeysib- API keys)
    const brevoApiKey = process.env.BREVO_API_KEY || (process.env.SMTP_PASS?.startsWith("xkeysib-") ? process.env.SMTP_PASS : null);
    if (brevoApiKey) {
      const senderEmail = process.env.EMAIL_FROM?.match(/<([^>]+)>/)?.[1] || process.env.EMAIL_FROM || process.env.SMTP_USER || "tickets@hackseries.dev";
      const senderName = process.env.EMAIL_FROM?.split("<")[0]?.trim() || "HackSeries Team";

      const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": brevoApiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: attendee.email, name: attendee.fullName }],
          subject: `🎟️ Your Official HackSeries 2026 Entry Pass [${attendee.regNumber}]`,
          htmlContent: html,
          attachment: [
            {
              name: `HackSeries_Pass_${attendee.regNumber}.png`,
              content: qrBuffer.toString("base64"),
            },
          ],
        }),
      });

      const resData = await brevoRes.json();
      if (!brevoRes.ok) {
        throw new Error(`Brevo Error: ${resData.message || JSON.stringify(resData)}`);
      }

      return {
        success: true,
        messageId: resData.messageId,
      };
    }

    let transporter: nodemailer.Transporter;

    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else if (process.env.RESEND_API_KEY) {
      transporter = nodemailer.createTransport({
        host: "smtp.resend.com",
        port: 465,
        secure: true,
        auth: {
          user: "resend",
          pass: process.env.RESEND_API_KEY,
        },
      });
    } else if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });
    } else {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    const eventName = "HackSeries 2026";
    const eventDates = "October 24 - 25, 2026";
    const eventVenue = "Main Innovation Auditorium & Arena, Campus Hub";
    const fromSender = process.env.EMAIL_FROM || (process.env.RESEND_API_KEY ? "HackSeries Pass <onboarding@resend.dev>" : "HackSeries 2026 Team <no-reply@hackseries.dev>");

    const html = `<!DOCTYPE html>
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
              <div style="color: #041f17; font-size: 28px; font-weight: 900; letter-spacing: -0.5px; margin-top: 4px;">${eventName}</div>
              <div style="color: #064e3b; font-size: 13px; font-weight: 600; margin-top: 2px;">${eventDates}</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px;">
              <p style="font-size: 16px; margin: 0 0 16px 0; color: #f8fafc; font-weight: 600;">
                Hey ${attendee.fullName} 👋,
              </p>
              <p style="font-size: 13px; line-height: 1.6; color: #94a3b8; margin: 0 0 24px 0;">
                Your registration for <strong>${eventName}</strong> is confirmed! Below is your cryptographically signed event pass and QR code. Please present this QR code on your mobile device at the main entrance gate for instant badge pickup and meal check-ins.
              </p>
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background: #ffffff; border-radius: 18px; padding: 20px; text-align: center; margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <img src="cid:qrImage" width="220" height="220" style="display: block; margin: 0 auto; border-radius: 8px;" alt="HackSeries QR Code" />
                    <div style="color: #0f172a; font-family: monospace; font-size: 13px; font-weight: 800; margin-top: 12px; letter-spacing: 1px;">PASS ID: ${attendee.regNumber}</div>
                    <div style="color: #64748b; font-family: monospace; font-size: 10px; margin-top: 2px;">HMAC-SHA256 TAMPER PROTECTED • SINGLE USE ENTRY</div>
                  </td>
                </tr>
              </table>
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background: #090a10; border: 1px solid #1e293b; border-radius: 16px; padding: 16px; margin-bottom: 24px; font-size: 12px;">
                <tr>
                  <td style="color: #64748b; padding: 6px 0; width: 40%;">Participant:</td>
                  <td style="color: #f8fafc; font-weight: 700; padding: 6px 0;">${attendee.fullName}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; padding: 6px 0;">Role / Category:</td>
                  <td style="color: #10b981; font-weight: 700; text-transform: uppercase; padding: 6px 0;">${attendee.role}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; padding: 6px 0;">Team Name:</td>
                  <td style="color: #f8fafc; font-weight: 600; padding: 6px 0;">${attendee.teamName}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; padding: 6px 0;">Innovation Track:</td>
                  <td style="color: #06b6d4; font-weight: 600; padding: 6px 0;">${attendee.track}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; padding: 6px 0;">College / Org:</td>
                  <td style="color: #f8fafc; padding: 6px 0;">${attendee.college}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; padding: 6px 0;">Perks Included:</td>
                  <td style="color: #f8fafc; padding: 6px 0;">Swag Kit (${attendee.tShirtSize}) • ${attendee.dietaryPreference} Meals</td>
                </tr>
              </table>
              <div style="background: #0f172a; border-left: 4px solid #10b981; padding: 12px 16px; border-radius: 8px; font-size: 11px; color: #94a3b8; line-height: 1.5; margin-bottom: 24px;">
                📍 <strong>Venue:</strong> ${eventVenue}<br/>
                ⚠️ <strong>Important:</strong> Do not share this QR code. It is tied to your registration and can only be scanned once at the entrance gate.
              </div>
              <p style="font-size: 12px; color: #64748b; margin: 0; text-align: center;">
                Questions? Reach out to the organizing committee.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const info = await transporter.sendMail({
      from: fromSender,
      to: attendee.email,
      subject: `🎟️ Your Official HackSeries 2026 Entry Pass [${attendee.regNumber}]`,
      html,
      attachments: [
        {
          filename: `HackSeries_Pass_${attendee.regNumber}.png`,
          content: qrBuffer,
          cid: "qrImage",
        },
        {
          filename: `HackSeries_Pass_${attendee.regNumber}.png`,
          content: qrBuffer,
        },
      ],
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    return {
      success: true,
      messageId: info.messageId,
      previewUrl,
    };
  } catch (err: any) {
    console.error("Failed to send email:", err);
    return {
      success: false,
      error: err.message || "Email delivery failed",
    };
  }
}
