import { LogOut } from "lucide-react";
import { auth, signOut } from "@/lib/auth";

export async function Topbar() {
  const session = await auth();

  return (
    <header className="hidden items-center justify-between border-b border-zinc-200 bg-white px-6 py-3 md:flex">
      <div />
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-zinc-900">{session?.user?.name}</p>
          <p className="text-xs capitalize text-zinc-400">
            {session?.user?.role === "admin"
              ? "Admin"
              : session?.user?.role === "team_leader"
              ? "Team Leader"
              : "Engineer"}
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="focus-ring flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            Keluar
          </button>
        </form>
      </div>
    </header>
  );
}
