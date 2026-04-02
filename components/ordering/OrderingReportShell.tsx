"use client";

import type { OrderItemSummary, OrderReportRow } from "@/lib/order-report";
import dynamic from "next/dynamic";

type OrderingReportShellProps = {
  rows: OrderReportRow[];
  summaries: OrderItemSummary[];
  selectedMonth: string;
  errorMessage?: string | null;
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
  return <OrderingReport {...props} />;
}
