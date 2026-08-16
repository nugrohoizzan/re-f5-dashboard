import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: "admin" | "team_leader" | "engineer";
    engineerId: number | null;
  }

  interface Session {
    user: {
      id: string;
      role: "admin" | "team_leader" | "engineer";
      engineerId: number | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: "admin" | "team_leader" | "engineer";
    engineerId: number | null;
  }
}
