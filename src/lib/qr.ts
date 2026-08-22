import QRCode from "qrcode";

export async function generateQRCodeDataURL(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: "H", // High redundancy for quick camera scans
      margin: 2,
      width: 400,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });
  } catch (err) {
    console.error("QR Code generation error:", err);
    throw err;
  }
}
