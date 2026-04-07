"use client";

import type {
  DeliveryQueueRow,
  DeliverySummary,
  OrderingFilter,
  OrderingFilterOptions,
} from "@/lib/delivery-report";
import dynamic from "next/dynamic";

type DeliveryReportShellProps = {
  activeOrders: DeliveryQueueRow[];
  finishedOrders: DeliveryQueueRow[];
  summary: DeliverySummary[];
  selectedFilter: OrderingFilter;
  filterOptions: OrderingFilterOptions;
  errorMessage?: string | null;
};

const DeliveryReport = dynamic(() => import("@/components/delivery/DeliveryReport"), {
  ssr: false,
  loading: () => (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <p className="text-sm text-slate-500">Memuat delivery queue...</p>
      </div>
    </section>
  ),
});

export default function DeliveryReportShell(props: DeliveryReportShellProps) {
  return <DeliveryReport {...props} />;
}
