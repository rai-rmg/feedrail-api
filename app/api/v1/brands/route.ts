import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface AuthenticatedRequest extends NextRequest {
  user?: { id: string; email: string };
}

export async function POST(req: AuthenticatedRequest) {
  try {
    const user = req.user!;
    const body = await req.json();
    const { name, clientRefId } = body;

    if (!name) {
      return NextResponse.json({ error: "Missing required field: name" }, { status: 400 });
    }

    // Vérifier unicité par user
    const existingBrand = await prisma.brand.findFirst({
      where: { userId: user.id, name }
    });

    if (existingBrand) {
      return NextResponse.json({ error: "Brand with this name already exists" }, { status: 409 });
    }

    // Créer la Brand
    const brand = await prisma.brand.create({
      data: {
        name,
        clientRefId,
        userId: user.id
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: brand.id,
        name: brand.name,
        clientRefId: brand.clientRefId,
        userId: brand.userId
      }
    });

  } catch (error: unknown) {
    console.error("Create brand error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}