import DefaultLayout from "@/components/Layout/DefaultLayout";
import ProductionContent from "@/components/production/ProductionContent";
import { requireSession } from "@/lib/session"

export default async function ProductionPage() {
  await requireSession()

  return (
    <DefaultLayout>
      
      <ProductionContent />
    </DefaultLayout>
  );
}
