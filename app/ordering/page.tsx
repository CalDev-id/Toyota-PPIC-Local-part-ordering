import DefaultLayout from "@/components/Layout/DefaultLayout";
import OrderingReportShell from "@/components/ordering/OrderingReportShell";
import {
  buildOrderItemSummaries,
  getOrderingFilterOptions,
  getOrderReportRows,
  normalizeOrderingFilter,
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
  const selectedFilter = await normalizeOrderingFilter({
    date: resolvedSearchParams?.date,
    shift: resolvedSearchParams?.shift,
    dayNight: resolvedSearchParams?.dayNight,
  });

  let rows: OrderReportRow[] = [];
  let filterOptions: OrderingFilterOptions = { dates: [], shifts: [], dayNights: [] };
  const activeFilter: OrderingFilter = selectedFilter;
  let errorMessage: string | null = null;

  try {
    const [reportRows, options] = await Promise.all([
      getOrderReportRows(selectedFilter),
      getOrderingFilterOptions(),
    ]);
    rows = reportRows;
    filterOptions = options;
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
      <div key={`${activeFilter.date}-${activeFilter.shift}-${activeFilter.dayNight}`}>
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
