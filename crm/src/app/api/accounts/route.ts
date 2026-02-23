import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ROWS_PER_PAGE } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1");
  const search = searchParams.get("search") || "";
  const sortBy = searchParams.get("sortBy") || "name";
  const sortDir = (searchParams.get("sortDir") || "asc") as "asc" | "desc";
  const accountStatus = searchParams.get("accountStatus") || "";
  const industry = searchParams.get("industry") || "";
  const national = searchParams.get("national") || "";
  const target = searchParams.get("target") || "";
  const libPic = searchParams.get("libPic") || "";

  const exportAll = searchParams.get("all") === "true";
  const filtersParam = searchParams.get("filters") || "";

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { industry: { contains: search } },
      { phone: { contains: search } },
    ];
  }

  if (accountStatus) where.accountStatus = accountStatus;
  if (industry) where.industry = industry;
  if (national) where.national = national;
  if (target) where.target = target;
  if (libPic) where.libPic = libPic;

  // Custom filters: JSON array of { field, operator, value }
  if (filtersParam) {
    try {
      const filters = JSON.parse(filtersParam) as { field: string; operator: string; value: string }[];
      const andConditions: Record<string, unknown>[] = [];
      for (const f of filters) {
        if (!f.field) continue;
        switch (f.operator) {
          case "contains":
            andConditions.push({ [f.field]: { contains: f.value } });
            break;
          case "equals":
            andConditions.push({ [f.field]: f.value });
            break;
          case "not_equals":
            andConditions.push({ [f.field]: { not: f.value } });
            break;
          case "is_empty":
            andConditions.push({ [f.field]: null });
            break;
          case "is_not_empty":
            andConditions.push({ [f.field]: { not: null } });
            break;
        }
      }
      if (andConditions.length > 0) {
        where.AND = andConditions;
      }
    } catch { /* ignore invalid JSON */ }
  }

  const [accounts, total] = await Promise.all([
    prisma.account.findMany({
      where,
      orderBy: { [sortBy]: sortDir },
      ...(exportAll ? {} : { skip: (page - 1) * ROWS_PER_PAGE, take: ROWS_PER_PAGE }),
    }),
    prisma.account.count({ where }),
  ]);

  return NextResponse.json({
    data: accounts,
    total,
    page,
    totalPages: Math.ceil(total / ROWS_PER_PAGE),
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  if (!body.id) {
    body.id = `ACC${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
  }

  const account = await prisma.account.create({
    data: {
      id: body.id,
      name: body.name,
      type: body.type || null,
      parentId: body.parentId || null,
      billingStreet: body.billingStreet || null,
      billingCity: body.billingCity || null,
      billingState: body.billingState || null,
      billingPostalCode: body.billingPostalCode || null,
      billingCountry: body.billingCountry || null,
      phone: body.phone || null,
      website: body.website || null,
      industry: body.industry || null,
      annualRevenue: body.annualRevenue ? parseFloat(body.annualRevenue) : null,
      numberOfEmployees: body.numberOfEmployees ? parseInt(body.numberOfEmployees) : null,
      description: body.description || null,
      rating: body.rating || null,
      accountSource: body.accountSource || null,
      accountStatus: body.accountStatus || null,
      libPic: body.libPic || null,
      lastContactDate: body.lastContactDate || null,
      execTouchpoint: body.execTouchpoint || null,
      supplyChain: body.supplyChain || null,
      numberOfProjects: body.numberOfProjects ? parseInt(body.numberOfProjects) : null,
      totalRevenue: body.totalRevenue ? parseFloat(body.totalRevenue) : null,
      note: body.note || null,
      target: body.target || null,
      highestTitle: body.highestTitle || null,
      national: body.national || null,
      accountIdCustom: body.accountIdCustom || null,
      juristicId: body.juristicId || null,
      createdDate: new Date(),
      lastModifiedDate: new Date(),
    },
  });

  return NextResponse.json(account, { status: 201 });
}
