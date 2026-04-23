"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"

type LoginFormProps = {
  callbackUrl?: string
}

export default function LoginForm({ callbackUrl }: LoginFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const redirectTo = callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/"

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError("")

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false
    })

    if (result?.error) {
      setError("Email atau password tidak valid")
      setLoading(false)
      return
    }

    window.location.href = redirectTo
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
        <input
          type="email"
          placeholder="email@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-emerald-500"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
        <input
          type="password"
          placeholder="Masukkan password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-emerald-500"
          required
        />
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex h-11 w-full items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {loading ? "Signing in..." : "Login"}
      </button>
    </form>
  )
}
