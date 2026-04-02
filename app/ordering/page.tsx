import DefaultLayout from "@/components/Layout/DefaultLayout";
import OrderingReportShell from "@/components/ordering/OrderingReportShell";
import {
  buildOrderItemSummaries,
  getOrderReportRows,
  normalizeMonthFilter,
  type OrderReportRow,
} from "@/lib/order-report";
import { requireSession } from "@/lib/session";

type OrderingPageProps = {
  searchParams?: Promise<{
    month?: string;
  }>;
};

export default async function OrderingPage({ searchParams }: OrderingPageProps) {
  await requireSession();

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const selectedMonth = normalizeMonthFilter(resolvedSearchParams?.month);

  let rows: OrderReportRow[] = [];
  let errorMessage: string | null = null;

  try {
    rows = await getOrderReportRows(selectedMonth);
  } catch (error) {
    console.error("Failed to load ordering report", error);
    errorMessage =
      error instanceof Error
        ? `Data report belum bisa dimuat: ${error.message}`
        : "Data report belum bisa dimuat.";
  }

  const summaries = buildOrderItemSummaries(rows);

  return (
    <DefaultLayout>
      <div key={selectedMonth}>
        <OrderingReportShell
          rows={rows}
          summaries={summaries}
          selectedMonth={selectedMonth}
          errorMessage={errorMessage}
        />
      </div>
    </DefaultLayout>
  );
}
