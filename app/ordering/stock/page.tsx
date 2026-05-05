import DefaultLayout from "@/components/Layout/DefaultLayout";
import { requireRole } from "@/lib/session";

export default async function OrderingStockPage() {
  await requireRole(["ADMIN", "ORDERING"]);

  return (
    <DefaultLayout>
      <section className="flex min-h-[420px] items-center justify-center">
        <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white/95 px-8 py-12 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">Ordering Stock</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">Under Development</h1>
          <p className="mt-3 text-sm text-slate-600">
            Halaman ini masih dalam pengembangan dan akan segera tersedia.
          </p>
        </div>
      </section>
    </DefaultLayout>
  );
}
