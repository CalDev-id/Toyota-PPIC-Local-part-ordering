import DefaultLayout from "@/components/Layout/DefaultLayout";
import ReceivingReportShell from "@/components/receiving/ReceivingReportShell";
import {
  getReceivingPageData,
  resolveOrderingContext,
  type OrderingFilter,
  type OrderingFilterOptions,
  type ReceivingQueueRow,
  type ReceivingSummary,
} from "@/lib/receiving-report";
import { requireRole } from "@/lib/session";

type ReceivingPageProps = {
  searchParams?: Promise<{
    date?: string;
    shift?: string;
    dayNight?: string;
  }>;
};

export default async function ReceivingPage({ searchParams }: ReceivingPageProps) {
  await requireRole(["ADMIN", "RECEIVING"]);

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { filter: selectedFilter, options } = await resolveOrderingContext({
    date: resolvedSearchParams?.date,
    shift: resolvedSearchParams?.shift,
    dayNight: resolvedSearchParams?.dayNight,
  });

  const filterOptions: OrderingFilterOptions = options;
  const activeFilter: OrderingFilter = selectedFilter;
  let errorMessage: string | null = null;
  let activeOrders: ReceivingQueueRow[] = [];
  let finishedOrders: ReceivingQueueRow[] = [];
  let summary: ReceivingSummary[] = [];

  try {
    const receivingData = await getReceivingPageData(selectedFilter);
    activeOrders = receivingData.activeOrders;
    finishedOrders = receivingData.finishedOrders;
    summary = receivingData.summary;
  } catch (error) {
    console.error("Failed to load receiving queue", error);
    errorMessage =
      error instanceof Error
        ? `Data receiving belum bisa dimuat: ${error.message}`
        : "Data receiving belum bisa dimuat.";
  }

  return (
    <DefaultLayout>
      <div>
        <ReceivingReportShell
          activeOrders={activeOrders}
          finishedOrders={finishedOrders}
          summary={summary}
          selectedFilter={activeFilter}
          filterOptions={filterOptions}
          errorMessage={errorMessage}
        />
      </div>
    </DefaultLayout>
  );
}
