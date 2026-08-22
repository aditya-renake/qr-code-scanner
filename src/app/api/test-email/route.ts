import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const targetEmail = searchParams.get("to") || process.env.EMAIL_FROM || process.env.GMAIL_USER || process.env.SMTP_USER;

  const detectedConfig = {
    hasBrevoApiKey: !!(process.env.BREVO_API_KEY || process.env.SMTP_PASS?.startsWith("xkeysib-")),
    hasSmtpConfig: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
    smtpHost: process.env.SMTP_HOST || "none",
    smtpUser: process.env.SMTP_USER ? `${process.env.SMTP_USER.slice(0, 3)}...` : "none",
    hasGmailConfig: !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD),
    gmailUser: process.env.GMAIL_USER ? `${process.env.GMAIL_USER.slice(0, 3)}...` : "none",
    hasResendKey: !!process.env.RESEND_API_KEY,
    emailFrom: process.env.EMAIL_FROM || "default",
  };

  if (!targetEmail) {
    return NextResponse.json({
      success: false,
      message: "No recipient email provided. Call /api/test-email?to=your-email@gmail.com",
      detectedConfig,
    });
  }

  // Attempt test send
  try {
    const brevoApiKey = process.env.BREVO_API_KEY || (process.env.SMTP_PASS?.startsWith("xkeysib-") ? process.env.SMTP_PASS : null);

    if (brevoApiKey) {
      const senderEmail = process.env.EMAIL_FROM?.match(/<([^>]+)>/)?.[1] || process.env.EMAIL_FROM || process.env.SMTP_USER || "tickets@hackseries.dev";
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": brevoApiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          sender: { name: "HackSeries Test", email: senderEmail },
          to: [{ email: targetEmail, name: "Test Recipient" }],
          subject: "🧪 HackSeries Email Diagnostic Test",
          htmlContent: "<p>If you see this, your email configuration is working 100%!</p>",
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        return NextResponse.json({
          success: false,
          provider: "Brevo REST API",
          error: resData.message || JSON.stringify(resData),
          detectedConfig,
        }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        provider: "Brevo REST API",
        messageId: resData.messageId,
        sentTo: targetEmail,
        detectedConfig,
      });
    }

    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || `HackSeries <${process.env.SMTP_USER}>`,
        to: targetEmail,
        subject: "🧪 HackSeries Email Diagnostic Test (SMTP)",
        html: "<p>If you see this, your SMTP configuration is working 100%!</p>",
      });

      return NextResponse.json({
        success: true,
        provider: `SMTP (${process.env.SMTP_HOST})`,
        messageId: info.messageId,
        sentTo: targetEmail,
        detectedConfig,
      });
    }

    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });

      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || `HackSeries <${process.env.GMAIL_USER}>`,
        to: targetEmail,
        subject: "🧪 HackSeries Email Diagnostic Test (Gmail)",
        html: "<p>If you see this, your Gmail App Password configuration is working 100%!</p>",
      });

      return NextResponse.json({
        success: true,
        provider: "Gmail",
        messageId: info.messageId,
        sentTo: targetEmail,
        detectedConfig,
      });
    }

    return NextResponse.json({
      success: false,
      message: "No valid email provider credentials detected in environment variables.",
      detectedConfig,
    }, { status: 400 });

  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
      detectedConfig,
    }, { status: 500 });
  }
}
