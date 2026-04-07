import { authOptions } from "@/auth";
import { subscribeToNotificationEvents } from "@/lib/notification-events";
import { getServerSession } from "next-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const write = async (chunk: string) => {
    await writer.write(encoder.encode(chunk));
  };

  const unsubscribe = subscribeToNotificationEvents(session.user.id, (payload) => {
    void write(`data: ${JSON.stringify(payload)}\n\n`);
  });

  const heartbeat = setInterval(() => {
    void write(": keepalive\n\n");
  }, 15000);

  request.signal.addEventListener("abort", () => {
    clearInterval(heartbeat);
    unsubscribe();
    void writer.close();
  });

  await write(": connected\n\n");

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
