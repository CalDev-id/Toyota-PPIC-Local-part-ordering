import { authOptions } from "@/auth";
import { dismissNotificationForUser } from "@/lib/notifications";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    recipientId: string;
  }>;
};

export async function PATCH(_: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { recipientId } = await context.params;
    const item = await dismissNotificationForUser(recipientId, session.user.id);
    return NextResponse.json({ item });
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Gagal dismiss notifikasi" }, { status: 500 });
  }
}
