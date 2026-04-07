import type { AppRole } from "@/lib/roles";
import type { NotificationType } from "@prisma/client";

export type NotificationStreamItem = {
  recipientId: string;
  notificationId: string;
  type: NotificationType;
  title: string;
  message: string;
  kodeOrder: string;
  orderId: string | null;
  targetRole: AppRole;
  isRead: boolean;
  dismissedAt: string | null;
  readAt: string | null;
  createdAt: string;
};

type NotificationEventListener = (payload: NotificationStreamItem) => void;

const globalForNotificationEvents = globalThis as typeof globalThis & {
  notificationListeners?: Map<string, Set<NotificationEventListener>>;
};

function getListenerStore() {
  if (!globalForNotificationEvents.notificationListeners) {
    globalForNotificationEvents.notificationListeners = new Map();
  }

  return globalForNotificationEvents.notificationListeners;
}

export function subscribeToNotificationEvents(userId: string, listener: NotificationEventListener) {
  const store = getListenerStore();
  const listeners = store.get(userId) ?? new Set<NotificationEventListener>();
  listeners.add(listener);
  store.set(userId, listeners);

  return () => {
    const currentListeners = store.get(userId);
    if (!currentListeners) {
      return;
    }

    currentListeners.delete(listener);
    if (currentListeners.size === 0) {
      store.delete(userId);
    }
  };
}

export function publishNotificationEvent(userId: string, payload: NotificationStreamItem) {
  const listeners = getListenerStore().get(userId);
  if (!listeners) {
    return;
  }

  for (const listener of listeners) {
    listener(payload);
  }
}
