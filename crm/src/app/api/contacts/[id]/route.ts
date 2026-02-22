import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const contact = await prisma.contact.findUnique({
    where: { id },
    include: {
      account: { select: { id: true, name: true } },
      reportsTo: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const customValues = await prisma.customFieldValue.findMany({
    where: { entity: "contact", recordId: id },
    include: { fieldDefinition: true },
  });

  return NextResponse.json({ ...contact, customFields: customValues });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const { customFieldValues, account, reportsTo, customFields, ...contactData } = body;

  contactData.lastModifiedDate = new Date();

  // Ensure booleans are proper
  if (contactData.hasOptedOutOfEmail !== undefined)
    contactData.hasOptedOutOfEmail = Boolean(contactData.hasOptedOutOfEmail);
  if (contactData.doNotCall !== undefined)
    contactData.doNotCall = Boolean(contactData.doNotCall);
  if (contactData.executiveOrNot !== undefined)
    contactData.executiveOrNot = Boolean(contactData.executiveOrNot);
  if (contactData.worthFollowing !== undefined)
    contactData.worthFollowing = Boolean(contactData.worthFollowing);
  if (contactData.doNotSendWhitepaper !== undefined)
    contactData.doNotSendWhitepaper = Boolean(contactData.doNotSendWhitepaper);

  const contact = await prisma.contact.update({
    where: { id },
    data: contactData,
  });

  if (customFieldValues && typeof customFieldValues === "object") {
    for (const [fieldId, value] of Object.entries(customFieldValues)) {
      const defId = parseInt(fieldId);
      const def = await prisma.customFieldDefinition.findUnique({
        where: { id: defId },
      });
      if (!def) continue;

      const data: Record<string, unknown> = {
        fieldDefinitionId: defId,
        entity: "contact",
        recordId: id,
        updatedAt: new Date(),
      };

      if (def.fieldType === "boolean") {
        data.valueBoolean = value ? 1 : 0;
      } else if (def.fieldType === "number" || def.fieldType === "integer") {
        data.valueNumber = value ? parseFloat(String(value)) : null;
      } else {
        data.valueText = value ? String(value) : null;
      }

      await prisma.customFieldValue.upsert({
        where: {
          fieldDefinitionId_recordId: { fieldDefinitionId: defId, recordId: id },
        },
        create: data as any,
        update: data as any,
      });
    }
  }

  return NextResponse.json(contact);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await prisma.contact.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }
}
