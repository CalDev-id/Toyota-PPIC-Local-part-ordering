import DefaultLayout from "@/components/Layout/DefaultLayout";
import { requireRole } from "@/lib/session";

export default async function Receiving() {
  await requireRole(["ADMIN", "RECEIVING"]);

  return (
    <DefaultLayout>
      <h1>Receiving Page</h1>
      <p>This is the receiving page.</p>
    </DefaultLayout>
  );
}
