
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { verifyPassword } from "@/lib/auth";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly",
        },
      },
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Get Prisma client with error handling for Turbopack/Prisma v7 compatibility issues
        let prisma;
        try {
          // Use dynamic import to avoid caching issues during development
          const prismaModule = await import("@/lib/prisma");
          prisma = prismaModule.prisma;
        } catch (error) {
          console.error('Failed to import Prisma client:', error);
          // In development mode with mock client, allow any credentials for testing purposes
          if (process.env.NODE_ENV === 'development') {
            return {
              id: "test-user-id",
              email: credentials.email,
              name: "Test User",
            };
          }
          return null;
        }

        // Check if prisma has the expected methods (handle Prisma v7 compatibility)
        if (!prisma || typeof prisma.user?.findUnique !== 'function') {
          console.warn('Prisma client methods not available, using mock authentication');
          // In development mode with mock client, allow any credentials for testing purposes
          if (process.env.NODE_ENV === 'development') {
            return {
              id: "test-user-id",
              email: credentials.email,
              name: "Test User",
            };
          }
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          });

          if (!user || !user.password) {
            return null;
          }

          const isValid = await verifyPassword(credentials.password, user.password);
          if (!isValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      }
    })
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Allow all users to sign in
      return true;
    },
    async redirect({ url, baseUrl }) {
      // Always redirect to onboarding after login
      return baseUrl + "/dashboard/onboarding";
    },
  },
});

export { handler as GET, handler as POST };
