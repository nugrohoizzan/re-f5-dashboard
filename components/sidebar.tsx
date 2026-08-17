"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  CalendarDays,
  ListTree,
  ListChecks,
  Wrench,
  ClipboardList,
  FileText,
  Users,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  LogOut,
  StickyNote,
  Terminal,
  Link2,
  Boxes,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TOP_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/schedule", label: "Jadwal Shift", icon: CalendarDays },
  { href: "/mop", label: "MOP", icon: FileText },
];

const SHIFT_DETAIL_ITEMS = [
  { href: "/activities", label: "Aktivitas", icon: ListChecks },
  { href: "/troubleshooting", label: "Troubleshoot", icon: Wrench },
  { href: "/titipan", label: "Titipan & Pending", icon: ClipboardList },
];

const TOOLS_ITEMS = [
  { href: "/tools/notes-accounts", label: "Notes & Accounts", icon: StickyNote },
  { href: "/tools/cli-commands", label: "Command CLI", icon: Terminal },
  { href: "/tools/quick-links", label: "Quick Links", icon: Link2 },
];

const BOTTOM_ITEMS = [
  { href: "/engineers", label: "Engineer", icon: Users },
  { href: "/settings", label: "Pengaturan", icon: Settings },
];

function F5Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/RE-logo.png"
      alt="F5 Logo"
      width={28}
      height={28}
      unoptimized
      className={cn("shrink-0 object-contain", className)}
      priority
    />
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  collapsed,
  indent,
  mobile,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  collapsed: boolean;
  indent?: boolean;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "focus-ring flex items-center gap-3 rounded-md text-sm font-medium transition-all duration-150",
        mobile ? "px-4 py-3 text-base active:scale-[0.98]" : "px-3 py-2 hover:translate-x-0.5",
        indent && !collapsed && (mobile ? "ml-2" : "ml-4"),
        active
          ? "bg-red-600/15 text-red-300"
          : "text-zinc-200 hover:bg-zinc-800 hover:text-white"
      )}
      title={collapsed ? label : undefined}
    >
      <Icon className={cn("shrink-0", mobile ? "h-5 w-5" : "h-4 w-4")} />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

