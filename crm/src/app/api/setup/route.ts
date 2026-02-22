import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export async function GET() {
  try {
    const userCount = await prisma.user.count();

    if (userCount > 0) {
      return NextResponse.json(
        { error: "Setup already completed. Admin user exists." },
        { status: 403 }
      );
    }

    const passwordHash = await hashPassword("Lib12345");

    const user = await prisma.user.create({
      data: {
        name: "Sanhanat P",
        email: "sanhanat_p@libcon.co.jp",
        passwordHash,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Admin user created successfully",
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Setup failed: " + (error instanceof Error ? error.message : "Unknown error") },
      { status: 500 }
    );
  }
}
