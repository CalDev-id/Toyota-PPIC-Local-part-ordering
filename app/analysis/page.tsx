import DefaultLayout from "@/components/Layout/DefaultLayout";
import AnalysisDashboard from "@/components/analysis/AnalysisDashboard";
import {
  getAnalysisDashboardData,
  resolveAnalysisContext,
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
  const { filter: selectedFilter, options } = await resolveAnalysisContext({
    date: resolvedSearchParams?.date,
    shift: resolvedSearchParams?.shift,
    dayNight: resolvedSearchParams?.dayNight,
  });

  const filterOptions: AnalysisFilterOptions = options;
  let dashboardData: AnalysisDashboardData = {
    volumeOrderHarian: [],
    requestVsConfirmedPerItem: [],
    planRequestConfirmedWeekly: [],
  };
  const activeFilter: AnalysisFilter = selectedFilter;
  let errorMessage: string | null = null;

  try {
    const data = await getAnalysisDashboardData(selectedFilter);

    dashboardData = data;
  } catch (error) {
    console.error("Failed to load analysis dashboard", error);
    errorMessage =
      error instanceof Error
        ? `Data analysis belum bisa dimuat: ${error.message}`
        : "Data analysis belum bisa dimuat.";
  }

  return (
    <DefaultLayout>
      <div>
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
