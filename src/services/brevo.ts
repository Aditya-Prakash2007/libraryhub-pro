// Brevo (formerly Sendinblue) Email Service
// Replaces Resend/SMTP completely

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface SendEmailParams {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
}

// Core Brevo API call — reads env vars at call time (not module load time)
async function sendBrevoEmail(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || "adityaprakash91111@gmail.com";
  const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME || "LibraryHub Pro";

  if (!BREVO_API_KEY) {
    console.warn("[Brevo] BREVO_API_KEY not set — skipping email send");
    return { success: false, error: "BREVO_API_KEY not configured" };
  }

  const payload = {
    sender: { name: BREVO_SENDER_NAME, email: BREVO_SENDER_EMAIL },
    to: [{ email: params.to, name: params.toName || params.to }],
    subject: params.subject,
    htmlContent: params.html,
    ...(params.text && { textContent: params.text }),
  };

  console.log(`[Brevo] Sending "${params.subject}" to ${params.to}`);

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await res.text();

    if (!res.ok) {
      console.error(`[Brevo] API error ${res.status}:`, responseText);
      return { success: false, error: responseText };
    }

    console.log(`[Brevo] Email sent successfully to ${params.to}. Response:`, responseText);
    return { success: true };
  } catch (error) {
    console.error("[Brevo] Network error:", error);
    return { success: false, error: String(error) };
  }
}

// Shared HTML wrapper
function emailWrapper(content: string, accentColor = "#6366f1"): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>LibraryHub Pro</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f8;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,${accentColor},#8b5cf6);padding:32px 40px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;letter-spacing:-0.5px;">LibraryHub Pro</h1>
            <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;">Modern Library Management Platform</p>
          </td>
        </tr>
        <!-- Body -->
        <tr><td style="padding:36px 40px;">${content}</td></tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9f9fb;padding:20px 40px;text-align:center;border-top:1px solid #ebebf0;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">© ${new Date().getFullYear()} LibraryHub Pro. All rights reserved.</p>
            <p style="margin:4px 0 0;color:#9ca3af;font-size:12px;">This is an automated email. Please do not reply.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Welcome Email ─────────────────────────────────────────────────────────
export async function sendWelcomeEmail(
  to: string,
  name: string,
  libraryName: string,
  verifyToken?: string
) {
  const verifyUrl = verifyToken ? `${APP_URL}/verify-email?token=${verifyToken}` : null;

  const html = emailWrapper(`
    <h2 style="color:#111827;margin:0 0 8px;font-size:22px;font-weight:700;">Welcome to ${libraryName}! 🎉</h2>
    <p style="color:#6b7280;font-size:15px;line-height:1.7;margin:0 0 20px;">Hi <strong>${name}</strong>, your library account has been created successfully.</p>
    ${verifyUrl ? `
    <div style="text-align:center;margin:28px 0;">
      <a href="${verifyUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;">Verify Email Address</a>
    </div>
    <p style="color:#9ca3af;font-size:13px;text-align:center;">Link expires in 24 hours.</p>
    ` : `
    <p style="color:#6b7280;font-size:14px;">You can now log in to your student dashboard to view your seat, attendance, and fee details.</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${APP_URL}/login" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;">Go to Dashboard</a>
    </div>
    `}
  `);

  return sendBrevoEmail({
    to,
    toName: name,
    subject: `Welcome to ${libraryName} — LibraryHub Pro`,
    html,
  });
}

// ─── Password Reset OTP ────────────────────────────────────────────────────
export async function sendPasswordResetOTP(to: string, name: string, otp: string) {
  const html = emailWrapper(`
    <h2 style="color:#111827;margin:0 0 8px;font-size:22px;font-weight:700;">Reset Your Password</h2>
    <p style="color:#6b7280;font-size:15px;line-height:1.7;margin:0 0 24px;">Hi <strong>${name}</strong>, use the OTP below to reset your password. It expires in <strong>10 minutes</strong>.</p>
    <div style="background:#f0f0ff;border:2px dashed #6366f1;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
      <p style="color:#6b7280;font-size:13px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">Your OTP</p>
      <p style="color:#6366f1;font-size:42px;font-weight:800;margin:0;letter-spacing:12px;">${otp}</p>
    </div>
    <p style="color:#9ca3af;font-size:13px;text-align:center;">If you didn't request this, please ignore this email. Your account is safe.</p>
  `);

  return sendBrevoEmail({
    to,
    toName: name,
    subject: "Password Reset OTP — LibraryHub Pro",
    html,
  });
}

