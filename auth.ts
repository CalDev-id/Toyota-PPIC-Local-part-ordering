import { PrismaAdapter } from "@auth/prisma-adapter"
import type { Adapter } from "next-auth/adapters"
import type { NextAuthOptions } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import type { AppRole } from "@/lib/roles"
import bcrypt from "bcrypt"

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
        const user = await prisma.user.findUnique({
          where: { email: credentials?.email as string }
        })

        if (!user) return null

        const valid = await bcrypt.compare(
          credentials?.password as string,
          user.password
        )

        if (!valid) return null

        return user
      }
    })
  ],

  callbacks: {
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
