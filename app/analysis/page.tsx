import DefaultLayout from "@/components/Layout/DefaultLayout";

export default function AnalysisPage() {
  return (
    <DefaultLayout>
      <section className="rounded-2xl border border-slate-200 bg-white/85 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">
          Analysis
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          Analysis Workspace
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Tempat untuk insight, breakdown issue, dan summary performa mingguan.
        </p>
      </section>
    </DefaultLayout>
  );
}
