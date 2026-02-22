import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entity = request.nextUrl.searchParams.get("entity") || "";
  const recordId = request.nextUrl.searchParams.get("recordId") || "";

  if (!entity || !recordId) {
    return NextResponse.json({ error: "Entity and recordId required" }, { status: 400 });
  }

  const values = await prisma.customFieldValue.findMany({
    where: { entity, recordId },
    include: { fieldDefinition: true },
  });

  return NextResponse.json(values);
}
