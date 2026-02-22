import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaigns = await prisma.emailCampaign.findMany({
    include: {
      template: { select: { name: true } },
      sender: { select: { displayName: true, email: true } },
      _count: { select: { recipients: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(campaigns);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  const campaign = await prisma.emailCampaign.create({
    data: {
      templateId: body.templateId || null,
      senderId: body.senderId,
      subject: body.subject,
      filterJson: body.filterJson ? JSON.stringify(body.filterJson) : null,
      recipientCount: body.recipientCount || 0,
      status: "draft",
    },
  });

  return NextResponse.json(campaign, { status: 201 });
}