// ─── Delete Worker OTP ──────────────────────────────────────────────────────
export async function sendDeleteWorkerOTPEmail(
  to: string,
  name: string,
  workerName: string,
  otp: string
) {
  const html = emailWrapper(`
    <h2 style="color:#ef4444;margin:0 0 8px;font-size:22px;font-weight:700;">Verify Staff Deletion</h2>
    <p style="color:#6b7280;font-size:15px;line-height:1.7;margin:0 0 24px;">Hi <strong>${name}</strong>,</p>
    <p style="color:#6b7280;font-size:15px;line-height:1.7;margin:0 0 24px;">You have requested to delete staff member <strong>${workerName}</strong>. Please use the verification OTP below to authorize this deletion. This OTP expires in <strong>10 minutes</strong>.</p>
    <div style="background:#fef2f2;border:2px dashed #f87171;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
      <p style="color:#ef4444;font-size:13px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">Verification OTP</p>
      <p style="color:#ef4444;font-size:42px;font-weight:800;margin:0;letter-spacing:12px;">${otp}</p>
    </div>
    <p style="color:#9ca3af;font-size:13px;text-align:center;">If you did not request this deletion, please ignore this email and change your account credentials immediately.</p>
  `, "#ef4444");

  return sendBrevoEmail({
    to,
    toName: name,
    subject: `Confirm Deletion of ${workerName} — LibraryHub Pro`,
    html,
  });
}

// ─── Fee Reminder ──────────────────────────────────────────────────────────
export async function sendFeeReminderEmail(
  to: string,
  name: string,
  libraryName: string,
  daysLeft: number,
  amount: number,
  dueDate: string
) {
  const isOverdue = daysLeft < 0;
  const accentColor = isOverdue ? "#ef4444" : daysLeft <= 3 ? "#f59e0b" : "#6366f1";
  const urgencyText = isOverdue
    ? "⚠️ Fee Overdue"
    : daysLeft === 0
    ? "⏰ Fee Due Today"
    : `📅 Fee Due in ${daysLeft} Day${daysLeft === 1 ? "" : "s"}`;

  const html = emailWrapper(`
    <h2 style="color:#111827;margin:0 0 8px;font-size:22px;font-weight:700;">${urgencyText}</h2>
    <p style="color:#6b7280;font-size:15px;line-height:1.7;margin:0 0 20px;">Hi <strong>${name}</strong>, your library membership fee at <strong>${libraryName}</strong> ${isOverdue ? "is overdue" : `is due on <strong>${dueDate}</strong>`}.</p>
    <div style="background:#fafafa;border:1px solid #ebebf0;border-radius:12px;padding:20px;text-align:center;margin:24px 0;">
      <p style="color:#6b7280;margin:0 0 6px;font-size:13px;">Amount Due</p>
      <p style="color:#111827;font-size:36px;font-weight:800;margin:0;">₹${amount.toLocaleString("en-IN")}</p>
    </div>
    <div style="text-align:center;margin:28px 0;">
      <a href="${APP_URL}/student/payments" style="display:inline-block;background:linear-gradient(135deg,${accentColor},#8b5cf6);color:#ffffff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;">Pay Now</a>
    </div>
  `, accentColor);

  return sendBrevoEmail({
    to,
    toName: name,
    subject: `${urgencyText} — ${libraryName}`,
    html,
  });
}

