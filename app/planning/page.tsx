import DefaultLayout from "@/components/Layout/DefaultLayout";
import PlanningPageClient from "@/components/planning/PlanningPageClient";
import { requireRole } from "@/lib/session";

export default async function PlanningPage() {
  await requireRole(["ADMIN", "ORDERING"]);

  return (
    <DefaultLayout>
      <PlanningPageClient />
    </DefaultLayout>
  );
}
