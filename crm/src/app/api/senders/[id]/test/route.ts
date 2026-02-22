import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sender = await prisma.emailSender.findUnique({ where: { id: parseInt(id) } });

  if (!sender) {
    return NextResponse.json({ error: "Sender not found" }, { status: 404 });
  }

  try {
    await sendEmail({
      smtpUser: sender.smtpUser,
      smtpPassword: sender.smtpPassword,
      from: sender.email,
      fromName: sender.displayName,
      to: sender.email,
      subject: "LiB CRM - SMTP Connection Test",
      html: "<p>This is a test email from LiB CRM. Your SMTP configuration is working correctly.</p>",
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to send test email" },
      { status: 500 }
    );
  }
}
