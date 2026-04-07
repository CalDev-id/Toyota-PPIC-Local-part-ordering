import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  createPlanId,
  normalizePlanningPayload,
  planningRecordToClient,
  toPlanningPrismaData,
  validatePlanningInput,
} from "@/lib/planning";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ORDERING" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const records = await prisma.dailyPlanning.findMany({
      orderBy: [{ tanggal: "desc" }, { shift: "asc" }, { dayNight: "asc" }],
    });

    return NextResponse.json(records.map(planningRecordToClient));
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Gagal mengambil data planning" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ORDERING" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const input = normalizePlanningPayload(await req.json());
    const validationMessage = validatePlanningInput(input);

    if (validationMessage) {
      return NextResponse.json({ error: validationMessage }, { status: 400 });
    }

    const planId = createPlanId(input.tanggal, input.shift);
    const inputBy = session.user.name?.trim() || session.user.email || null;

    const record = await prisma.dailyPlanning.create({
      data: {
        ...toPlanningPrismaData(input),
        planId,
        inputBy,
        inputAt: new Date(),
      },
    });

    return NextResponse.json(planningRecordToClient(record), { status: 201 });
  } catch (error) {
    console.error(error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "Planning untuk tanggal, shift, dan day/night tersebut sudah ada" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Gagal membuat planning" },
      { status: 500 }
    );
  }
}
