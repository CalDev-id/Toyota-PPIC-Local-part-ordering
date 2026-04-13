import { authOptions } from "@/auth";
import { getTrackingPageData, normalizeOrderingFilter } from "@/lib/tracking-report";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const filter = await normalizeOrderingFilter({
      date: searchParams.get("date") ?? undefined,
      shift: searchParams.get("shift") ?? undefined,
      dayNight: searchParams.get("dayNight") ?? undefined,
    });

    const trackingData = await getTrackingPageData(filter);
    return NextResponse.json(trackingData);
  } catch (error) {
    console.error("Failed to load tracking data", error);
    return NextResponse.json({ error: "Gagal mengambil data tracking" }, { status: 500 });
  }
}
