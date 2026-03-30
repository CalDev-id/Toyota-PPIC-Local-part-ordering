import DefaultLayout from "@/components/Layout/DefaultLayout";
import ItemsPage from "../../components/items/page";
import StatsPage from "../../components/items/stats/page";

export default function ProductionPage() {
  return (
    <DefaultLayout>
      <section className="rounded-2xl border border-slate-200 bg-white/85 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Production</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Production Overview</h1>
        <p className="mt-2 text-sm text-slate-600">Halaman production siap kamu isi dengan KPI, output line, dan trend.</p>
      </section>
      {/* <StatsPage/> */}
      <ItemsPage/>
    </DefaultLayout>
  );
}
