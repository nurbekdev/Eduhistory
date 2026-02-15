import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { Role } from "@prisma/client";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  email: z.string().email("Email noto'g'ri formatda"),
  password: z.string().min(6, "Parol kamida 6 ta belgidan iborat bo'lishi kerak"),
});

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/kirish",
  },
  providers: [
    CredentialsProvider({
      name: "Email orqali kirish",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Parol", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user?.passwordHash || !user.isActive) return null;

        const isMatch = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!isMatch) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role,
          image: user.imageUrl ?? undefined,
        };
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    redirect({ url, baseUrl }) {
      const path = new URL(url, baseUrl).pathname;
      if (path.startsWith("/") && !path.startsWith("//")) return `${baseUrl}${path}`;
      return baseUrl;
    },
    async jwt({ token, user }) {
      const userId = (user as { id?: string } | undefined)?.id ?? token.sub;
      if (user) {
        const u = user as { role?: Role; image?: string };
        token.role = u.role;
        token.image = u.image ?? undefined;
      }

      // Har doim DB dan yangi role olish (kirish paytida va token yangilanganda)
      if (userId) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true },
          });
          if (dbUser?.role) token.role = dbUser.role;
        } catch {
          // Prisma xatosi bo'lsa, mavjud rolni saqlab qolamiz
        }
      }
      token.role = (token.role as Role) ?? Role.STUDENT;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as Role) ?? Role.STUDENT;
        session.user.image = (token.image as string) ?? null;
      }
      return session;
    },
  },
};
