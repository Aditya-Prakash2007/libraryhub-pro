// Email service using Resend
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.SMTP_FROM || "LibraryHub Pro <noreply@libraryhubpro.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Send verification email
export async function sendVerificationEmail(to: string, name: string, token: string) {
  const verifyUrl = `${APP_URL}/verify-email?token=${token}`;

  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Verify your LibraryHub Pro account",
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f4f4f5; padding:40px 0;">
          <div style="max-width:560px; margin:0 auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.1);">
            <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6); padding:32px 40px; text-align:center;">
              <h1 style="color:#fff; margin:0; font-size:24px;">LibraryHub Pro</h1>
            </div>
            <div style="padding:40px;">
              <h2 style="color:#111827; margin-top:0;">Verify your email, ${name}!</h2>
              <p style="color:#6b7280; line-height:1.6;">Thanks for signing up. Click the button below to verify your email address and activate your account.</p>
              <div style="text-align:center; margin:32px 0;">
                <a href="${verifyUrl}" style="background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; padding:14px 32px; border-radius:8px; text-decoration:none; font-weight:600; display:inline-block;">Verify Email Address</a>
              </div>
              <p style="color:#9ca3af; font-size:13px;">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  });
}

// Send password reset email
export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Reset your LibraryHub Pro password",
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f4f4f5; padding:40px 0;">
          <div style="max-width:560px; margin:0 auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.1);">
            <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6); padding:32px 40px; text-align:center;">
              <h1 style="color:#fff; margin:0;">LibraryHub Pro</h1>
            </div>
            <div style="padding:40px;">
              <h2 style="color:#111827; margin-top:0;">Reset your password</h2>
              <p style="color:#6b7280; line-height:1.6;">We received a password reset request for your account. Click the button below to set a new password.</p>
              <div style="text-align:center; margin:32px 0;">
                <a href="${resetUrl}" style="background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; padding:14px 32px; border-radius:8px; text-decoration:none; font-weight:600; display:inline-block;">Reset Password</a>
              </div>
              <p style="color:#9ca3af; font-size:13px;">This link expires in 1 hour. If you didn't request a reset, ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  });
}

// Send fee reminder email
export async function sendFeeReminderEmail(
  to: string,
  studentName: string,
  libraryName: string,
  dueDate: string,
  amount: number,
  daysLeft: number
) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Fee Reminder: ${daysLeft <= 0 ? "Overdue!" : `Due in ${daysLeft} days`} — ${libraryName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f4f4f5; padding:40px 0;">
          <div style="max-width:560px; margin:0 auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.1);">
            <div style="background:linear-gradient(135deg,${daysLeft <= 0 ? "#ef4444,#dc2626" : "#f59e0b,#d97706"}); padding:32px 40px; text-align:center;">
              <h1 style="color:#fff; margin:0; font-size:18px;">${libraryName}</h1>
              <p style="color:rgba(255,255,255,0.9); margin:8px 0 0; font-size:14px;">Fee ${daysLeft <= 0 ? "Overdue" : "Reminder"}</p>
            </div>
            <div style="padding:40px;">
              <h2 style="color:#111827; margin-top:0;">Hi ${studentName},</h2>
              <p style="color:#6b7280; line-height:1.6;">
                ${daysLeft <= 0
                  ? "Your library membership fee is <strong style='color:#ef4444'>overdue</strong>. Please pay immediately to avoid suspension."
                  : `Your library membership fee is due in <strong>${daysLeft} days</strong> on ${dueDate}.`}
              </p>
              <div style="background:#f9fafb; border-radius:12px; padding:20px; margin:24px 0; text-align:center;">
                <p style="color:#6b7280; margin:0 0 8px; font-size:14px;">Amount Due</p>
                <p style="color:#111827; font-size:32px; font-weight:700; margin:0;">₹${amount}</p>
              </div>
              <div style="text-align:center;">
                <a href="${APP_URL}/student/payments" style="background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; padding:14px 32px; border-radius:8px; text-decoration:none; font-weight:600; display:inline-block;">Pay Now</a>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  });
}

// Send payment confirmation
export async function sendPaymentConfirmationEmail(
  to: string,
  studentName: string,
  libraryName: string,
  paymentId: string,
  invoiceNumber: string,
  amount: number,
  paymentType: string
) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Payment Confirmed — ${libraryName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f4f4f5; padding:40px 0;">
          <div style="max-width:560px; margin:0 auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.1);">
            <div style="background:linear-gradient(135deg,#10b981,#059669); padding:32px 40px; text-align:center;">
              <div style="font-size:48px; margin-bottom:8px;">✅</div>
              <h1 style="color:#fff; margin:0; font-size:20px;">Payment Successful!</h1>
            </div>
            <div style="padding:40px;">
              <h2 style="color:#111827; margin-top:0;">Hi ${studentName},</h2>
              <p style="color:#6b7280; line-height:1.6;">Your payment to <strong>${libraryName}</strong> has been received successfully.</p>
              <div style="background:#f9fafb; border-radius:12px; padding:20px; margin:24px 0;">
                <table style="width:100%; border-collapse:collapse;">
                  <tr><td style="color:#6b7280; padding:6px 0; font-size:14px;">Payment ID</td><td style="text-align:right; font-weight:600; font-size:14px;">${paymentId}</td></tr>
                  <tr><td style="color:#6b7280; padding:6px 0; font-size:14px;">Invoice No.</td><td style="text-align:right; font-weight:600; font-size:14px;">${invoiceNumber}</td></tr>
                  <tr><td style="color:#6b7280; padding:6px 0; font-size:14px;">Type</td><td style="text-align:right; font-weight:600; font-size:14px;">${paymentType.replace("_", " ")}</td></tr>
                  <tr style="border-top:1px solid #e5e7eb;"><td style="color:#111827; padding:12px 0 6px; font-size:16px; font-weight:700;">Amount Paid</td><td style="text-align:right; color:#10b981; font-size:20px; font-weight:700; padding:12px 0 6px;">₹${amount}</td></tr>
                </table>
              </div>
              <div style="text-align:center;">
                <a href="${APP_URL}/student/payments" style="background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; padding:12px 28px; border-radius:8px; text-decoration:none; font-weight:600; display:inline-block;">View Receipt</a>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  });
}
