import DefaultLayout from "@/components/Layout/DefaultLayout";
import HomeDashboard from "@/components/home/HomeDashboard";
import { createEmptyHomeDashboardData, getHomeDashboardData, type HomeDashboardData } from "@/lib/home-dashboard";
import { requireSession } from "@/lib/session";

type HomePageProps = {
  searchParams?: Promise<{
    date?: string;
    shift?: string;
    dayNight?: string;
  }>;
};

export default async function Home({ searchParams }: HomePageProps) {
  await requireSession();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  let dashboardData: HomeDashboardData = createEmptyHomeDashboardData();
  let errorMessage: string | null = null;

  try {
    dashboardData = await getHomeDashboardData({
      date: resolvedSearchParams?.date,
      shift: resolvedSearchParams?.shift,
      dayNight: resolvedSearchParams?.dayNight,
    });
  } catch (error) {
    console.error("Failed to load home dashboard", error);
    errorMessage =
      error instanceof Error
        ? `Data home dashboard belum bisa dimuat: ${error.message}`
        : "Data home dashboard belum bisa dimuat.";
  }

  return (
    <DefaultLayout>
      <HomeDashboard
        data={dashboardData}
        errorMessage={errorMessage}
      />
    </DefaultLayout>
  );
}
