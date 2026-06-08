import { PrismaAdapter } from "@auth/prisma-adapter"
import type { Adapter } from "next-auth/adapters"
import type { NextAuthOptions } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import type { AppRole } from "@/lib/roles"
import bcrypt from "bcrypt"

const MAX_LOGIN_ATTEMPTS = 5
const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000

type LoginAttempt = {
  count: number
  resetAt: number
}

const globalForRateLimit = globalThis as unknown as {
  loginAttempts?: Map<string, LoginAttempt>
}

const loginAttempts = globalForRateLimit.loginAttempts ?? new Map<string, LoginAttempt>()
globalForRateLimit.loginAttempts = loginAttempts

function getLoginRateLimitKey(email: string) {
  return email.trim().toLowerCase()
}

function isLoginRateLimited(key: string) {
  const now = Date.now()
  const attempt = loginAttempts.get(key)

  if (!attempt) return false

  if (attempt.resetAt <= now) {
    loginAttempts.delete(key)
    return false
  }

  return attempt.count >= MAX_LOGIN_ATTEMPTS
}

function recordFailedLogin(key: string) {
  const now = Date.now()
  const attempt = loginAttempts.get(key)

  if (!attempt || attempt.resetAt <= now) {
    loginAttempts.set(key, {
      count: 1,
      resetAt: now + LOGIN_RATE_LIMIT_WINDOW_MS
    })
    return
  }

  attempt.count += 1
}

function clearFailedLogins(key: string) {
  loginAttempts.delete(key)
}

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,

  adapter: PrismaAdapter(prisma) as Adapter,

  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {}
      },

      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email : ""
        const password = typeof credentials?.password === "string" ? credentials.password : ""
        const rateLimitKey = getLoginRateLimitKey(email)

        if (!email || !password || isLoginRateLimited(rateLimitKey)) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: rateLimitKey }
        })

        if (!user) {
          recordFailedLogin(rateLimitKey)
          return null
        }

        const valid = await bcrypt.compare(
          password,
          user.password
        )

        if (!valid) {
          recordFailedLogin(rateLimitKey)
          return null
        }

        clearFailedLogins(rateLimitKey)
        return user
      }
    })
  ],

  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/") && !url.startsWith("//")) {
        return `${baseUrl}${url}`
      }

      try {
        const targetUrl = new URL(url)
        const appUrl = new URL(baseUrl)

        if (targetUrl.origin === appUrl.origin) {
          return url
        }
      } catch {
        return baseUrl
      }

      return baseUrl
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.name = user.name
        token.email = user.email
        token.role = user.role
      }
      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.name = token.name
        session.user.email = token.email as string
        session.user.role = token.role as AppRole
      }
      return session
    }
  },

  session: {
    strategy: "jwt"
  }
}
