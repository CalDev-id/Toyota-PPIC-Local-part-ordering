import { prisma } from "@/lib/prisma";
import type { AppRole } from "@/lib/roles";
import { publishNotificationEvent, type NotificationStreamItem } from "@/lib/notification-events";
import type { NotificationType } from "@prisma/client";

type CreateRoleNotificationInput = {
  type: NotificationType;
  title: string;
  message: string;
  kodeOrder: string;
  orderId?: string | null;
  targetRole: AppRole;
};

function mapRecipient(record: {
  id: string;
  isRead: boolean;
  readAt: Date | null;
  dismissedAt: Date | null;
  notification: {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    kodeOrder: string;
    orderId: string | null;
    targetRole: AppRole;
    createdAt: Date;
  };
}): NotificationStreamItem {
  return {
    recipientId: record.id,
    notificationId: record.notification.id,
    type: record.notification.type,
    title: record.notification.title,
    message: record.notification.message,
    kodeOrder: record.notification.kodeOrder,
    orderId: record.notification.orderId,
    targetRole: record.notification.targetRole,
    isRead: record.isRead,
    dismissedAt: record.dismissedAt?.toISOString() ?? null,
    readAt: record.readAt?.toISOString() ?? null,
    createdAt: record.notification.createdAt.toISOString(),
  };
}

async function getRecipientUsers(targetRole: AppRole) {
  return prisma.user.findMany({
    where: {
      OR: [{ role: targetRole }, { role: "ADMIN" }],
    },
    select: { id: true },
  });
}

export async function createRoleNotification(input: CreateRoleNotificationInput) {
  const recipients = await getRecipientUsers(input.targetRole);
  if (recipients.length === 0) {
    return null;
  }

  const notification = await prisma.notification.create({
    data: {
      type: input.type,
      title: input.title,
      message: input.message,
      kodeOrder: input.kodeOrder,
      orderId: input.orderId ?? null,
      targetRole: input.targetRole,
      recipients: {
        createMany: {
          data: recipients.map((recipient) => ({
            userId: recipient.id,
          })),
        },
      },
    },
    include: {
      recipients: {
        include: {
          notification: true,
        },
      },
    },
  });

  for (const recipient of notification.recipients) {
    publishNotificationEvent(recipient.userId, mapRecipient(recipient));
  }

  return notification.id;
}

export async function getNotificationsForUser(userId: string) {
  const now = new Date();
  const startOfYesterday = new Date(now);
  startOfYesterday.setHours(0, 0, 0, 0);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const historyRecords = await prisma.notificationRecipient.findMany({
    where: {
      userId,
      notification: {
        createdAt: {
          gte: startOfYesterday,
        },
      },
    },
    include: {
      notification: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const history = historyRecords
    .map(mapRecipient)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  const active = history.filter((item) => item.dismissedAt === null);
  const unreadCount = history.filter((item) => !item.isRead).length;

  return {
    active,
    history,
    unreadCount,
  };
}

export async function dismissNotificationForUser(recipientId: string, userId: string) {
  const existing = await prisma.notificationRecipient.findUnique({
    where: { id: recipientId },
    select: { userId: true },
  });

  if (!existing || existing.userId !== userId) {
    throw new Error("Notifikasi tidak ditemukan");
  }

  const now = new Date();

  const updated = await prisma.notificationRecipient.update({
    where: { id: recipientId },
    data: {
      isRead: true,
      readAt: now,
      dismissedAt: now,
    },
    include: {
      notification: true,
    },
  });

  const mapped = mapRecipient(updated);
  publishNotificationEvent(userId, mapped);
  return mapped;
}
