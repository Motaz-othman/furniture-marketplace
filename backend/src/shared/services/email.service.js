import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import prisma from '../config/db.js';
dotenv.config();

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
}

async function getEmailConfig() {
  try {
    const record = await prisma.siteSettings.findUnique({ where: { id: 'main' } });
    const s = record?.settings || {};
    return {
      from: s.email?.from || process.env.EMAIL_USER || 'admin@livipoint.com',
      fromName: s.email?.fromName || 'LiviPoint',
      adminEmail: s.email?.adminEmail || process.env.EMAIL_USER || 'admin@livipoint.com',
    };
  } catch {
    return {
      from: process.env.EMAIL_USER || 'admin@livipoint.com',
      fromName: 'LiviPoint',
      adminEmail: process.env.EMAIL_USER || 'admin@livipoint.com',
    };
  }
}

// Send password reset email
export const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  const { from, fromName } = await getEmailConfig();

  const mailOptions = {
    from: `"${fromName}" <${from}>`,
    to: email,
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>You requested to reset your password. Click the button below to reset it:</p>
        <a href="${resetUrl}" 
           style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; 
                  color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
          Reset Password
        </a>
        <p>Or copy and paste this link into your browser:</p>
        <p style="color: #4F46E5;">${resetUrl}</p>
        <p><strong>This link will expire in 1 hour.</strong></p>
        <p>If you didn't request this, please ignore this email.</p>
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          This is an automated email from Furniture Marketplace. Please do not reply.
        </p>
      </div>
    `
  };

  try {
    await createTransporter().sendMail(mailOptions);
    console.log('Password reset email sent to:', email);
  } catch (error) {
    console.error('Email send error:', error);
    throw new Error('Failed to send email');
  }
};

// Send order confirmation email
export const sendOrderConfirmationEmail = async (order) => {
  const to = order.guestEmail || order.customer?.user?.email;
  if (!to) return;

  const { from, fromName } = await getEmailConfig();
  const firstName = order.guestFirstName || order.customer?.user?.firstName || 'Customer';
  const siteUrl = process.env.FRONTEND_URL || 'https://livipoint-qsggy2e3k-mutaz-othmans-projects.vercel.app';

  const fmt = (n) => `$${Number(n || 0).toFixed(2)}`;

  const itemsHtml = (order.items || []).map((item) => {
    const name = item.product?.name || 'Product';
    const variant = item.variant?.name ? ` — ${item.variant.name}` : '';
    return `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#333;">${name}${variant}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;text-align:center;font-size:14px;color:#666;">×${item.quantity}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-size:14px;color:#333;">${fmt(item.price * item.quantity)}</td>
      </tr>`;
  }).join('');

  const discountRow = order.discountAmount > 0 ? `
    <tr>
      <td colspan="2" style="padding:6px 0;font-size:13px;color:#16a34a;">
        Discount${order.couponCode ? ` (${order.couponCode})` : ''}
      </td>
      <td style="padding:6px 0;text-align:right;font-size:13px;color:#16a34a;">−${fmt(order.discountAmount)}</td>
    </tr>` : '';

  const addr = order.address;
  const addressHtml = addr
    ? `${addr.street}, ${addr.city}, ${addr.state} ${addr.zipCode}, ${addr.country || 'US'}`
    : '';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="background:#1a1a1a;padding:28px 32px;">
          <p style="margin:0;font-size:22px;font-weight:bold;color:#ffffff;letter-spacing:-0.5px;">${fromName}</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 8px;font-size:22px;color:#111;">Order Confirmed!</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#555;">Hi ${firstName}, thank you for your order. We've received it and will notify you once it ships.</p>

          <!-- Order meta -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr>
              <td style="background:#f7f7f7;border-radius:6px;padding:16px;">
                <p style="margin:0 0 4px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Order Number</p>
                <p style="margin:0;font-size:18px;font-weight:700;color:#111;">#${order.orderNumber}</p>
              </td>
            </tr>
          </table>

          <!-- Items -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
            <thead>
              <tr>
                <th style="text-align:left;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:8px;border-bottom:2px solid #f0f0f0;">Item</th>
                <th style="text-align:center;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:8px;border-bottom:2px solid #f0f0f0;">Qty</th>
                <th style="text-align:right;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:8px;border-bottom:2px solid #f0f0f0;">Price</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>

          <!-- Totals -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
            <tr>
              <td colspan="2" style="padding:6px 0;font-size:13px;color:#555;">Subtotal</td>
              <td style="padding:6px 0;text-align:right;font-size:13px;color:#333;">${fmt(order.subtotal)}</td>
            </tr>
            ${discountRow}
            <tr>
              <td colspan="2" style="padding:6px 0;font-size:13px;color:#555;">Shipping</td>
              <td style="padding:6px 0;text-align:right;font-size:13px;color:#333;">${order.shippingCost > 0 ? fmt(order.shippingCost) : 'Free'}</td>
            </tr>
            <tr>
              <td colspan="2" style="padding:6px 0;font-size:13px;color:#555;">Tax</td>
              <td style="padding:6px 0;text-align:right;font-size:13px;color:#333;">${fmt(order.tax)}</td>
            </tr>
            <tr>
              <td colspan="3" style="border-top:2px solid #f0f0f0;padding-top:8px;"></td>
            </tr>
            <tr>
              <td colspan="2" style="padding:6px 0;font-size:15px;font-weight:700;color:#111;">Total</td>
              <td style="padding:6px 0;text-align:right;font-size:15px;font-weight:700;color:#111;">${fmt(order.total)}</td>
            </tr>
          </table>

          ${addressHtml ? `
          <!-- Shipping address -->
          <div style="margin-top:24px;padding:16px;background:#f7f7f7;border-radius:6px;">
            <p style="margin:0 0 6px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Shipping To</p>
            <p style="margin:0;font-size:14px;color:#333;">${addressHtml}</p>
          </div>` : ''}

          <!-- CTA -->
          <div style="margin-top:28px;text-align:center;">
            <a href="${siteUrl}/checkout/confirmation?orders=${order.orderNumber}&email=${encodeURIComponent(to)}"
               style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:600;">
              View Order
            </a>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid #f0f0f0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#aaa;">© ${new Date().getFullYear()} ${fromName}. All rights reserved.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    await createTransporter().sendMail({
      from: `"${fromName}" <${from}>`,
      to,
      subject: `Order Confirmed — #${order.orderNumber}`,
      html,
    });
    console.log(`Order confirmation email sent to ${to} for order ${order.orderNumber}`);
  } catch (error) {
    console.error('Order confirmation email error:', error);
  }
};