// ─── Payment Confirmation ──────────────────────────────────────────────────
export async function sendPaymentConfirmationEmail(
  to: string,
  name: string,
  libraryName: string,
  amount: number,
  invoiceNumber: string,
  paymentType: string
) {
  const html = emailWrapper(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-flex;width:64px;height:64px;background:#dcfce7;border-radius:50%;align-items:center;justify-content:center;font-size:32px;">✅</div>
    </div>
    <h2 style="color:#111827;margin:0 0 8px;font-size:22px;font-weight:700;text-align:center;">Payment Successful!</h2>
    <p style="color:#6b7280;font-size:15px;line-height:1.7;margin:0 0 24px;text-align:center;">Your payment to <strong>${libraryName}</strong> has been received.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #ebebf0;border-radius:12px;overflow:hidden;margin:24px 0;">
      <tr style="background:#fafafa;"><td style="padding:12px 16px;color:#6b7280;font-size:14px;">Invoice Number</td><td style="padding:12px 16px;font-weight:600;text-align:right;">${invoiceNumber}</td></tr>
      <tr><td style="padding:12px 16px;color:#6b7280;font-size:14px;border-top:1px solid #ebebf0;">Payment Type</td><td style="padding:12px 16px;font-weight:600;text-align:right;border-top:1px solid #ebebf0;">${paymentType.replace(/_/g, " ")}</td></tr>
      <tr style="background:#f0fdf4;"><td style="padding:14px 16px;font-weight:700;border-top:1px solid #ebebf0;">Amount Paid</td><td style="padding:14px 16px;font-weight:800;font-size:18px;color:#16a34a;text-align:right;border-top:1px solid #ebebf0;">₹${amount.toLocaleString("en-IN")}</td></tr>
    </table>
  `, "#10b981");

  return sendBrevoEmail({
    to,
    toName: name,
    subject: `Payment Confirmed ₹${amount.toLocaleString("en-IN")} — ${libraryName}`,
    html,
  });
}

// ─── Subscription Expiry Reminder ─────────────────────────────────────────
export async function sendSubscriptionExpiryReminder(
  to: string,
  name: string,
  libraryName: string,
  daysLeft: number,
  expiryDate: string
) {
  const html = emailWrapper(`
    <h2 style="color:#111827;margin:0 0 8px;font-size:22px;font-weight:700;">⚠️ Subscription Expiring ${daysLeft === 0 ? "Today" : `in ${daysLeft} Day${daysLeft === 1 ? "" : "s"}`}</h2>
    <p style="color:#6b7280;font-size:15px;line-height:1.7;margin:0 0 20px;">Hi <strong>${name}</strong>, your LibraryHub Pro subscription for <strong>${libraryName}</strong> expires on <strong>${expiryDate}</strong>.</p>
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px 20px;margin:20px 0;">
      <p style="color:#c2410c;font-size:14px;margin:0;font-weight:600;">After expiry, all library features will be restricted until you renew.</p>
    </div>
    <div style="text-align:center;margin:28px 0;">
      <a href="${APP_URL}/admin/settings?tab=subscription" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#ffffff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;">Renew Subscription</a>
    </div>
  `, "#f59e0b");

  return sendBrevoEmail({
    to,
    toName: name,
    subject: `Subscription Expiring ${daysLeft === 0 ? "Today" : `in ${daysLeft} days`} — LibraryHub Pro`,
    html,
  });
}

// ─── Admin Announcement ────────────────────────────────────────────────────
export async function sendAnnouncementEmail(
  to: string,
  name: string,
  libraryName: string,
  title: string,
  message: string
) {
  const html = emailWrapper(`
    <h2 style="color:#111827;margin:0 0 8px;font-size:22px;font-weight:700;">📢 ${title}</h2>
    <p style="color:#6b7280;font-size:13px;margin:0 0 20px;">From <strong>${libraryName}</strong></p>
    <div style="background:#fafafa;border-left:4px solid #6366f1;border-radius:0 12px 12px 0;padding:20px 24px;margin:20px 0;">
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0;">${message}</p>
    </div>
    <div style="text-align:center;margin:28px 0;">
      <a href="${APP_URL}/student/notifications" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">View in Dashboard</a>
    </div>
  `);

  return sendBrevoEmail({
    to,
    toName: name,
    subject: `${title} — ${libraryName}`,
    html,
  });
}

// ─── Trial Expiry Warning ──────────────────────────────────────────────────
export async function sendTrialExpiryEmail(
  to: string,
  name: string,
  libraryName: string,
  hoursLeft: number
) {
  const html = emailWrapper(`
    <h2 style="color:#111827;margin:0 0 8px;font-size:22px;font-weight:700;">⏳ Trial Ending in ${hoursLeft} Hour${hoursLeft === 1 ? "" : "s"}</h2>
    <p style="color:#6b7280;font-size:15px;line-height:1.7;margin:0 0 20px;">Hi <strong>${name}</strong>, your 48-hour free trial for <strong>${libraryName}</strong> on LibraryHub Pro is about to end.</p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px 20px;margin:20px 0;">
      <p style="color:#dc2626;font-size:14px;margin:0;font-weight:600;">After the trial expires, access to your library dashboard will be restricted.</p>
    </div>
    <div style="text-align:center;margin:28px 0;">
      <a href="${APP_URL}/admin/settings?tab=subscription" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;">Upgrade Now</a>
    </div>
  `, "#ef4444");

  return sendBrevoEmail({
    to,
    toName: name,
    subject: `Trial Ending in ${hoursLeft}h — Upgrade LibraryHub Pro`,
    html,
  });
}

// ─── Library Approval Notification ────────────────────────────────────────
export async function sendLibraryApprovalEmail(
  to: string,
  name: string,
  libraryName: string,
  approved: boolean,
  rejectReason?: string
) {
  const html = emailWrapper(
    approved
      ? `
    <h2 style="color:#111827;margin:0 0 8px;font-size:22px;font-weight:700;">🎉 Library Approved!</h2>
    <p style="color:#6b7280;font-size:15px;line-height:1.7;margin:0 0 20px;">Hi <strong>${name}</strong>, your library <strong>${libraryName}</strong> has been approved by the LibraryHub Pro team. Your 48-hour free trial has started.</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${APP_URL}/admin/dashboard" style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);color:#ffffff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;">Open Dashboard</a>
    </div>
    `
      : `
    <h2 style="color:#111827;margin:0 0 8px;font-size:22px;font-weight:700;">Registration Not Approved</h2>
    <p style="color:#6b7280;font-size:15px;line-height:1.7;margin:0 0 20px;">Hi <strong>${name}</strong>, unfortunately your library registration for <strong>${libraryName}</strong> was not approved at this time.</p>
    ${rejectReason ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px 20px;margin:20px 0;"><p style="color:#dc2626;font-size:14px;margin:0;"><strong>Reason:</strong> ${rejectReason}</p></div>` : ""}
    <p style="color:#6b7280;font-size:14px;">You may contact support for further assistance.</p>
    `,
    approved ? "#10b981" : "#ef4444"
  );

  return sendBrevoEmail({
    to,
    toName: name,
    subject: approved
      ? `✅ Library Approved — LibraryHub Pro`
      : `Library Registration Update — LibraryHub Pro`,
    html,
  });
}

// ─── Feedback Auto-Reply ───────────────────────────────────────────────────
export async function sendFeedbackAutoReply(
  to: string,
  name: string,
  libraryName: string,
  feedbackMessage: string
) {
  const html = emailWrapper(`
    <h2 style="color:#111827;margin:0 0 8px;font-size:22px;font-weight:700;">We've Received Your Feedback 💬</h2>
    <p style="color:#6b7280;font-size:15px;line-height:1.7;margin:0 0 20px;">Hi <strong>${name}</strong>, thank you for sharing your thoughts with <strong>${libraryName}</strong>. We truly value your feedback and our team will review it shortly.</p>

    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px 24px;margin:20px 0;">
      <p style="color:#6b7280;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Your Feedback</p>
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0;font-style:italic;">"${feedbackMessage.length > 200 ? feedbackMessage.substring(0, 200) + "…" : feedbackMessage}"</p>
    </div>

    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px 20px;margin:20px 0;">
      <p style="color:#1d4ed8;font-size:14px;margin:0;font-weight:500;">📬 What happens next?</p>
      <p style="color:#3b82f6;font-size:13px;margin:8px 0 0;line-height:1.6;">Our library team will review your message and get back to you if needed. We aim to respond within 24–48 hours.</p>
    </div>

    <div style="text-align:center;margin:28px 0;">
      <a href="${APP_URL}/student/feedback" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;">View Your Dashboard</a>
    </div>
  `);

  return sendBrevoEmail({
    to,
    toName: name,
    subject: `Feedback Received — ${libraryName}`,
    html,
  });
}

// ─── Feedback Reply from Admin ─────────────────────────────────────────────
export async function sendFeedbackReplyEmail(
  to: string,
  name: string,
  libraryName: string,
  originalMessage: string,
  replyMessage: string
) {
  const html = emailWrapper(`
    <h2 style="color:#111827;margin:0 0 8px;font-size:22px;font-weight:700;">Reply to Your Feedback 💌</h2>
    <p style="color:#6b7280;font-size:15px;line-height:1.7;margin:0 0 20px;">Hi <strong>${name}</strong>, the team at <strong>${libraryName}</strong> has responded to your feedback.</p>

    <div style="background:#f9fafb;border-left:4px solid #d1d5db;border-radius:0 12px 12px 0;padding:16px 20px;margin:20px 0;">
      <p style="color:#9ca3af;font-size:11px;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Your Original Feedback</p>
      <p style="color:#6b7280;font-size:13px;line-height:1.7;margin:0;font-style:italic;">"${originalMessage.length > 150 ? originalMessage.substring(0, 150) + "…" : originalMessage}"</p>
    </div>

    <div style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:0 12px 12px 0;padding:16px 20px;margin:20px 0;">
      <p style="color:#16a34a;font-size:11px;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Response from ${libraryName}</p>
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0;">${replyMessage}</p>
    </div>

    <div style="text-align:center;margin:28px 0;">
      <a href="${APP_URL}/student/feedback" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;">Open Dashboard</a>
    </div>
  `, "#22c55e");

  return sendBrevoEmail({
    to,
    toName: name,
    subject: `Reply to Your Feedback — ${libraryName}`,
    html,
  });
}

// ─── Partial Fee Reminder ──────────────────────────────────────────────────
export async function sendPartialFeeReminderEmail(
  to: string,
  name: string,
  libraryName: string,
  remainingAmount: number,
  dueDate: string
) {
  const html = emailWrapper(`
    <h2 style="color:#111827;margin:0 0 8px;font-size:22px;font-weight:700;">⚠️ Partial Payment Pending</h2>
    <p style="color:#6b7280;font-size:15px;line-height:1.7;margin:0 0 20px;">Hi <strong>${name}</strong>, you have a partial payment pending for your library membership at <strong>${libraryName}</strong>. Please clear the remaining balance to keep your membership active.</p>

    <div style="background:#fafafa;border:1px solid #ebebf0;border-radius:12px;padding:20px;text-align:center;margin:24px 0;">
      <p style="color:#6b7280;margin:0 0 6px;font-size:13px;">Remaining Balance</p>
      <p style="color:#f59e0b;font-size:36px;font-weight:800;margin:0;">₹${remainingAmount.toLocaleString("en-IN")}</p>
      <p style="color:#9ca3af;font-size:13px;margin:8px 0 0;">Due by <strong>${dueDate}</strong></p>
    </div>

    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px 20px;margin:20px 0;">
      <p style="color:#92400e;font-size:13px;margin:0;line-height:1.6;">💡 Your last payment was partially received. Please pay the remaining amount to avoid any disruption to your library access.</p>
    </div>

    <div style="text-align:center;margin:28px 0;">
      <a href="${APP_URL}/student/payments" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#ffffff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;">Pay Remaining Amount</a>
    </div>
  `, "#f59e0b");

  return sendBrevoEmail({
    to,
    toName: name,
    subject: `Partial Payment Pending — ${libraryName}`,
    html,
  });
}
