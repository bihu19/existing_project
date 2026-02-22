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

  const updateData: Record<string, unknown> = {};
  if (body.label !== undefined) updateData.label = body.label;
  if (body.optionsJson !== undefined) updateData.optionsJson = JSON.stringify(body.optionsJson);
  if (body.isRequired !== undefined) updateData.isRequired = body.isRequired;
  if (body.showInTable !== undefined) updateData.showInTable = body.showInTable;
  if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;

  const field = await prisma.customFieldDefinition.update({
    where: { id: parseInt(id) },
    data: updateData,
  });

  return NextResponse.json(field);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const fieldId = parseInt(id);

  await prisma.customFieldValue.deleteMany({ where: { fieldDefinitionId: fieldId } });
  await prisma.customFieldDefinition.delete({ where: { id: fieldId } });

  return NextResponse.json({ success: true });
}
