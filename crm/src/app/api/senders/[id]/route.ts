import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const sender = await prisma.emailSender.update({
    where: { id: parseInt(id) },
    data: body,
    select: { id: true, displayName: true, email: true, smtpUser: true, isActive: true, createdAt: true },
  });

  return NextResponse.json(sender);
}
