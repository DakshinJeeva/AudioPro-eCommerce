// backend/utils/sendEmail.js
import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";
dotenv.config();
// Set SendGrid API Key
const sendGridApiKey = process.env.SENDGRID_API_KEY;
if (sendGridApiKey) {
  sgMail.setApiKey(sendGridApiKey);
} else {
  console.warn('WARNING: SENDGRID_API_KEY not set. Email functionality will not work in production.');
}

export const sendVerificationEmail = async (email, verificationToken) => {
  const verificationUrl = `${process.env.FRONTEND_URL || 'https://audiopro.onrender.com'}/verify-email/${verificationToken}`;

  // If SendGrid is not configured, log the verification URL for development
  if (!sendGridApiKey) {
    console.log('='.repeat(80));
    console.log('EMAIL VERIFICATION (Development Mode - SendGrid not configured)');
    console.log('='.repeat(80));
    console.log(`To: ${email}`);
    console.log(`Verification URL: ${verificationUrl}`);
    console.log(`Verification Token: ${verificationToken}`);
    console.log('='.repeat(80));
    console.log('NOTE: In production, configure SENDGRID_API_KEY in your .env file');
    console.log('='.repeat(80));
    // Don't throw error in development - allow registration to continue
    if (process.env.NODE_ENV === 'development') {
      return true;
    } else {
      throw new Error('Email service not configured. Please set SENDGRID_API_KEY in environment variables.');
    }
  }

  const msg = {
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com', // Change this to your verified sender
    subject: 'Verify Your Email Address - AudioPro',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; margin-bottom: 20px;">Welcome to AudioPro!</h2>
        <p style="color: #666; line-height: 1.6;">Thank you for signing up. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Verify Email Address
          </a>
        </div>
        <p style="color: #666; line-height: 1.6;">Or copy and paste this link into your browser:</p>
        <p style="color: #666; word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 12px;">${verificationUrl}</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
          This link will expire in 24 hours. If you didn't create an account, please ignore this email.
        </p>
      </div>
    `,
    text: `Welcome to AudioPro! Please verify your email by visiting: ${verificationUrl}`,
  };

  try {
    await sgMail.send(msg);
    console.log(`✅ Verification email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    if (error.response) {
      console.error('SendGrid Error Response:', error.response.body);
    }
    throw error;
  }
};

export const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  const msg = {
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject: "Reset Your Password - AudioPro",
    html: `
      <h2>Password Reset Requested</h2>
      <p>Click the link below to reset your password. This link expires in 10 minutes:</p>
      <a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#000;color:#fff;text-decoration:none;border-radius:4px;">
        Reset Password
      </a>
      <p>If you didn’t request this, you can ignore this email.</p>
    `,
  };

  await sgMail.send(msg);
  console.log(`✅ Password reset email sent to ${email}`);
};

// Send order confirmation to customer and notification to admin
export const sendOrderEmails = async (order) => {
  if (!sendGridApiKey) {
    console.log("[Email] SENDGRID_API_KEY not set, skipping order emails.");
    return;
  }

  if (!order || !order.user || !order.user.email) {
    console.log("[Email] Order or user email missing, skipping order emails.");
    return;
  }

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const adminEmail = process.env.SENDGRID_FROM_EMAIL || "xboxdakshin@gmail.com";

  const itemsTableRows = order.items
    .map((item) => {
      const name = item.product?.name || "Product";
      const qty = item.quantity || 0;
      const price = item.price || item.product?.price || 0;
      const lineTotal = price * qty;
      return `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${name}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align:center;">${qty}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align:right;">₹${price}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align:right;">₹${lineTotal}</td>
        </tr>`;
    })
    .join("\n");

  const address = order.address || {};
  const addressHtml = `
    <p style="margin:4px 0;">${address.street || ""}</p>
    <p style="margin:4px 0;">${address.city || ""}, ${address.state || ""} ${
    address.zipCode || ""
  }</p>
    <p style="margin:4px 0;">${address.country || ""}</p>
  `;

  const orderTotal = order.totalAmount || 0;
  const orderId = order._id?.toString() || "";

  const baseHtml = (introText) => `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #111; margin-bottom: 12px;">${introText}</h2>
      <p style="color: #555; margin-bottom: 16px;">Order ID: <strong>${orderId}</strong></p>
      <h3 style="margin-top: 24px; margin-bottom: 8px;">Items</h3>
      <table cellpadding="0" cellspacing="0" style="width:100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr>
            <th style="text-align:left; padding: 8px 12px; border-bottom: 1px solid #ddd;">Product</th>
            <th style="text-align:center; padding: 8px 12px; border-bottom: 1px solid #ddd;">Qty</th>
            <th style="text-align:right; padding: 8px 12px; border-bottom: 1px solid #ddd;">Price</th>
            <th style="text-align:right; padding: 8px 12px; border-bottom: 1px solid #ddd;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsTableRows}
        </tbody>
      </table>
      <p style="margin-top: 16px; font-size: 16px;">
        <strong>Order Total: ₹${orderTotal}</strong>
      </p>
      <h3 style="margin-top: 24px; margin-bottom: 8px;">Shipping Address</h3>
      ${addressHtml}
      <p style="margin-top: 24px; font-size: 13px; color:#888;">You can view your orders in your account: <a href="${frontendUrl}/orders">${frontendUrl}/orders</a></p>
    </div>
  `;

  const customerMsg = {
    to: order.user.email,
    from: process.env.SENDGRID_FROM_EMAIL || adminEmail,
    subject: `Your AudioPro order ${orderId}`,
    html: baseHtml("Thank you for your order!"),
  };

  const adminMsg = {
    to: "xboxdakshin@gmail.com",
    from: process.env.SENDGRID_FROM_EMAIL || adminEmail,
    subject: `New order received ${orderId}`,
    html: baseHtml("New order received"),
  };

  try {
    await sgMail.send(customerMsg);
    await sgMail.send(adminMsg);
    console.log(`✅ Order emails sent for order ${orderId}`);
  } catch (error) {
    console.error("❌ Error sending order emails:", error);
    if (error.response) {
      console.error("SendGrid Error Response:", error.response.body);
    }
    // Do not throw: order creation should still succeed even if email fails
  }
};
