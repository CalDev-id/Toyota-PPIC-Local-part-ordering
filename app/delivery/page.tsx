import DefaultLayout from "@/components/Layout/DefaultLayout";
import DeliveryReportShell from "@/components/delivery/DeliveryReportShell";
import {
  type DeliveryQueueRow,
  type DeliverySummary,
  getDeliveryPageData,
  resolveOrderingContext,
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
  const { filter: selectedFilter, options } = await resolveOrderingContext({
    date: resolvedSearchParams?.date,
    shift: resolvedSearchParams?.shift,
    dayNight: resolvedSearchParams?.dayNight,
  });

  const filterOptions: OrderingFilterOptions = options;
  const activeFilter: OrderingFilter = selectedFilter;
  let errorMessage: string | null = null;
  let activeOrders: DeliveryQueueRow[] = [];
  let finishedOrders: DeliveryQueueRow[] = [];
  let summary: DeliverySummary[] = [];

  try {
    const deliveryData = await getDeliveryPageData(selectedFilter);

    activeOrders = deliveryData.activeOrders;
    finishedOrders = deliveryData.finishedOrders;
    summary = deliveryData.summary;
  } catch (error) {
    console.error("Failed to load delivery queue", error);
    errorMessage =
      error instanceof Error
        ? `Data delivery belum bisa dimuat: ${error.message}`
        : "Data delivery belum bisa dimuat.";
  }

  return (
    <DefaultLayout>
      <div>
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
