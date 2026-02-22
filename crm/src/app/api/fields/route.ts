import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { slugify } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entity = request.nextUrl.searchParams.get("entity") || "account";

  const fields = await prisma.customFieldDefinition.findMany({
    where: { entity },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(fields);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { entity, label, fieldType, optionsJson, isRequired, showInTable } = body;

  if (!entity || !label || !fieldType) {
    return NextResponse.json({ error: "Entity, label, and field type are required" }, { status: 400 });
  }

  const fieldKey = "custom_" + slugify(label);

  // Check uniqueness
  const existing = await prisma.customFieldDefinition.findFirst({
    where: { entity, fieldKey },
  });
  if (existing) {
    return NextResponse.json({ error: "A field with this name already exists" }, { status: 400 });
  }

  const maxOrder = await prisma.customFieldDefinition.findFirst({
    where: { entity },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const field = await prisma.customFieldDefinition.create({
    data: {
      entity,
      fieldKey,
      label,
      fieldType,
      optionsJson: optionsJson ? JSON.stringify(optionsJson) : null,
      isRequired: isRequired || false,
      showInTable: showInTable || false,
      sortOrder: (maxOrder?.sortOrder || 0) + 1,
    },
  });

  return NextResponse.json(field, { status: 201 });
}
