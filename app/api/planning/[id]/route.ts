import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  normalizePlanningPayload,
  planningRecordToClient,
  toPlanningPrismaData,
  validatePlanningInput,
} from "@/lib/planning";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(req: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ORDERING" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const input = normalizePlanningPayload(await req.json());
    const validationMessage = validatePlanningInput(input);

    if (validationMessage) {
      return NextResponse.json({ error: validationMessage }, { status: 400 });
    }

    const existing = await prisma.dailyPlanning.findUnique({
      where: { planId: id },
      select: { planId: true, inputBy: true, inputAt: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Planning tidak ditemukan" }, { status: 404 });
    }

    const record = await prisma.dailyPlanning.update({
      where: { planId: id },
      data: {
        ...toPlanningPrismaData(input),
        planId: existing.planId,
        inputBy: existing.inputBy,
        inputAt: existing.inputAt,
      },
    });

    return NextResponse.json(planningRecordToClient(record));
  } catch (error) {
    console.error(error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "Planning untuk tanggal, shift, dan day/night tersebut sudah ada" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Gagal mengubah planning" },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ORDERING" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;

    await prisma.dailyPlanning.delete({
      where: { planId: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Gagal menghapus planning" },
      { status: 500 }
    );
  }
}
