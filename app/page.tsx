import Link from "next/link";

export default function Home() {
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Home</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Welcome to Toyota Dashboard</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">
          Sidebar di kiri sudah aktif dengan menu Home, Production, Analysis, dan Profile.
        </p>
        <Link
          href="/users"
          className="mt-5 inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Buka CRUD Users
        </Link>
      </div>
    </section>
  );
}
