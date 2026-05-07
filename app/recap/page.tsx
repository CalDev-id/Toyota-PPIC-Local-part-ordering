import DefaultLayout from "@/components/Layout/DefaultLayout";
import RecapPageClient from "@/components/recap/RecapPageClient";
import { getRecapPageData, normalizeRecapFilter, type RecapFilter, type RecapPageData } from "@/lib/recap";
import { requireRole } from "@/lib/session";

type RecapPageProps = {
  searchParams?: Promise<{
    month?: string;
    shift?: string;
    dayNight?: string;
  }>;
};

export default async function RecapPage({ searchParams }: RecapPageProps) {
  await requireRole(["ADMIN", "ORDERING"]);

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const selectedFilter: RecapFilter = await normalizeRecapFilter({
    month: resolvedSearchParams?.month,
    shift: resolvedSearchParams?.shift,
    dayNight: resolvedSearchParams?.dayNight,
  });

  let data: RecapPageData = {
    rows: [],
    summary: {
      totalRows: 0,
      totalPlan: 0,
      totalRequest: 0,
      totalDelivery: 0,
      totalReceived: 0,
    },
  };
  let errorMessage: string | null = null;

  try {
    data = await getRecapPageData(selectedFilter);
  } catch (error) {
    console.error("Failed to load recap", error);
    errorMessage =
      error instanceof Error
        ? `Data recap belum bisa dimuat: ${error.message}`
        : "Data recap belum bisa dimuat.";
  }

  return (
    <DefaultLayout>
      <RecapPageClient
        rows={data.rows}
        summary={data.summary}
        selectedFilter={selectedFilter}
        errorMessage={errorMessage}
      />
    </DefaultLayout>
  );
}
