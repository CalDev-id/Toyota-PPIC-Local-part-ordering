"use client";

import { RITASE_SCHEDULES, type RitaseDayNight, type RitaseScheduleItem } from "@/lib/ritase-schedule";
import { useState } from "react";

type RitaseProgressCardProps = {
  loading?: boolean;
  nextRitase?: RitaseScheduleItem | null;
  schedule: RitaseScheduleItem[];
};

export default function RitaseProgressCard({
  loading = false,
  nextRitase,
  schedule,
}: RitaseProgressCardProps) {
  const [open, setOpen] = useState(false);
  const hasSchedule = schedule.length > 0;
  const title = loading ? "MEMUAT" : nextRitase?.type.toUpperCase() ?? "PILIH";
  const ritase = loading ? "-" : nextRitase?.ritase ?? "-";
  const time = loading ? "Memuat..." : nextRitase?.time || nextRitase?.type || "Pilih Day / Night";

  return (
    <>
      <section className="relative flex h-full min-h-24 w-36 items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-4 text-center shadow-sm">
        <div className="px-2">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-900">{title}</p>
          <p className="mt-1 text-3xl font-black leading-none text-slate-900">{ritase}</p>
          <p className="mt-2 text-xs font-semibold text-slate-600">{time}</p>
        </div>

        <div className="absolute top-2 right-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={!hasSchedule}
            aria-label="Lihat informasi jadwal ritase"
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-bold leading-none text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            i
          </button>
        </div>
      </section>

      {open ? (
        <RitaseInfoModal
          activeRitase={nextRitase?.ritase ?? null}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function RitaseInfoModal({
  activeRitase,
  onClose,
}: {
  activeRitase: number | null;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <div className="max-h-[90vh] w-fit max-w-[96vw] overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Informasi Ritase</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Tutup
          </button>
        </div>

        <div className="space-y-6 px-6 py-5">
          {(["DAY", "NIGHT"] as RitaseDayNight[]).map((dayNight) => (
            <section key={dayNight}>
              <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">{dayNight}</h3>
              <div className="mt-3 flex flex-nowrap gap-3 overflow-x-auto pb-2">
                {RITASE_SCHEDULES[dayNight].map((item) => (
                  <RitaseScheduleCard key={item.ritase} item={item} active={item.ritase === activeRitase} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function RitaseScheduleCard({ item, active }: { item: RitaseScheduleItem; active: boolean }) {
  return (
    <article
      className={`relative flex min-h-24 w-36 shrink-0 items-center justify-center rounded-2xl border px-3 py-4 text-center shadow-sm ${
        active ? "border-emerald-300 bg-emerald-50 ring-2 ring-emerald-200" : "border-slate-200 bg-white"
      }`}
    >
      <div className="px-2">
        <p className={`text-xs font-bold uppercase tracking-[0.14em] ${active ? "text-emerald-900" : "text-slate-900"}`}>
          {item.type.toUpperCase()}
        </p>
        <p className={`mt-1 text-3xl font-black leading-none ${active ? "text-emerald-900" : "text-slate-900"}`}>
          {item.ritase}
        </p>
        <p className={`mt-2 text-xs font-semibold ${active ? "text-emerald-700" : "text-slate-600"}`}>{item.time || item.type}</p>
      </div>
    </article>
  );
}
