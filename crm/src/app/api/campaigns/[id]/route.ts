import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: parseInt(id) },
    include: {
      template: true,
      sender: { select: { displayName: true, email: true } },
      recipients: {
        include: {
          contact: { select: { firstName: true, lastName: true } },
          events: true,
        },
      },
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // Compute stats
  const totalSent = campaign.recipients.filter((r) => r.status === "sent").length;
  const totalFailed = campaign.recipients.filter((r) => r.status === "failed").length;
  const totalOpened = campaign.recipients.filter((r) =>
    r.events.some((e) => e.eventType === "open")
  ).length;
  const totalClicked = campaign.recipients.filter((r) =>
    r.events.some((e) => e.eventType === "click")
  ).length;

  return NextResponse.json({
    ...campaign,
    stats: {
      totalSent,
      totalFailed,
      totalOpened,
      totalClicked,
      openRate: totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : "0",
      clickRate: totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : "0",
    },
  });
}
