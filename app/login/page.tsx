import LoginForm from "@/components/auth/LoginForm"
import { authOptions } from "@/auth"
import { getServerSession } from "next-auth"
import Image from "next/image"
import { redirect } from "next/navigation"

type LoginPageProps = {
  searchParams?: Promise<{
    callbackUrl?: string | string[]
  }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getServerSession(authOptions)
  const params = await searchParams
  const callbackUrl = Array.isArray(params?.callbackUrl) ? params?.callbackUrl[0] : params?.callbackUrl

  if (session?.user) {
    redirect("/")
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#d1fae5_0%,_#eff6ff_38%,_#f8fafc_100%)] px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/70 bg-white/85 shadow-[0_30px_80px_rgba(15,23,42,0.16)] backdrop-blur xl:grid-cols-[1.1fr_0.9fr]">
        <section className="relative hidden min-h-[560px] xl:block">
          <Image
            src="/image/toyota2.jpg"
            alt="Toyota"
            fill
            className="object-cover"
            priority
          />
        </section>

        <section className="px-6 py-8 sm:px-10 sm:py-12">
          <div className="mx-auto max-w-md">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-700">Login</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">Masuk ke dashboard</h2>
            <p className="mt-2 text-sm text-slate-600">Gunakan akun yang sudah terdaftar untuk melanjutkan.</p>

            <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <LoginForm callbackUrl={callbackUrl} />
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
