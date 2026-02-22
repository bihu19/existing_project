import nodemailer from "nodemailer";

interface SendEmailOptions {
  smtpUser: string;
  smtpPassword: string;
  from: string;
  fromName: string;
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: SendEmailOptions) {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: options.smtpUser,
      pass: options.smtpPassword,
    },
  });

  return transporter.sendMail({
    from: `"${options.fromName}" <${options.from}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
}

export function replaceMergeTags(
  template: string,
  data: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] || match;
  });
}

export function injectTrackingPixel(html: string, trackingUrl: string): string {
  const pixel = `<img src="${trackingUrl}" width="1" height="1" style="display:none;" />`;
  if (html.includes("</body>")) {
    return html.replace("</body>", `${pixel}</body>`);
  }
  return html + pixel;
}

export function wrapLinksWithTracking(
  html: string,
  baseTrackingUrl: string
): string {
  return html.replace(
    /<a\s+([^>]*?)href=["']([^"']+)["']([^>]*?)>/gi,
    (match, before, url, after) => {
      if (url.startsWith("mailto:") || url.includes("/api/track/")) return match;
      const encodedUrl = encodeURIComponent(url);
      return `<a ${before}href="${baseTrackingUrl}?url=${encodedUrl}"${after}>`;
    }
  );
}
