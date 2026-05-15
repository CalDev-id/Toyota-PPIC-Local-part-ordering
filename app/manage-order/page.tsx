import DefaultLayout from "@/components/Layout/DefaultLayout";
import ManageOrderPageClient from "@/components/manage-order/ManageOrderPageClient";
import {
  buildOrderItemSummaries,
  getOrderReportRows,
  resolveOrderingContext,
  type OrderingFilter,
  type OrderingFilterOptions,
  type OrderReportRow,
} from "@/lib/order-report";
import { requireRole } from "@/lib/session";

type ManageOrderPageProps = {
  searchParams?: Promise<{
    date?: string;
    shift?: string;
    dayNight?: string;
  }>;
};

export default async function ManageOrderPage({ searchParams }: ManageOrderPageProps) {
  await requireRole(["ADMIN"]);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { filter: selectedFilter, options } = await resolveOrderingContext({
    date: resolvedSearchParams?.date,
    shift: resolvedSearchParams?.shift,
    dayNight: resolvedSearchParams?.dayNight,
  });

  let rows: OrderReportRow[] = [];
  const filterOptions: OrderingFilterOptions = options;
  const activeFilter: OrderingFilter = selectedFilter;
  let errorMessage: string | null = null;

  try {
    rows = await getOrderReportRows(selectedFilter);
  } catch (error) {
    console.error("Failed to load manage order rows", error);
    errorMessage =
      error instanceof Error
        ? `Data order belum bisa dimuat: ${error.message}`
        : "Data order belum bisa dimuat.";
  }

  const summaries = await buildOrderItemSummaries(rows, activeFilter);
  return (
    <DefaultLayout>
      <ManageOrderPageClient
        rows={rows}
        summaries={summaries}
        selectedFilter={activeFilter}
        filterOptions={filterOptions}
        selectedStatus="ALL"
        selectedTruckType="ALL"
        errorMessage={errorMessage}
      />
    </DefaultLayout>
  );
}
