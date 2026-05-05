import DefaultLayout from "@/components/Layout/DefaultLayout";
import OrderingReportShell from "@/components/ordering/OrderingReportShell";
import {
  buildOrderItemSummaries,
  getOrderReportRows,
  resolveOrderingContext,
  type OrderingFilter,
  type OrderingFilterOptions,
  type OrderReportRow,
} from "@/lib/order-report";
import { requireRole } from "@/lib/session";

type OrderingPageProps = {
  searchParams?: Promise<{
    date?: string;
    shift?: string;
    dayNight?: string;
    success?: string;
  }>;
};

export default async function OrderingPage({ searchParams }: OrderingPageProps) {
  await requireRole(["ADMIN", "ORDERING"]);

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
    const reportRows = await getOrderReportRows(selectedFilter);
    rows = reportRows;
  } catch (error) {
    console.error("Failed to load ordering report", error);
    errorMessage =
      error instanceof Error
        ? `Data report belum bisa dimuat: ${error.message}`
        : "Data report belum bisa dimuat.";
  }

  const summaries = await buildOrderItemSummaries(rows, activeFilter);

  return (
    <DefaultLayout>
      <div>
        <OrderingReportShell
          rows={rows}
          summaries={summaries}
          selectedFilter={activeFilter}
          filterOptions={filterOptions}
          errorMessage={errorMessage}
          successMessage={resolvedSearchParams?.success}
        />
      </div>
    </DefaultLayout>
  );
}
