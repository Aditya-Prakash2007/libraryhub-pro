// WhatsApp Notification Service using WATI API
//
// Required .env variables:
//   WATI_API_ENDPOINT          — e.g. https://live-xxxxx.wati.io or https://app.wati.io
//   WATI_ACCESS_TOKEN          — Your WATI API Access Token
//   WATI_FEE_REMINDER_TEMPLATE — Template name approved in WATI (default: "fee_reminder")
//

// ─── Types ────────────────────────────────────────────────────────────────────

interface TextMessageParams {
  to: string;
  message: string;
}

interface WatiParameter {
  name: string;
  value: string;
}

interface WatiTemplateMessageParams {
  to: string;
  templateName: string;
  parameters: WatiParameter[];
}

interface WhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ─── WATI - Send Session Text Message ────────────────────────────────────────

export async function sendWhatsAppTextMessage({
  to,
  message,
}: TextMessageParams): Promise<WhatsAppResult> {
  const apiEndpoint = process.env.WATI_API_ENDPOINT;
  const accessToken = process.env.WATI_ACCESS_TOKEN;

  if (!apiEndpoint || !accessToken) {
    console.warn("[WATI] API credentials not set — skipping text message");
    return { success: false, error: "WATI API credentials not configured" };
  }

  const cleanTo = to.replace(/\D/g, "");

  try {
    const body = new URLSearchParams();
    body.append("messageText", message);

    const res = await fetch(`${apiEndpoint}/api/v1/sendSessionMessage/${cleanTo}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    let data;
    const rawText = await res.text();
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      data = { raw: rawText };
    }

    if (!res.ok) {
      console.error("[WATI] Text API error:", data);
      return { success: false, error: JSON.stringify(data) };
    }

    const messageId = data?.messageId || data?.id;
    console.log(`[WATI] Session message sent to ${cleanTo} — ID: ${messageId}`);
    return { success: true, messageId };
  } catch (error) {
    console.error("[WATI] Network error:", error);
    return { success: false, error: String(error) };
  }
}

// ─── WATI - Send Template Message ─────────────────────────────────────────────

export async function sendWhatsAppTemplate({
  to,
  templateName,
  parameters,
}: WatiTemplateMessageParams): Promise<WhatsAppResult> {
  const apiEndpoint = process.env.WATI_API_ENDPOINT;
  const accessToken = process.env.WATI_ACCESS_TOKEN;

  if (!apiEndpoint || !accessToken) {
    console.warn("[WATI] API credentials not set — skipping template send");
    return { success: false, error: "WATI API credentials not configured" };
  }

  const cleanTo = to.replace(/\D/g, "");

  const payload = {
    template_name: templateName,
    broadcast_name: "Fee Reminder",
    parameters,
  };

  try {
    const res = await fetch(`${apiEndpoint}/api/v1/sendTemplateMessage?whatsappNumber=${cleanTo}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    let data;
    const rawText = await res.text();
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      data = { raw: rawText };
    }

    if (!res.ok) {
      console.error(`[WATI] Template "${templateName}" API error:`, data);
      return { success: false, error: JSON.stringify(data) };
    }

    const messageId = data?.messageId || data?.id;
    console.log(
      `[WATI] Template "${templateName}" sent to ${cleanTo} — ID: ${messageId}`
    );
    return { success: true, messageId };
  } catch (error) {
    console.error("[WATI] Network error:", error);
    return { success: false, error: String(error) };
  }
}

// ─── Pre-built Message Functions ──────────────────────────────────────────────

/**
 * Send a welcome WhatsApp message to a newly registered student.
 */
export async function sendWelcomeWhatsApp(
  to: string,
  name: string,
  libraryName: string
): Promise<WhatsAppResult> {
  const message =
    `🎉 *Welcome to ${libraryName}!* 🎉\n\n` +
    `Hi ${name}, aapka library account successfully create ho gaya hai.\n\n` +
    `Aap apna student dashboard dekh sakte hain — seat, attendance aur fee details ke liye.\n\n` +
    `Thank you for joining ${libraryName}! 📚`;

  return sendWhatsAppTextMessage({ to, message });
}

/**
 * Send a fee payment reminder via WhatsApp Template Message.
 */
export async function sendFeeReminderWhatsApp(
  to: string,
  name: string,
  libraryName: string,
  daysLeft: number,
  amount: number,
  dueDate: string
): Promise<WhatsAppResult> {
  const templateName =
    process.env.WATI_FEE_REMINDER_TEMPLATE || "fee_reminder";

  // WATI supports parameters either as custom variables or positional keys
  const parameters = [
    { name: "name", value: name },
    { name: "days", value: String(daysLeft) },
    { name: "date", value: dueDate },
    { name: "amount", value: amount.toLocaleString("en-IN") },
    { name: "library", value: libraryName },
    // Also include numeric ones in case they are named 1, 2, 3...
    { name: "1", value: name },
    { name: "2", value: String(daysLeft) },
    { name: "3", value: dueDate },
    { name: "4", value: amount.toLocaleString("en-IN") },
    { name: "5", value: libraryName },
  ];

  return sendWhatsAppTemplate({
    to,
    templateName,
    parameters,
  });
}

/**
 * Send a payment confirmation WhatsApp message after successful payment.
 */
export async function sendPaymentConfirmationWhatsApp(
  to: string,
  name: string,
  libraryName: string,
  amount: number,
  invoiceNumber: string
): Promise<WhatsAppResult> {
  const message =
    `✅ *Payment Successful!*\n\n` +
    `Hi ${name},\n` +
    `Aapka payment *${libraryName}* par successfully received ho gaya.\n\n` +
    `*Amount Paid:* ₹${amount.toLocaleString("en-IN")}\n` +
    `*Invoice:* ${invoiceNumber}\n\n` +
    `Aapki membership renew ho gayi hai. Padhai jari rakhein! 📚\n\n` +
    `Thank you,\n${libraryName}`;

  return sendWhatsAppTextMessage({ to, message });
}

// ─── Legacy export (backwards compatibility) ──────────────────────────────────

/** @deprecated Use sendWhatsAppTextMessage instead */
export async function sendWhatsAppMessage({
  to,
  message,
}: TextMessageParams): Promise<{ success: boolean; error?: string }> {
  return sendWhatsAppTextMessage({ to, message });
}
