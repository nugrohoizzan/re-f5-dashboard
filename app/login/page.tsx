"use client";

import { useFormState, useFormStatus } from "react-dom";
import Image from "next/image";
import { loginAction } from "./actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function F5Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/RE-logo.png?v=2"
      alt="F5 Logo"
      width={28}
      height={28}
      unoptimized
      className={cn("shrink-0 object-contain", className)}
      priority
    />
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" className="w-full" disabled={pending}>
      {pending ? "Sedang masuk..." : "Masuk"}
    </Button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(loginAction, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm animate-in fade-in-0 zoom-in-95 rounded-lg border border-zinc-800 bg-zinc-900 p-8 shadow-xl duration-300">
        <div className="mb-6 flex animate-in fade-in-0 slide-in-from-top-1 items-center gap-2 text-white duration-300">
          <F5Logo className="h-6 w-6" />
          <div>
            <p className="text-sm font-semibold leading-tight">RE-F5 Dashboard</p>
            <p className="text-xs text-zinc-400">Login operasional Resident Engineer</p>
          </div>
        </div>

        <form action={formAction} className="animate-in fade-in-0 slide-in-from-bottom-1 space-y-4 duration-300">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-zinc-100">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@f5ops.local"
              required
              autoComplete="email"
              className="bg-zinc-800 border-zinc-600 text-white placeholder:text-zinc-400"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-zinc-100">
              Password
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="bg-zinc-800 border-zinc-600 text-white placeholder:text-zinc-400"
            />
          </div>

          {state?.error && (
            <p role="alert" className="text-sm text-red-400">
              {state.error}
            </p>
          )}

          <SubmitButton />
        </form>

        <p className="mt-6 text-center text-xs text-zinc-500">
          Alat internal Resident Engineer F5.
        </p>
      </div>
    </div>
  );
}