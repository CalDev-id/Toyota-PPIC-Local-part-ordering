"use client";

import type {
  OrderItemSummary,
  OrderingFilter,
  OrderingFilterOptions,
  OrderReportRow,
} from "@/lib/order-report";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

type OrderingReportShellProps = {
  rows: OrderReportRow[];
  summaries: OrderItemSummary[];
  selectedFilter: OrderingFilter;
  filterOptions: OrderingFilterOptions;
  errorMessage?: string | null;
  successMessage?: string | null;
};

const OrderingReport = dynamic(() => import("@/components/ordering/OrderingReport"), {
  ssr: false,
  loading: () => (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <p className="text-sm text-slate-500">Memuat report ordering...</p>
      </div>
    </section>
  ),
});

export default function OrderingReportShell(props: OrderingReportShellProps) {
  const [dismissedMessage, setDismissedMessage] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastMessage =
    props.successMessage && props.successMessage !== dismissedMessage ? props.successMessage : "";

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!props.successMessage) {
      return;
    }

    timeoutRef.current = setTimeout(() => {
      setDismissedMessage(props.successMessage ?? null);
      timeoutRef.current = null;
    }, 3200);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [props.successMessage]);

  return (
    <>
      <OrderingReport {...props} />
      {toastMessage ? (
        <div className="fixed right-4 bottom-4 z-[100] max-w-sm">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 shadow-lg">
            <p className="text-sm font-semibold">Berhasil</p>
            <p className="mt-1 text-sm">{toastMessage}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
