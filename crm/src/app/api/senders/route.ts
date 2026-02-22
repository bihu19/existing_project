import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const senders = await prisma.emailSender.findMany({
    select: { id: true, displayName: true, email: true, smtpUser: true, isActive: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(senders);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { displayName, email, smtpUser, smtpPassword } = body;

  if (!displayName || !email || !smtpUser || !smtpPassword) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  const sender = await prisma.emailSender.create({
    data: { displayName, email, smtpUser, smtpPassword },
    select: { id: true, displayName: true, email: true, smtpUser: true, isActive: true, createdAt: true },
  });

  return NextResponse.json(sender, { status: 201 });
}
