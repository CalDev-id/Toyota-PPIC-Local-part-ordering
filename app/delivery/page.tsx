import DefaultLayout from "@/components/Layout/DefaultLayout";
import DeliveryReportShell from "@/components/delivery/DeliveryReportShell";
import {
  type DeliveryQueueRow,
  type DeliverySummary,
  getDeliveryPageData,
  getOrderingFilterOptions,
  normalizeOrderingFilter,
  type OrderingFilter,
  type OrderingFilterOptions,
} from "@/lib/delivery-report";
import { requireRole } from "@/lib/session";

type DeliveryPageProps = {
  searchParams?: Promise<{
    date?: string;
    shift?: string;
    dayNight?: string;
  }>;
};

export default async function DeliveryPage({ searchParams }: DeliveryPageProps) {
  await requireRole(["ADMIN", "DELIVERY"]);

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const selectedFilter = await normalizeOrderingFilter({
    date: resolvedSearchParams?.date,
    shift: resolvedSearchParams?.shift,
    dayNight: resolvedSearchParams?.dayNight,
  });

  let filterOptions: OrderingFilterOptions = { dates: [], shifts: [], dayNights: [] };
  const activeFilter: OrderingFilter = selectedFilter;
  let errorMessage: string | null = null;
  let activeOrders: DeliveryQueueRow[] = [];
  let finishedOrders: DeliveryQueueRow[] = [];
  let summary: DeliverySummary[] = [];

  try {
    const [deliveryData, options] = await Promise.all([
      getDeliveryPageData(selectedFilter),
      getOrderingFilterOptions(),
    ]);

    activeOrders = deliveryData.activeOrders;
    finishedOrders = deliveryData.finishedOrders;
    summary = deliveryData.summary;
    filterOptions = options;
  } catch (error) {
    console.error("Failed to load delivery queue", error);
    errorMessage =
      error instanceof Error
        ? `Data delivery belum bisa dimuat: ${error.message}`
        : "Data delivery belum bisa dimuat.";
  }

  return (
    <DefaultLayout>
      <div key={`${activeFilter.date}-${activeFilter.shift}-${activeFilter.dayNight}`}>
        <DeliveryReportShell
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
