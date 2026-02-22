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
  const sortBy = searchParams.get("sortBy") || "lastName";
  const sortDir = (searchParams.get("sortDir") || "asc") as "asc" | "desc";
  const contactStatus = searchParams.get("contactStatus") || "";
  const personCountry = searchParams.get("personCountry") || "";
  const executiveOrNot = searchParams.get("executiveOrNot");
  const worthFollowing = searchParams.get("worthFollowing");
  const doNotSendWhitepaper = searchParams.get("doNotSendWhitepaper");
  const hasOptedOutOfEmail = searchParams.get("hasOptedOutOfEmail");

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { email: { contains: search } },
      { title: { contains: search } },
    ];
  }

  if (contactStatus) where.contactStatus = contactStatus;
  if (personCountry) where.personCountry = personCountry;
  if (executiveOrNot !== null && executiveOrNot !== undefined && executiveOrNot !== "") {
    where.executiveOrNot = executiveOrNot === "true";
  }
  if (worthFollowing !== null && worthFollowing !== undefined && worthFollowing !== "") {
    where.worthFollowing = worthFollowing === "true";
  }
  if (doNotSendWhitepaper !== null && doNotSendWhitepaper !== undefined && doNotSendWhitepaper !== "") {
    where.doNotSendWhitepaper = doNotSendWhitepaper === "true";
  }
  if (hasOptedOutOfEmail !== null && hasOptedOutOfEmail !== undefined && hasOptedOutOfEmail !== "") {
    where.hasOptedOutOfEmail = hasOptedOutOfEmail === "true";
  }

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      include: {
        account: { select: { id: true, name: true } },
      },
      orderBy: { [sortBy]: sortDir },
      skip: (page - 1) * ROWS_PER_PAGE,
      take: ROWS_PER_PAGE,
    }),
    prisma.contact.count({ where }),
  ]);

  return NextResponse.json({
    data: contacts,
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

  if (!body.firstName || !body.lastName || !body.email) {
    return NextResponse.json(
      { error: "First name, last name, and email are required" },
      { status: 400 }
    );
  }

  if (!body.id) {
    body.id = `CON${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
  }

  const contact = await prisma.contact.create({
    data: {
      id: body.id,
      accountId: body.accountId || null,
      salutation: body.salutation || null,
      firstName: body.firstName,
      lastName: body.lastName,
      middleName: body.middleName || null,
      email: body.email,
      phone: body.phone || null,
      mobilePhone: body.mobilePhone || null,
      title: body.title || null,
      department: body.department || null,
      mailingStreet: body.mailingStreet || null,
      mailingCity: body.mailingCity || null,
      mailingState: body.mailingState || null,
      mailingPostalCode: body.mailingPostalCode || null,
      mailingCountry: body.mailingCountry || null,
      leadSource: body.leadSource || null,
      description: body.description || null,
      hasOptedOutOfEmail: body.hasOptedOutOfEmail || false,
      doNotCall: body.doNotCall || false,
      contactStatus: body.contactStatus || null,
      executiveOrNot: body.executiveOrNot || false,
      rating: body.rating || null,
      titleFormat: body.titleFormat || null,
      worthFollowing: body.worthFollowing || false,
      personCountry: body.personCountry || null,
      doNotSendWhitepaper: body.doNotSendWhitepaper || false,
      reportsToId: body.reportsToId || null,
      createdDate: new Date(),
      lastModifiedDate: new Date(),
    },
  });

  return NextResponse.json(contact, { status: 201 });
}
