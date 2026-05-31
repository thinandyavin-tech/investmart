import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // No adapter — JWT strategy handles sessions, we manage DB users manually
  session:        { strategy: "jwt" },
  trustHost:      true,
  // In dev (HTTP) the cookie prefix changes based on protocol detection — lock it off
  useSecureCookies: process.env.NODE_ENV === "production",
  providers: [
    Google({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // PKCE cookies can mismatch if the protocol is detected inconsistently.
      // State check is equivalent protection for server-side apps (we have a client_secret).
      checks:       ["state"],
    }),
    Credentials({
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email    = (credentials?.email    as string | undefined)?.toLowerCase().trim();
        const password = (credentials?.password as string | undefined);
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email ?? email, name: user.name ?? user.username };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // Credentials: user.id is already the DB id from authorize()
      if (user?.id && account?.provider === "credentials") {
        token.sub = user.id;
      }

      // Google: find or create the user row in our DB
      if (account?.provider === "google" && profile?.email) {
        const email = (profile.email as string).toLowerCase();
        let dbUser  = await prisma.user.findUnique({ where: { email } });

        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              email,
              name:    (profile.name as string | undefined) ?? null,
              cashThb: 1_250_000,
              cashUsd: 0,
            },
          });
        }

        token.sub = dbUser.id;
      }

      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
  pages: {
    signIn: "/signin",
  },
});
