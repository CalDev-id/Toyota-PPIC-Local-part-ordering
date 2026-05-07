import DefaultLayout from "@/components/Layout/DefaultLayout";
import type { AppRole } from "@/lib/roles";
import { requireSession } from "@/lib/session";
import Link from "next/link";

type ShortcutItem = {
  title: string;
  description: string;
  href: string;
  accent: string;
  roles?: AppRole[];
};

const shortcutItems: ShortcutItem[] = [
  {
    title: "Analysis",
    description: "Pantau tren request, delivery, dan request vs confirmed dari satu dashboard.",
    href: "/analysis",
    accent: "from-indigo-500 to-sky-500",
  },
  {
    title: "Tracking",
    description: "Pantau progress order dari submitted, confirmed, sampai checked per tanggal, shift, dan day/night.",
    href: "/tracking",
    accent: "from-sky-500 to-emerald-500",
  },
  {
    title: "Planning",
    description: "Kelola planning harian, stock awal, dan plan produksi untuk ordering.",
    href: "/planning",
    accent: "from-emerald-500 to-teal-500",
    roles: ["ADMIN", "ORDERING"],
  },
  {
    title: "Ordering",
    description: "Buat order baru, lihat active order, dan monitor total stock vs delivery.",
    href: "/ordering",
    accent: "from-slate-900 to-slate-600",
    roles: ["ADMIN", "ORDERING"],
  },
  {
    title: "Recap",
    description: "Lihat recap bulanan planning dan ordering, lalu download ke Excel.",
    href: "/recap",
    accent: "from-emerald-600 to-sky-500",
    roles: ["ADMIN", "ORDERING"],
  },
  {
    title: "Delivery",
    description: "Konfirmasi order masuk, isi qty confirm, dan pantau finish order.",
    href: "/delivery",
    accent: "from-amber-500 to-orange-500",
    roles: ["ADMIN", "DELIVERY"],
  },
  {
    title: "Receiving",
    description: "Input qty received untuk order confirmed dan selesaikan flow menjadi checked.",
    href: "/receiving",
    accent: "from-cyan-500 to-blue-500",
    roles: ["ADMIN", "RECEIVING"],
  },
  // {
  //   title: "Users",
  //   description: "Kelola akun, role, dan akses user dashboard.",
  //   href: "/users",
  //   accent: "from-rose-500 to-pink-500",
  // },
];

export default async function Home() {
  const session = await requireSession();
  const visibleShortcutItems = shortcutItems.filter(
    (item) => !item.roles || item.roles.includes(session.user.role)
  );

  return (
    <DefaultLayout>
      <section className="space-y-6">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-sm">
          <div className="bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_36%),linear-gradient(135deg,_#0f172a,_#1e293b_58%,_#334155)] px-6 py-7 text-white md:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-200">Home</p>
            <h1 className="mt-3 text-3xl font-bold leading-tight md:text-4xl">
              Toyota PAD Dashboard
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-slate-200 md:text-base">
              Akses cepat ke planning, ordering, delivery, analysis, dan modul operasional lain dari satu home page.
            </p>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Quick Access</p>
              <h2 className="mt-2 text-xl font-bold text-slate-900">Modul Utama</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {visibleShortcutItems.length} menu
            </span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleShortcutItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <div className={`h-2 w-20 rounded-full bg-gradient-to-r ${item.accent}`} />
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{item.description}</p>
                <span className="mt-4 inline-flex items-center text-sm font-semibold text-slate-900">
                  Buka modul
                  <svg viewBox="0 0 24 24" className="ml-2 h-4 w-4 transition group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M5 12h14" />
                    <path d="m13 6 6 6-6 6" />
                  </svg>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* <section className="rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Workflow</p>
          <h2 className="mt-2 text-xl font-bold text-slate-900">Urutan Operasional</h2>

          <div className="mt-6 grid gap-4 lg:grid-cols-4">
            <WorkflowStep step="01" title="Planning" description="Set stock awal dan plan produksi harian." accent="bg-emerald-500" />
            <WorkflowStep step="02" title="Ordering" description="Buat order berdasarkan planning dan kebutuhan aktual." accent="bg-slate-900" />
            <WorkflowStep step="03" title="Delivery" description="Konfirmasi quantity yang benar-benar dikirim." accent="bg-amber-500" />
            <WorkflowStep step="04" title="Receiving" description="Input qty received dan ubah status order menjadi checked." accent="bg-sky-500" />
          </div>
        </section> */}
      </section>
    </DefaultLayout>
  );
}
