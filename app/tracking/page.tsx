import DefaultLayout from "@/components/Layout/DefaultLayout";
import TrackingPageClient from "@/components/tracking/TrackingPageClient";
import {
  getTrackingPageData,
  resolveOrderingContext,
  type OrderingFilter,
  type OrderingFilterOptions,
  type TrackingOrderRow,
  type TrackingSummary,
} from "@/lib/tracking-report";
import { requireSession } from "@/lib/session";

type TrackingPageProps = {
  searchParams?: Promise<{
    date?: string;
    shift?: string;
    dayNight?: string;
  }>;
};

export default async function TrackingPage({ searchParams }: TrackingPageProps) {
  await requireSession();

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { filter: selectedFilter, options } = await resolveOrderingContext({
    date: resolvedSearchParams?.date,
    shift: resolvedSearchParams?.shift,
    dayNight: resolvedSearchParams?.dayNight,
  });

  const filterOptions: OrderingFilterOptions = options;
  const activeFilter: OrderingFilter = selectedFilter;
  let errorMessage: string | null = null;
  let rows: TrackingOrderRow[] = [];
  let summary: TrackingSummary = {
    totalOrders: 0,
    submittedOrders: 0,
    confirmedOrders: 0,
    checkedOrders: 0,
  };

  try {
    const trackingData = await getTrackingPageData(selectedFilter);
    rows = trackingData.rows;
    summary = trackingData.summary;
  } catch (error) {
    console.error("Failed to load tracking data", error);
    errorMessage =
      error instanceof Error
        ? `Data tracking belum bisa dimuat: ${error.message}`
        : "Data tracking belum bisa dimuat.";
  }

  return (
    <DefaultLayout>
      <TrackingPageClient
        initialRows={rows}
        initialSummary={summary}
        selectedFilter={activeFilter}
        filterOptions={filterOptions}
        initialErrorMessage={errorMessage}
      />
    </DefaultLayout>
  );
}
