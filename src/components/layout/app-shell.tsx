"use client";

import { BarChart3, Building2, CreditCard, LogOut, Menu, Timer, Users, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BranchSwitcher } from "@/components/control/branch-switcher";
import { Button } from "@/components/ui/button";
import { cachedProfile, lastCanManage, signOut } from "@/lib/auth/session";
import { useTimerStore } from "@/lib/timer/store";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Timer admins only. */
  manage?: boolean;
}

const NAV: NavItem[] = [
  { href: "/control", label: "Timer", icon: Timer },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/team", label: "Team", icon: Users, manage: true },
  { href: "/branches", label: "Branches", icon: Building2, manage: true },
  { href: "/billing", label: "Plan", icon: CreditCard, manage: true },
];

/** Admin links: what the timer said when it connected, or what it said last time. */
function useCanManage() {
  const access = useTimerStore((s) => s.access);
  const [saved, setSaved] = useState(false);
  useEffect(() => setSaved(lastCanManage.get()), []);
  return access.kind === "admin" ? access.canManage : saved;
}

function Sidebar({ onNavigate, onSignOut }: { onNavigate: () => void; onSignOut: () => void }) {
  const pathname = usePathname();
  const canManage = useCanManage();
  const [name, setName] = useState("");
  useEffect(() => {
    const p = cachedProfile();
    if (p) setName(`${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || p.email);
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b px-5">
        <Image src="/assets/logo/cw-mark.png" alt="Church Workflow" width={32} height={32} priority />
        <div className="min-w-0">
          <p className="truncate font-semibold leading-tight">Service Timer</p>
          <p className="truncate text-xs text-muted-foreground">by Church Workflow</p>
        </div>
      </div>

      <div className="px-3 pt-4 empty:hidden">
        <BranchSwitcher />
      </div>

      <nav aria-label="Timer pages" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV.filter((n) => !n.manage || canManage).map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-primary/10 text-primary" : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-2 border-t px-3 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <p className="min-w-0 flex-1 truncate px-2 text-sm text-muted-foreground" title={name}>
          {name}
        </p>
        <Button variant="ghost" size="icon" title="Sign out" aria-label="Sign out" onClick={onSignOut}>
          <LogOut />
        </Button>
      </div>
    </div>
  );
}

/**
 * The signed-in pages: a sidebar of page links (a slide-out menu on phones
 * and tablets), and a top bar with the page's title and its own buttons.
 */
export function AppShell({
  title,
  subtitle,
  actions,
  onSignOut,
  children,
}: {
  title: string;
  subtitle?: string;
  /** Buttons on the right of the top bar. */
  actions?: React.ReactNode;
  /** Defaults to asking first, then signing out and going to the login page. */
  onSignOut?: () => void;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // The menu closes when the page changes, and with Escape.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const signOutHere =
    onSignOut ??
    (() => {
      const { unsynced } = useTimerStore.getState();
      const warning = unsynced
        ? "Some changes haven't been sent yet and will be lost. Sign out anyway?"
        : "Sign out of the Service Timer on this device?";
      if (!confirm(warning)) return;
      signOut();
      router.replace("/login");
    });

  return (
    <div className="min-h-screen bg-gray-50 lg:pl-64">
      {/* Phones and tablets: the menu slides over the page. */}
      {open ? (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" aria-hidden onClick={() => setOpen(false)} />
      ) : null}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 border-r bg-white pt-[env(safe-area-inset-top)] transition-transform lg:translate-x-0",
          open ? "translate-x-0 shadow-xl" : "-translate-x-full",
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-3 lg:hidden"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        >
          <X />
        </Button>
        <Sidebar onNavigate={() => setOpen(false)} onSignOut={signOutHere} />
      </aside>

      <header className="sticky top-0 z-20 border-b bg-white pt-[env(safe-area-inset-top)]">
        <div className="flex min-h-16 items-center gap-3 px-4 md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="-ml-2 lg:hidden"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <Menu />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-semibold leading-tight">{title}</h1>
            {subtitle ? <p className="hidden truncate text-xs text-muted-foreground sm:block">{subtitle}</p> : null}
          </div>
          {actions}
        </div>
      </header>

      {children}
    </div>
  );
}
