"use client";

import type {
  OrderingFilter,
  OrderingFilterOptions,
  ReceivingQueueRow,
  ReceivingSummary,
} from "@/lib/receiving-report";
import dynamic from "next/dynamic";

type ReceivingReportShellProps = {
  activeOrders: ReceivingQueueRow[];
  finishedOrders: ReceivingQueueRow[];
  summary: ReceivingSummary[];
  selectedFilter: OrderingFilter;
  filterOptions: OrderingFilterOptions;
  errorMessage?: string | null;
};

const ReceivingReport = dynamic(() => import("@/components/receiving/ReceivingReport"), {
  ssr: false,
  loading: () => (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <p className="text-sm text-slate-500">Memuat receiving queue...</p>
      </div>
    </section>
  ),
});

export default function ReceivingReportShell(props: ReceivingReportShellProps) {
  return <ReceivingReport {...props} />;
}
