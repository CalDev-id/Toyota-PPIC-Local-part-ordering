import { authOptions } from "@/auth";
import { getNotificationsForUser } from "@/lib/notifications";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await getNotificationsForUser(session.user.id);
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal mengambil notifikasi" }, { status: 500 });
  }
}
