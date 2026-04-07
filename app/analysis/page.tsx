import DefaultLayout from "@/components/Layout/DefaultLayout";
import AnalysisDashboard from "@/components/analysis/AnalysisDashboard";
import {
  getAnalysisDashboardData,
  getAnalysisFilterOptions,
  normalizeAnalysisFilter,
  type AnalysisDashboardData,
  type AnalysisFilter,
  type AnalysisFilterOptions,
} from "@/lib/analysis";
import { requireSession } from "@/lib/session";

type AnalysisPageProps = {
  searchParams?: Promise<{
    date?: string;
    shift?: string;
    dayNight?: string;
  }>;
};

export default async function AnalysisPage({ searchParams }: AnalysisPageProps) {
  await requireSession();

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const selectedFilter = await normalizeAnalysisFilter({
    date: resolvedSearchParams?.date,
    shift: resolvedSearchParams?.shift,
    dayNight: resolvedSearchParams?.dayNight,
  });

  let filterOptions: AnalysisFilterOptions = { dates: [], shifts: [], dayNights: [] };
  let dashboardData: AnalysisDashboardData = {
    volumeOrderHarian: [],
    requestVsConfirmedPerItem: [],
  };
  const activeFilter: AnalysisFilter = selectedFilter;
  let errorMessage: string | null = null;

  try {
    const [data, options] = await Promise.all([
      getAnalysisDashboardData(selectedFilter),
      getAnalysisFilterOptions(),
    ]);

    dashboardData = data;
    filterOptions = options;
  } catch (error) {
    console.error("Failed to load analysis dashboard", error);
    errorMessage =
      error instanceof Error
        ? `Data analysis belum bisa dimuat: ${error.message}`
        : "Data analysis belum bisa dimuat.";
  }

  return (
    <DefaultLayout>
      <div key={`${activeFilter.date}-${activeFilter.shift}-${activeFilter.dayNight}`}>
        <AnalysisDashboard
          data={dashboardData}
          selectedFilter={activeFilter}
          filterOptions={filterOptions}
          errorMessage={errorMessage}
        />
      </div>
    </DefaultLayout>
  );
}
