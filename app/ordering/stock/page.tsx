import DefaultLayout from "@/components/Layout/DefaultLayout";
import { requireRole } from "@/lib/session";
import Image from "next/image";

type StockVariant = {
  variant: "1TR" | "2TR";
  min: number;
  max: number;
  actual: number;
};

type StockItem = {
  name: string;
  image: string;
  qty: number;
  variants: StockVariant[];
};

const stockItems: StockItem[] = [
  {
    name: "Cylinder Block",
    image: "/image/cb.png",
    qty: 184,
    variants: [
      { variant: "1TR", min: 40, max: 90, actual: 96 },
      { variant: "2TR", min: 35, max: 80, actual: 62 },
    ],
  },
  {
    name: "Camshaft",
    image: "/image/cam.png",
    qty: 126,
    variants: [
      { variant: "1TR", min: 30, max: 75, actual: 70 },
      { variant: "2TR", min: 28, max: 70, actual: 24 },
    ],
  },
  {
    name: "Crankshaft",
    image: "/image/cr.png",
    qty: 44,
    variants: [
      { variant: "1TR", min: 32, max: 78, actual: 44 },
    ],
  },
];

export default async function OrderingStockPage() {
  await requireRole(["ADMIN", "ORDERING"]);

  return (
    <DefaultLayout>
      <section className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Ordering Stock</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-950">Stock Part Summary</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">
                Monitoring dummy stock per part dan variant untuk kebutuhan ordering.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <StatusLegend tone="over" label="Over" />
              <StatusLegend tone="normal" label="Watch" />
              <StatusLegend tone="critical" label="Critical" />
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
          {stockItems.map((item) => (
            <article
              key={item.name}
              className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="flex h-32 w-full shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:w-36">
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={220}
                    height={160}
                    className="max-h-24 w-auto object-contain mix-blend-multiply"
                    priority={item.name === "Cylinder Block"}
                  />
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 sm:pr-3">
                    <h2 className="text-xl font-bold leading-tight text-slate-950">{item.name}</h2>
                    <div className="mt-2 flex items-baseline gap-2 whitespace-nowrap">
                      <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Qty</span>
                      <span className="shrink-0 text-3xl font-black leading-none text-slate-950 tabular-nums">{item.qty}</span>
                      <span className="shrink-0 text-sm font-semibold text-slate-500">pcs</span>
                    </div>
                  </div>

                  <StockStatusPill variants={item.variants} />
                </div>
              </div>

              <div className="mt-5 overflow-x-auto">
                <div className="min-w-[24rem] overflow-hidden rounded-2xl border border-slate-200">
                  <table className="w-full table-fixed text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                        <th className="w-28 px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.14em]">Variant</th>
                        {item.variants.map((variant) => (
                          <th key={variant.variant} className="px-4 py-3 text-center text-sm font-bold text-slate-950">
                            {variant.variant}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-500">Min.</th>
                        {item.variants.map((variant) => (
                          <td key={variant.variant} className="px-4 py-3 text-center font-semibold text-slate-900 tabular-nums">
                            {variant.min}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-500">Max.</th>
                        {item.variants.map((variant) => (
                          <td key={variant.variant} className="px-4 py-3 text-center font-semibold text-slate-900 tabular-nums">
                            {variant.max}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-500">Act</th>
                        {item.variants.map((variant) => (
                          <td key={variant.variant} className="px-4 py-3 text-center font-bold text-slate-950 tabular-nums">
                            {variant.actual}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-500">Status</th>
                        {item.variants.map((variant) => (
                          <td key={variant.variant} className="px-4 py-3">
                            <StockStatus variant={variant} />
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-500">Catch Up</th>
                        {item.variants.map((variant) => (
                          <td key={variant.variant} className="px-4 py-3 text-center text-slate-300">
                            -
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </DefaultLayout>
  );
}

function StatusLegend({
  tone,
  label,
}: {
  tone: "over" | "normal" | "critical";
  label: string;
}) {
  const toneClassMap = {
    over: "border-emerald-200 bg-emerald-50 text-emerald-700",
    normal: "border-amber-200 bg-amber-50 text-amber-700",
    critical: "border-rose-200 bg-rose-50 text-rose-700",
  };

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${toneClassMap[tone]}`}>
      <StatusIcon tone={tone} />
      {label}
    </span>
  );
}

function StockStatusPill({ variants }: { variants: StockVariant[] }) {
  const hasCritical = variants.some((variant) => variant.actual < variant.min);
  const hasOver = variants.some((variant) => variant.actual > variant.max);
  const tone = hasCritical ? "critical" : hasOver ? "over" : "normal";
  const label = hasCritical ? "Critical" : hasOver ? "Over" : "Watch";
  const toneClassMap = {
    over: "border-emerald-200 bg-emerald-50 text-emerald-700",
    normal: "border-amber-200 bg-amber-50 text-amber-700",
    critical: "border-rose-200 bg-rose-50 text-rose-700",
  };

  return (
    <span className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${toneClassMap[tone]}`}>
      <StatusIcon tone={tone} />
      {label}
    </span>
  );
}

function StockStatus({ variant }: { variant: StockVariant }) {
  if (variant.actual > variant.max) {
    return (
      <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50" title="Over">
        <StatusIcon tone="over" />
      </div>
    );
  }

  if (variant.actual < variant.min) {
    return (
      <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 bg-rose-50" title="Critical">
        <StatusIcon tone="critical" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-amber-200 bg-amber-50" title="Watch">
      <StatusIcon tone="normal" />
    </div>
  );
}

function StatusIcon({ tone }: { tone: "over" | "normal" | "critical" }) {
  if (tone === "over") {
    return <span className="h-2.5 w-2.5 rounded-full bg-slate-950" />;
  }

  if (tone === "critical") {
    return (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-slate-950" fill="none" stroke="currentColor" strokeWidth="3">
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-slate-950" fill="currentColor" aria-hidden="true">
      <path d="M12 4 21 20H3L12 4Z" />
    </svg>
  );
}
