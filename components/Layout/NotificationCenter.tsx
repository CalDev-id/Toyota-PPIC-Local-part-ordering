"use client";

import type { NotificationStreamItem } from "@/lib/notification-events";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type NotificationState = {
  active: NotificationStreamItem[];
  history: NotificationStreamItem[];
  unreadCount: number;
};

type NotificationCenterProps = {
  enabled: boolean;
};

const emptyState: NotificationState = {
  active: [],
  history: [],
  unreadCount: 0,
};

export default function NotificationCenter({ enabled }: NotificationCenterProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [state, setState] = useState<NotificationState>(emptyState);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setState(emptyState);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadNotifications(showLoading: boolean) {
      try {
        if (showLoading) {
          setLoading(true);
        }
        const res = await fetch("/api/notifications", { cache: "no-store" });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error ?? "Gagal mengambil notifikasi");
        }

        if (!cancelled) {
          setState(data);
          setError("");
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Gagal mengambil notifikasi");
        }
      } finally {
        if (!cancelled && showLoading) {
          setLoading(false);
        }
      }
    }

    void loadNotifications(true);

    function syncIfVisible(showLoading = false) {
      if (document.visibilityState === "visible") {
        void loadNotifications(showLoading);
      }
    }

    function handleVisibilityChange() {
      syncIfVisible(false);
    }

    function handleFocus() {
      syncIfVisible(false);
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    pollingRef.current = setInterval(() => {
      syncIfVisible(false);
    }, 30000);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const source = new EventSource("/api/notifications/stream");

    source.onmessage = (event) => {
      const item = JSON.parse(event.data) as NotificationStreamItem;
      setState((current) => applyIncomingNotification(current, item));
    };

    source.onerror = () => {
      setError((current) => current || "Koneksi notifikasi sedang terputus");
    };

    source.onopen = () => {
      setError("");
    };

    return () => {
      source.close();
    };
  }, [enabled]);

  const hasNotifications = state.history.length > 0;
  const activeItems = useMemo(() => state.active.slice(0, 5), [state.active]);
  const historyGroups = useMemo(() => groupNotificationsByRelativeDay(state.history), [state.history]);

  async function handleDismiss(recipientId: string, shouldRefresh = false) {
    const previousState = state;
    setState((current) => dismissNotificationLocally(current, recipientId));

    try {
      const res = await fetch(`/api/notifications/${recipientId}/dismiss`, {
        method: "PATCH",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Gagal dismiss notifikasi");
      }

      setState((current) => applyIncomingNotification(current, data.item));
      if (shouldRefresh) {
        router.refresh();
      }
    } catch (dismissError) {
      setState(previousState);
      setError(dismissError instanceof Error ? dismissError.message : "Gagal dismiss notifikasi");
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 shadow-sm transition hover:border-sky-500 hover:text-sky-600"
        aria-label="Open notifications"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V10a6 6 0 1 0-12 0v4.2a2 2 0 0 1-.6 1.4L4 17h5" />
          <path d="M10 17a2 2 0 0 0 4 0" />
        </svg>
        {state.unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
            {state.unreadCount > 99 ? "99+" : state.unreadCount}
          </span>
        ) : null}
      </button>

      {activeItems.length > 0 ? (
        <div className="absolute right-0 top-14 z-40 flex w-80 flex-col gap-3">
          {activeItems.map((item) => (
            <div
              key={item.recipientId}
              className="rounded-2xl border border-sky-200 bg-white/95 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.14)] backdrop-blur"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">{getNotificationLabel(item.type)}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{item.message}</p>
                  <p className="mt-2 text-xs text-slate-500">{formatNotificationTime(item.createdAt)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDismiss(item.recipientId, true)}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label={`Dismiss ${item.kodeOrder}`}
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {open ? (
        <div className="absolute right-0 top-14 z-50 w-[24rem] rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.14)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Notification Center</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900">Riwayat Notifikasi</h3>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {state.history.length} item
            </span>
          </div>

          {loading ? <p className="mt-4 text-sm text-slate-500">Memuat notifikasi...</p> : null}
          {!loading && error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
          {!loading && !error && !hasNotifications ? (
            <p className="mt-4 text-sm text-slate-500">Belum ada notifikasi.</p>
          ) : null}

          {!loading && hasNotifications ? (
            <div className="mt-4 max-h-[26rem] space-y-3 overflow-y-auto pr-1">
              {historyGroups.map((group) => (
                <div key={group.label} className="space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    {group.label}
                  </p>
                  {group.items.map((item) => (
                    <div
                      key={item.recipientId}
                      className={`rounded-2xl border px-4 py-3 ${
                        item.isRead
                          ? "border-slate-200 bg-slate-50"
                          : "border-sky-200 bg-sky-50/70"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{item.message}</p>
                          <p className="mt-1 text-xs text-slate-500">{formatNotificationTime(item.createdAt)}</p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
                            item.dismissedAt
                              ? "bg-slate-200 text-slate-600"
                              : item.isRead
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-sky-100 text-sky-700"
                          }`}
                        >
                          {item.dismissedAt ? "dismissed" : item.isRead ? "read" : "new"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function applyIncomingNotification(current: NotificationState, incoming: NotificationStreamItem): NotificationState {
  const previousItem = current.history.find((item) => item.recipientId === incoming.recipientId);
  const nextUnreadCount =
    current.unreadCount +
    (previousItem ? 0 : incoming.isRead ? 0 : 1) -
    (previousItem && !previousItem.isRead && incoming.isRead ? 1 : 0);

  const history = upsertNotification(current.history, incoming);
  const active = incoming.dismissedAt === null
    ? upsertNotification(current.active, incoming)
    : current.active.filter((item) => item.recipientId !== incoming.recipientId);

  return {
    history,
    active,
    unreadCount: Math.max(0, nextUnreadCount),
  };
}

function dismissNotificationLocally(current: NotificationState, recipientId: string): NotificationState {
  const history = current.history.map((item) =>
    item.recipientId === recipientId
      ? {
          ...item,
          isRead: true,
          readAt: item.readAt ?? new Date().toISOString(),
          dismissedAt: new Date().toISOString(),
        }
      : item
  );

  const target = current.history.find((item) => item.recipientId === recipientId);

  return {
    history,
    active: current.active.filter((item) => item.recipientId !== recipientId),
    unreadCount: target && !target.isRead ? Math.max(0, current.unreadCount - 1) : current.unreadCount,
  };
}

function upsertNotification(items: NotificationStreamItem[], incoming: NotificationStreamItem) {
  const nextItems = [incoming, ...items.filter((item) => item.recipientId !== incoming.recipientId)];
  return nextItems.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

function formatNotificationTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getNotificationLabel(type: NotificationStreamItem["type"]) {
  if (type === "ORDER_CREATED") {
    return "Order Baru";
  }

  if (type === "DELIVERY_CONFIRMED") {
    return "Delivery Confirmed";
  }

  return "Receiving Checked";
}

function groupNotificationsByRelativeDay(items: NotificationStreamItem[]) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const todayItems: NotificationStreamItem[] = [];
  const yesterdayItems: NotificationStreamItem[] = [];

  for (const item of items) {
    const createdAt = new Date(item.createdAt);

    if (createdAt >= todayStart) {
      todayItems.push(item);
      continue;
    }

    if (createdAt >= yesterdayStart) {
      yesterdayItems.push(item);
    }
  }

  return [
    { label: "Today", items: todayItems },
    { label: "Yesterday", items: yesterdayItems },
  ].filter((group) => group.items.length > 0);
}
