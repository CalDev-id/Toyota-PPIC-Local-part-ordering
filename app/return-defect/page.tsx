import DefaultLayout from "@/components/Layout/DefaultLayout";
import { requireRole } from "@/lib/session";

export default async function ReturnDefectPage() {
  await requireRole(["ADMIN", "ORDERING", "DELIVERY"]);

  return (
    <DefaultLayout>
      <section className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Return Defect</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">Return Defect</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Modul return defect sedang dibuild.
          </p>
        </div>

        <div className="grid min-h-[320px] place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
          <div>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
              <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M5 8h10a4 4 0 0 1 0 8H8" />
                <path d="m8 5-3 3 3 3" />
                <path d="M8 16v3h10" />
                <path d="m18 16 3 3-3 3" />
              </svg>
            </div>
            <h2 className="mt-5 text-xl font-bold text-slate-950">Build in Progress</h2>
            <p className="mt-2 max-w-md text-sm text-slate-500">
              Halaman ini sudah disiapkan untuk alur return defect berikutnya.
            </p>
          </div>
        </div>
      </section>
    </DefaultLayout>
  );
}
