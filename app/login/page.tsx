import LoginForm from "@/components/auth/LoginForm"
import { authOptions } from "@/auth"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"

export default async function LoginPage() {
  const session = await getServerSession(authOptions)

  if (session?.user) {
    redirect("/")
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#d1fae5_0%,_#eff6ff_38%,_#f8fafc_100%)] px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/70 bg-white/85 shadow-[0_30px_80px_rgba(15,23,42,0.16)] backdrop-blur xl:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden bg-slate-900 px-10 py-12 text-white xl:block">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-300">Toyota CCR</p>
          <h1 className="mt-5 max-w-md text-4xl font-bold leading-tight">
            Production dashboard access for internal teams.
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-6 text-slate-300">
            Login untuk mengakses halaman home, production, analysis, profile, dan user management.
          </p>

          <div className="mt-10 grid gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm font-semibold text-white">Protected Pages</p>
              <p className="mt-1 text-sm text-slate-300">Home, Production, Analysis, Profile, dan Users hanya bisa diakses setelah login.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm font-semibold text-white">Role-Aware Session</p>
              <p className="mt-1 text-sm text-slate-300">Session menyimpan nama, email, role, dan id user aktif.</p>
            </div>
          </div>
        </section>

        <section className="px-6 py-8 sm:px-10 sm:py-12">
          <div className="mx-auto max-w-md">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-700">Login</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">Masuk ke dashboard</h2>
            <p className="mt-2 text-sm text-slate-600">Gunakan akun yang sudah terdaftar untuk melanjutkan.</p>

            <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <LoginForm />
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
