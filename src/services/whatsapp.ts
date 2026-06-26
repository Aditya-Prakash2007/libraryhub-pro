// WhatsApp Notification Service using Meta Cloud API
// Requires: WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in .env

interface SendWhatsAppParams {
  to: string; // Phone number with country code (e.g., 919876543210)
  message: string;
}

export async function sendWhatsAppMessage({ to, message }: SendWhatsAppParams): Promise<{ success: boolean; error?: string }> {
  const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) {
    console.warn("[WhatsApp] API credentials not set — skipping message send");
    return { success: false, error: "WhatsApp API credentials not configured" };
  }

  // Ensure the phone number has no plus sign or spaces
  const cleanTo = to.replace(/\D/g, "");

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: cleanTo,
    type: "text",
    text: {
      preview_url: false,
      body: message,
    },
  };

  try {
    const res = await fetch(`https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await res.text();

    if (!res.ok) {
      console.error(`[WhatsApp] API error ${res.status}:`, responseText);
      return { success: false, error: responseText };
    }

    console.log(`[WhatsApp] Message sent successfully to ${cleanTo}`);
    return { success: true };
  } catch (error) {
    console.error("[WhatsApp] Network error:", error);
    return { success: false, error: String(error) };
  }
}

// ─── Pre-formatted Message Templates ──────────────────────────────────────

export async function sendWelcomeWhatsApp(
  to: string,
  name: string,
  libraryName: string
) {
  const message = `🎉 *Welcome to ${libraryName}!* 🎉\n\nHi ${name}, your library account has been created successfully.\n\nYou can now log in to your student dashboard to view your seat, attendance, and fee details.\n\nThank you for choosing ${libraryName}!`;
  
  return sendWhatsAppMessage({ to, message });
}

export async function sendFeeReminderWhatsApp(
  to: string,
  name: string,
  libraryName: string,
  daysLeft: number,
  amount: number,
  dueDate: string
) {
  const isOverdue = daysLeft < 0;
  const urgencyText = isOverdue
    ? "⚠️ *FEE OVERDUE*"
    : daysLeft === 0
    ? "⏰ *FEE DUE TODAY*"
    : `📅 *FEE DUE IN ${daysLeft} DAY${daysLeft === 1 ? "" : "S"}*`;

  const message = `${urgencyText}\n\nHi ${name},\nYour library membership fee at *${libraryName}* ${isOverdue ? "is overdue" : `is due on *${dueDate}*`}.\n\n*Amount Due:* ₹${amount.toLocaleString("en-IN")}\n\nPlease complete your payment as soon as possible via your student dashboard or at the front desk.\n\nThank you,\n${libraryName}`;

  return sendWhatsAppMessage({ to, message });
}
