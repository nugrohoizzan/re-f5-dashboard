import type { NextAuthConfig } from "next-auth";

// Kept separate from lib/auth.ts because middleware runs on the Edge
// runtime and cannot import the Postgres driver used by the Credentials
// provider's authorize() callback.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = request.nextUrl.pathname.startsWith("/login");

      if (isOnLogin) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/dashboard", request.nextUrl));
        }
        return true;
      }

      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.engineerId = user.engineerId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as "admin" | "engineer";
        session.user.engineerId = token.engineerId as number | null;
      }
      return session;
    },
  },
  providers: [], // populated in lib/auth.ts
} satisfies NextAuthConfig;
