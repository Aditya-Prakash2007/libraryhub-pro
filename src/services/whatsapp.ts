// WhatsApp Notification Service using Meta WhatsApp Business Cloud API
// Compatible with Wap2b (official BSP) — uses standard Meta Graph API
//
// Required .env variables:
//   WHATSAPP_PHONE_NUMBER_ID   — From Meta Business Manager / Wap2b Dashboard
//   WHATSAPP_ACCESS_TOKEN      — Permanent System User Access Token
//   WHATSAPP_FEE_REMINDER_TEMPLATE — Template name approved in Meta (default: "fee_reminder")
//   WHATSAPP_TEMPLATE_LANGUAGE — Language code (default: "en")
//
// IMPORTANT: For production (outbound messages outside 24h window), Meta requires
// pre-approved TEMPLATE messages. Get your template approved in:
// Meta Business Manager → WhatsApp Manager → Message Templates

const BASE_URL = "https://graph.facebook.com/v19.0";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TextMessageParams {
  to: string;
  message: string;
}

interface TemplateComponent {
  type: "header" | "body" | "button";
  parameters: Array<{ type: "text"; text: string }>;
  sub_type?: string;
  index?: string;
}

interface TemplateMessageParams {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: TemplateComponent[];
}

interface WhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ─── Core Sender — Text Message (Testing / Sandbox only) ─────────────────────

export async function sendWhatsAppTextMessage({
  to,
  message,
}: TextMessageParams): Promise<WhatsAppResult> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    console.warn("[WhatsApp] API credentials not set — skipping text message");
    return { success: false, error: "WhatsApp API credentials not configured" };
  }

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
    const res = await fetch(`${BASE_URL}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("[WhatsApp] Text API error:", data);
      return { success: false, error: JSON.stringify(data) };
    }

    const messageId = data?.messages?.[0]?.id;
    console.log(`[WhatsApp] Text message sent to ${cleanTo} — ID: ${messageId}`);
    return { success: true, messageId };
  } catch (error) {
    console.error("[WhatsApp] Network error:", error);
    return { success: false, error: String(error) };
  }
}

// ─── Core Sender — Template Message (Production) ──────────────────────────────

export async function sendWhatsAppTemplate({
  to,
  templateName,
  languageCode,
  components,
}: TemplateMessageParams): Promise<WhatsAppResult> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const defaultLang = process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en";

  if (!phoneNumberId || !accessToken) {
    console.warn("[WhatsApp] API credentials not set — skipping template send");
    return { success: false, error: "WhatsApp API credentials not configured" };
  }

  const cleanTo = to.replace(/\D/g, "");

  const payload: Record<string, unknown> = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: cleanTo,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: languageCode || defaultLang,
      },
      ...(components && components.length > 0 && { components }),
    },
  };

  try {
    const res = await fetch(`${BASE_URL}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error(`[WhatsApp] Template "${templateName}" API error:`, data);
      return { success: false, error: JSON.stringify(data) };
    }

    const messageId = data?.messages?.[0]?.id;
    console.log(
      `[WhatsApp] Template "${templateName}" sent to ${cleanTo} — ID: ${messageId}`
    );
    return { success: true, messageId };
  } catch (error) {
    console.error("[WhatsApp] Network error:", error);
    return { success: false, error: String(error) };
  }
}

// ─── Pre-built Message Functions ──────────────────────────────────────────────

/**
 * Send a welcome WhatsApp message to a newly registered student.
 * Uses text message (within 24h window after student opts in).
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
 *
 * Template "fee_reminder" must be approved in Meta Business Manager.
 * Template body variables (in order):
 *   {{1}} = student name
 *   {{2}} = days remaining (e.g. "7")
 *   {{3}} = due date string (e.g. "15 July 2025")
 *   {{4}} = amount (e.g. "1500")
 *   {{5}} = library name
 *
 * Example approved template body:
 *   Hi {{1}}, your library fee at *{{5}}* is due in *{{2}} days* on {{3}}.
 *   💰 Amount: ₹{{4}}. Please pay on time to continue your membership. 🙏
 *
 * If template is not configured, falls back to a text message (for development).
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
    process.env.WHATSAPP_FEE_REMINDER_TEMPLATE || "fee_reminder";

  // ── Template message (Production) ────────────────────────────────────────
  // Uses pre-approved Meta template with variable substitution
  const result = await sendWhatsAppTemplate({
    to,
    templateName,
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: name },                          // {{1}} name
          { type: "text", text: String(daysLeft) },             // {{2}} days
          { type: "text", text: dueDate },                      // {{3}} due date
          { type: "text", text: amount.toLocaleString("en-IN") }, // {{4}} amount
          { type: "text", text: libraryName },                  // {{5}} library
        ],
      },
    ],
  });

  // ── Fallback to text message (Development / if template not set up) ───────
  // Remove this block once your template is approved in Meta
  if (!result.success && result.error?.includes("credentials not configured")) {
    const isOverdue = daysLeft < 0;
    const urgencyEmoji = daysLeft <= 1 ? "🚨" : daysLeft <= 3 ? "⚠️" : "📅";
    const urgencyText = isOverdue
      ? "⚠️ *FEE OVERDUE*"
      : daysLeft === 0
      ? "⏰ *FEE DUE TODAY*"
      : `${urgencyEmoji} *FEE DUE IN ${daysLeft} DAY${daysLeft === 1 ? "" : "S"}*`;

    const fallbackMessage =
      `${urgencyText}\n\n` +
      `Hi ${name},\n` +
      `Aapki library membership fee at *${libraryName}* ` +
      `${isOverdue ? "overdue hai" : `*${dueDate}* ko due hai`}.\n\n` +
      `*Amount Due:* ₹${amount.toLocaleString("en-IN")}\n\n` +
      `Kripya apna payment jaldi complete karein — student dashboard ya front desk par.\n\n` +
      `Thank you,\n${libraryName}`;

    return sendWhatsAppTextMessage({ to, message: fallbackMessage });
  }

  return result;
}

/**
 * Send a payment confirmation WhatsApp message after successful payment.
 * This is within context of a user action, so text message is fine.
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
