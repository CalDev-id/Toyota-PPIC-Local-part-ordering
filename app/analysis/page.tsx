import DefaultLayout from "@/components/Layout/DefaultLayout";
import BarComparisonChart from "@/components/charts/BarComparisonChart";
import DonutQualityChart from "@/components/charts/DonutQualityChart";
import LineTrendChart from "@/components/charts/LineTrendChart";
import { requireSession } from "@/lib/session";

export default async function AnalysisPage() {
  await requireSession()

  const weeklyOutput = [98, 102, 95, 110, 116, 109];
  const productionByLine = [
    { label: "Line A", value: 128 },
    { label: "Line B", value: 116 },
    { label: "Line C", value: 102 },
    { label: "Line D", value: 94 },
  ];

  return (
    <DefaultLayout>
      <section className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">
            Analysis
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            Analysis Workspace
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Monitoring output mingguan, perbandingan produksi line, dan quality
            pass rate.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <LineTrendChart
              title="Weekly Output Trend"
              subtitle="Output unit per hari (Mon-Sat)"
              data={weeklyOutput}
              labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]}
            />
          </div>
          <DonutQualityChart
            title="Quality Overview"
            subtitle="Rasio unit lolos inspeksi"
            pass={924}
            fail={76}
          />
        </div>

        <BarComparisonChart
          title="Production by Line"
          subtitle="Perbandingan output per line (shift ini)"
          data={productionByLine}
        />
      </section>
    </DefaultLayout>
  );
}
