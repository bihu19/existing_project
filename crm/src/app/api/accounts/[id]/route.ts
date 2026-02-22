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
  const account = await prisma.account.findUnique({
    where: { id },
    include: {
      contacts: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          title: true,
          contactStatus: true,
        },
      },
      parent: { select: { id: true, name: true } },
    },
  });

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  // Get custom field values
  const customValues = await prisma.customFieldValue.findMany({
    where: { entity: "account", recordId: id },
    include: { fieldDefinition: true },
  });

  return NextResponse.json({ ...account, customFields: customValues });
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

  const { customFieldValues, contacts, parent, customFields, ...accountData } = body;

  // Convert numeric fields
  if (accountData.annualRevenue !== undefined) {
    accountData.annualRevenue = accountData.annualRevenue ? parseFloat(accountData.annualRevenue) : null;
  }
  if (accountData.numberOfEmployees !== undefined) {
    accountData.numberOfEmployees = accountData.numberOfEmployees ? parseInt(accountData.numberOfEmployees) : null;
  }
  if (accountData.numberOfProjects !== undefined) {
    accountData.numberOfProjects = accountData.numberOfProjects ? parseInt(accountData.numberOfProjects) : null;
  }
  if (accountData.totalRevenue !== undefined) {
    accountData.totalRevenue = accountData.totalRevenue ? parseFloat(accountData.totalRevenue) : null;
  }

  accountData.lastModifiedDate = new Date();

  const account = await prisma.account.update({
    where: { id },
    data: accountData,
  });

  // Update custom field values if provided
  if (customFieldValues && typeof customFieldValues === "object") {
    for (const [fieldId, value] of Object.entries(customFieldValues)) {
      const defId = parseInt(fieldId);
      const def = await prisma.customFieldDefinition.findUnique({
        where: { id: defId },
      });
      if (!def) continue;

      const data: Record<string, unknown> = {
        fieldDefinitionId: defId,
        entity: "account",
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

  return NextResponse.json(account);
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
    await prisma.account.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }
}