// Send new order notification to admin
export const sendAdminOrderNotificationEmail = async (order) => {
  const { from, fromName, adminEmail } = await getEmailConfig();

  const fmt = (n) => `$${Number(n || 0).toFixed(2)}`;
  const customerName = order.guestFirstName
    ? `${order.guestFirstName} ${order.guestLastName || ''}`.trim()
    : order.customer?.user
      ? `${order.customer.user.firstName} ${order.customer.user.lastName}`.trim()
      : 'Guest';
  const customerEmail = order.guestEmail || order.customer?.user?.email || '—';

  const itemsHtml = (order.items || []).map((item) => {
    const name = item.product?.name || 'Product';
    const variant = item.variant?.name ? ` — ${item.variant.name}` : '';
    return `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:14px;">${name}${variant}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:center;font-size:14px;">×${item.quantity}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-size:14px;">${fmt(item.price * item.quantity)}</td>
    </tr>`;
  }).join('');

  const adminPanelUrl = process.env.ADMIN_URL || 'https://admin-panel-lvwp25rft-mutaz-othmans-projects.vercel.app';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">

        <tr><td style="background:#2563eb;padding:20px 32px;">
          <p style="margin:0;font-size:16px;font-weight:bold;color:#fff;">New Order Received</p>
        </td></tr>

        <tr><td style="padding:28px 32px;">
          <h2 style="margin:0 0 20px;font-size:20px;color:#111;">Order #${order.orderNumber}</h2>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;background:#f7f7f7;border-radius:6px;padding:16px;">
            <tr>
              <td style="font-size:13px;color:#555;padding:4px 0;width:120px;">Customer</td>
              <td style="font-size:13px;color:#111;padding:4px 0;font-weight:600;">${customerName}</td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#555;padding:4px 0;">Email</td>
              <td style="font-size:13px;color:#111;padding:4px 0;">${customerEmail}</td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#555;padding:4px 0;">Order Total</td>
              <td style="font-size:13px;color:#111;padding:4px 0;font-weight:700;">${fmt(order.total)}</td>
            </tr>
            ${order.discountAmount > 0 ? `<tr>
              <td style="font-size:13px;color:#555;padding:4px 0;">Discount</td>
              <td style="font-size:13px;color:#16a34a;padding:4px 0;">−${fmt(order.discountAmount)}${order.couponCode ? ` (${order.couponCode})` : ''}</td>
            </tr>` : ''}
          </table>

          <table width="100%" cellpadding="0" cellspacing="0">
            <thead>
              <tr>
                <th style="text-align:left;font-size:11px;color:#888;text-transform:uppercase;padding-bottom:8px;border-bottom:2px solid #f0f0f0;">Item</th>
                <th style="text-align:center;font-size:11px;color:#888;text-transform:uppercase;padding-bottom:8px;border-bottom:2px solid #f0f0f0;">Qty</th>
                <th style="text-align:right;font-size:11px;color:#888;text-transform:uppercase;padding-bottom:8px;border-bottom:2px solid #f0f0f0;">Price</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>

          <div style="margin-top:28px;text-align:center;">
            <a href="${adminPanelUrl}/orders/${order.id}"
               style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:600;">
              View Order in Admin Panel
            </a>
          </div>
        </td></tr>

        <tr><td style="padding:16px 32px;border-top:1px solid #f0f0f0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#aaa;">This is an automated notification from ${fromName}.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    await createTransporter().sendMail({
      from: `"${fromName}" <${from}>`,
      to: adminEmail,
      subject: `New Order #${order.orderNumber} — ${customerName} — $${Number(order.total).toFixed(2)}`,
      html,
    });
    console.log(`Admin order notification sent for order ${order.orderNumber}`);
  } catch (error) {
    console.error('Admin order notification email error:', error);
  }
};
// Send return request notification to admin
export const sendReturnRequestEmail = async (order, reason) => {
  const { from, fromName, adminEmail } = await getEmailConfig();

  const fmt = (n) => `$${Number(n || 0).toFixed(2)}`;
  const customerName = order.customer?.user
    ? `${order.customer.user.firstName} ${order.customer.user.lastName}`.trim()
    : order.guestFirstName ? `${order.guestFirstName} ${order.guestLastName || ''}`.trim() : 'Customer';
  const customerEmail = order.customer?.user?.email || order.guestEmail || '—';
  const adminPanelUrl = process.env.ADMIN_URL || 'https://admin-panel-lvwp25rft-mutaz-othmans-projects.vercel.app';

  const itemsHtml = (order.items || []).map((i) => {
    const name = i.product?.name || 'Product';
    const variant = i.variant?.name ? ` — ${i.variant.name}` : '';
    return `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:14px;">${name}${variant}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:center;font-size:14px;">×${i.quantity}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-size:14px;">${fmt(i.price * i.quantity)}</td>
    </tr>`;
  }).join('');

  const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">
        <tr><td style="background:#dc2626;padding:20px 32px;">
          <p style="margin:0;font-size:16px;font-weight:bold;color:#fff;">Return Request</p>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <h2 style="margin:0 0 20px;font-size:20px;color:#111;">Order #${order.orderNumber}</h2>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;background:#fef2f2;border-radius:6px;padding:16px;">
            <tr><td style="font-size:13px;color:#555;padding:4px 0;width:120px;">Customer</td><td style="font-size:13px;color:#111;font-weight:600;">${customerName}</td></tr>
            <tr><td style="font-size:13px;color:#555;padding:4px 0;">Email</td><td style="font-size:13px;color:#111;">${customerEmail}</td></tr>
            <tr><td style="font-size:13px;color:#555;padding:4px 0;">Order Total</td><td style="font-size:13px;font-weight:700;color:#111;">${fmt(order.total)}</td></tr>
            ${reason ? `<tr><td style="font-size:13px;color:#555;padding:4px 0;vertical-align:top;">Reason</td><td style="font-size:13px;color:#111;">${reason}</td></tr>` : ''}
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <thead>
              <tr>
                <th style="text-align:left;font-size:11px;color:#888;text-transform:uppercase;padding-bottom:8px;border-bottom:2px solid #f0f0f0;">Item</th>
                <th style="text-align:center;font-size:11px;color:#888;text-transform:uppercase;padding-bottom:8px;border-bottom:2px solid #f0f0f0;">Qty</th>
                <th style="text-align:right;font-size:11px;color:#888;text-transform:uppercase;padding-bottom:8px;border-bottom:2px solid #f0f0f0;">Price</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div style="margin-top:28px;text-align:center;">
            <a href="${adminPanelUrl}/orders/${order.id}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:600;">
              Process Return in Admin Panel
            </a>
          </div>
        </td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid #f0f0f0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#aaa;">Automated return request from ${fromName}.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  await createTransporter().sendMail({
    from: `"${fromName}" <${from}>`,
    to: adminEmail,
    subject: `Return Request — Order #${order.orderNumber} — ${customerName}`,
    html,
  });
  console.log(`Return request email sent for order ${order.orderNumber}`);
};
