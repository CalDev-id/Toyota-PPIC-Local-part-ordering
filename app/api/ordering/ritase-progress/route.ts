import { authOptions } from "@/auth";
import { getNextRitaseCard, getRitaseSchedule, normalizeRitaseDayNight } from "@/lib/ritase-schedule";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ORDERING" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date")?.trim() || "";
    const dayNight = normalizeRitaseDayNight(searchParams.get("dayNight"));
    const excludeOrderId = searchParams.get("excludeOrderId")?.trim() || "";

    if (!date || !dayNight) {
      return NextResponse.json({ error: "Tanggal dan Day / Night wajib diisi" }, { status: 400 });
    }

    const orderCount = await prisma.orderHeader.count({
      where: {
        tanggalOrder: new Date(`${date}T00:00:00.000Z`),
        dayNight,
        requestType: "ORDER",
        ...(excludeOrderId ? { orderId: { not: excludeOrderId } } : {}),
      },
    });

    return NextResponse.json({
      orderCount,
      nextRitase: getNextRitaseCard(dayNight, orderCount),
      schedule: getRitaseSchedule(dayNight),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal mengambil progress ritase" }, { status: 500 });
  }
}
