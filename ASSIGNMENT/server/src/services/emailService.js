import nodemailer from 'nodemailer';

let transporter = null;

function hasOAuthCredentials() {
  return Boolean(
    process.env.GOOGLE_USER &&
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN
  );
}

function hasAppPasswordCredentials() {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

function getSenderEmail() {
  return process.env.GOOGLE_USER || process.env.GMAIL_USER;
}

function getTransporter() {
  if (transporter) return transporter;

  if (hasOAuthCredentials()) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.GOOGLE_USER,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
      },
    });
    return transporter;
  }

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error(
      'Gmail not configured. Set GOOGLE_* OAuth vars or GMAIL_USER + GMAIL_APP_PASSWORD in .env'
    );
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });

  return transporter;
}

export async function sendEmail({ to, subject, html, text, attachmentPaths = [] }) {
  const mail = getTransporter();
  const from = getSenderEmail();

  const mailOptions = {
    from: `"API Export Outreach" <${from}>`,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ''),
  };

  if (attachmentPaths && attachmentPaths.length > 0) {
    mailOptions.attachments = attachmentPaths.map((path) => ({ path }));
  }

  const info = await mail.sendMail(mailOptions);

  return { messageId: info.messageId, accepted: info.accepted };
}

export function isGmailConfigured() {
  return hasOAuthCredentials() || hasAppPasswordCredentials();
}
