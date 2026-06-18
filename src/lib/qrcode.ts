// QR Code generation utility
import QRCode from "qrcode";

export async function generateQRCode(data: string): Promise<string> {
  try {
    const qrDataUrl = await QRCode.toDataURL(data, {
      width: 300,
      margin: 2,
      color: {
        dark: "#1e1b4b",
        light: "#ffffff",
      },
      errorCorrectionLevel: "H",
    });
    return qrDataUrl;
  } catch (error) {
    console.error("QR Code generation error:", error);
    throw error;
  }
}

export function getStudentQRData(studentId: string, libraryId: string): string {
  return JSON.stringify({
    type: "student_attendance",
    studentId,
    libraryId,
    timestamp: Date.now(),
  });
}
