import DefaultLayout from "@/components/Layout/DefaultLayout";
import PalletOrderPageClient from "@/components/ordering/PalletOrderPageClient";
import { requireRole } from "@/lib/session";

export default async function OrderingPalletPage() {
  await requireRole(["ADMIN", "ORDERING"]);

  return (
    <DefaultLayout>
      <PalletOrderPageClient />
    </DefaultLayout>
  );
}