function NavLinks({
  collapsed,
  onNavigate,
  mobile,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  mobile?: boolean;
}) {
  const pathname = usePathname();
  const shiftDetailsActive = SHIFT_DETAIL_ITEMS.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );
  const [detailsOpen, setDetailsOpen] = React.useState(shiftDetailsActive);

  const toolsActive = TOOLS_ITEMS.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );
  const [toolsOpen, setToolsOpen] = React.useState(toolsActive);

  React.useEffect(() => {
    if (shiftDetailsActive) setDetailsOpen(true);
  }, [shiftDetailsActive]);

  React.useEffect(() => {
    if (toolsActive) setToolsOpen(true);
  }, [toolsActive]);

  return (
    <nav className={cn("flex flex-1 flex-col gap-0.5 overflow-y-auto", mobile ? "px-3" : "px-2")}>
      {TOP_ITEMS.map((item) => (
        <NavLink key={item.href} {...item} collapsed={collapsed} mobile={mobile} onNavigate={onNavigate} />
      ))}

      {/* Rincian Shift: Aktivitas / Troubleshoot / Titipan digabung jadi satu
          dropdown supaya sidebar tidak makan banyak tempat. */}
      <button
        type="button"
        onClick={() => setDetailsOpen((v) => !v)}
        className={cn(
          "focus-ring flex items-center gap-3 rounded-md text-sm font-medium transition-all duration-150",
          mobile ? "px-4 py-3 text-base" : "px-3 py-2",
          shiftDetailsActive && !detailsOpen
            ? "bg-red-600/15 text-red-300"
            : "text-zinc-200 hover:bg-zinc-800 hover:text-white"
        )}
        title={collapsed ? "Rincian Shift" : undefined}
      >
        <ListTree className={cn("shrink-0", mobile ? "h-5 w-5" : "h-4 w-4")} />
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-left">Rincian Shift</span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                detailsOpen && "rotate-180"
              )}
            />
          </>
        )}
      </button>

      {(detailsOpen || collapsed) && (
        <div className="flex animate-in fade-in-0 slide-in-from-top-1 flex-col gap-0.5 duration-150">
          {SHIFT_DETAIL_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              collapsed={collapsed}
              indent
              mobile={mobile}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}

      {/* Tools & Platforms: Notes & Accounts / Command CLI / Quick Links
          digabung jadi satu dropdown, sama seperti Rincian Shift. */}
      <button
        type="button"
        onClick={() => setToolsOpen((v) => !v)}
        className={cn(
          "focus-ring flex items-center gap-3 rounded-md text-sm font-medium transition-all duration-150",
          mobile ? "px-4 py-3 text-base" : "px-3 py-2",
          toolsActive && !toolsOpen
            ? "bg-red-600/15 text-red-300"
            : "text-zinc-200 hover:bg-zinc-800 hover:text-white"
        )}
        title={collapsed ? "Tools & Platforms" : undefined}
      >
        <Boxes className={cn("shrink-0", mobile ? "h-5 w-5" : "h-4 w-4")} />
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-left">Tools & Platforms</span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                toolsOpen && "rotate-180"
              )}
            />
          </>
        )}
      </button>

      {(toolsOpen || collapsed) && (
        <div className="flex animate-in fade-in-0 slide-in-from-top-1 flex-col gap-0.5 duration-150">
          {TOOLS_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              collapsed={collapsed}
              indent
              mobile={mobile}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}

      <div className="my-2 border-t border-zinc-800" />

      {BOTTOM_ITEMS.map((item) => (
        <NavLink key={item.href} {...item} collapsed={collapsed} mobile={mobile} onNavigate={onNavigate} />
      ))}
    </nav>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      {/* Header mobile: toggle + branding, nempel di atas saat discroll */}
      <div className="sticky top-0 z-50 flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3 md:hidden">
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className={cn(
            "focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-200",
            mobileOpen ? "bg-red-600 text-white" : "text-zinc-700 hover:bg-zinc-100"
          )}
          aria-label={mobileOpen ? "Tutup navigasi" : "Buka navigasi"}
          aria-expanded={mobileOpen}
        >
          <span className="flex flex-col items-center justify-center gap-[5px]">
            <span
              className={cn(
                "block h-0.5 w-5 rounded-full bg-current transition-all duration-300 ease-out",
                mobileOpen && "translate-y-[6.5px] rotate-45"
              )}
            />
            <span
              className={cn(
                "block h-0.5 w-5 rounded-full bg-current transition-all duration-200 ease-out",
                mobileOpen && "opacity-0"
              )}
            />
            <span
              className={cn(
                "block h-0.5 w-5 rounded-full bg-current transition-all duration-300 ease-out",
                mobileOpen && "-translate-y-[6.5px] -rotate-45"
              )}
            />
          </span>
        </button>
        <div className="flex min-w-0 items-center gap-2 text-zinc-900">
          <F5Logo className="h-6 w-6" />
          <span className="truncate text-sm font-semibold">RE-F5 Dashboard</span>
        </div>
      </div>

      {/* Drawer mobile: overlay penuh, menu full-width, mudah disentuh */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 animate-in fade-in-0 bg-zinc-950/60 duration-200"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-[85%] max-w-[320px] animate-in slide-in-from-left-full flex-col bg-zinc-900 pb-4 pt-[60px] shadow-2xl duration-200 ease-out">
            <NavLinks collapsed={false} onNavigate={() => setMobileOpen(false)} mobile />
            <div className="mt-2 border-t border-zinc-800 px-3 pt-3">
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="focus-ring flex w-full items-center gap-3 rounded-md px-4 py-3 text-base font-medium text-zinc-300 transition-colors duration-150 hover:bg-zinc-800 hover:text-white"
              >
                <LogOut className="h-5 w-5 shrink-0" />
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar desktop */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-zinc-800 bg-zinc-900 py-4 transition-all duration-200 ease-in-out md:flex",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <div className={cn("mb-4 flex items-center gap-2 px-3", collapsed && "justify-center")}>
          <F5Logo className="h-6 w-6" />
          {!collapsed && (
            <span className="text-sm font-semibold text-white">RE-F5 Dashboard</span>
          )}
        </div>

        <NavLinks collapsed={collapsed} />

        <div className="px-2 pt-2">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="focus-ring flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronsLeft className="h-4 w-4" /> Ciutkan
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}