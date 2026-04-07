import DefaultLayout from "@/components/Layout/DefaultLayout";
import { requireRole } from "@/lib/session";

export default async function OrderingJunbikiPage() {
  await requireRole(["ADMIN", "ORDERING"]);

  return (
    <DefaultLayout>
      <section className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
            Ordering
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Order Junbiki</h1>
          <p className="mt-2 text-sm text-slate-600">
            Halaman ini masih kosong dan siap dipakai untuk form order Junbiki.
          </p>
        </div>
      </section>
    </DefaultLayout>
  );
}
