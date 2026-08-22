import { Resend } from 'resend';
import { Attendee } from './types';

// Fallback to empty string to prevent crashes, but emails won't send without the key
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');

export async function sendTicketEmail(attendee: Attendee, qrDataURL: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY is not set. Email not sent to:", attendee.email);
    return false;
  }

  // Extract base64 part of the data URL to send as attachment
  const base64Data = qrDataURL.split(',')[1];
  
  try {
    const { data, error } = await resend.emails.send({
      from: 'HackSeries <tickets@hackseries.dev>', // You should change this to a verified domain on Resend
      to: [attendee.email],
      subject: `Your HackSeries Ticket - ${attendee.fullName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hi ${attendee.fullName},</h2>
          <p>Your registration is confirmed! Here is your official entry pass.</p>
          <p>Please present the QR code below at the registration desk when you arrive.</p>
          <div style="text-align: center; margin: 30px 0;">
            <img src="cid:qr-code" alt="Your QR Ticket" style="width: 250px; border-radius: 10px;" />
          </div>
          <p><strong>Registration ID:</strong> ${attendee.regNumber}</p>
          <p><strong>Role:</strong> ${attendee.role.toUpperCase()}</p>
          <hr style="border: 1px solid #eaeaea; margin: 20px 0;" />
          <p style="font-size: 12px; color: #666;">If you have any questions, please reply to this email.</p>
        </div>
      `,
      attachments: [
        {
          filename: 'ticket-qr.png',
          content: base64Data,
          content_id: 'qr-code',
        }
      ]
    });

    if (error) {
      console.error("Resend Email Error:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Error sending email:", err);
    return false;
  }
}
