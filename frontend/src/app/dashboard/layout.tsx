"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { clearToken, getToken } from "@/lib/api";
import { fetcher } from "@/lib/fetcher";
import clsx from "clsx";
import {
  HomeIcon,
  ChatIcon,
  InboxIcon,
  BookIcon,
  SettingsIcon,
  CardIcon,
  LogoutIcon,
  MenuIcon,
  CloseIcon,
} from "@/lib/icons";

type Me = {
  user: { id: string; email: string; name: string; role: string };
  tenant: {
    id: string;
    name: string;
    subscription?: { plan: string; status: string };
  };
};

const NAV = [
  { href: "/dashboard", label: "Accueil", Icon: HomeIcon },
  { href: "/dashboard/whatsapp", label: "WhatsApp", Icon: ChatIcon },
  { href: "/dashboard/conversations", label: "Conversations", Icon: InboxIcon },
  { href: "/dashboard/knowledge", label: "Connaissances", Icon: BookIcon },
  { href: "/dashboard/settings", label: "IA & Paramètres", Icon: SettingsIcon },
  { href: "/dashboard/billing", label: "Abonnement", Icon: CardIcon },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!getToken()) router.replace("/login");
  }, [router]);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => setMobileOpen(false), [pathname]);

  const { data: me } = useSWR<Me>("/auth/me", fetcher);

  function logout() {
    clearToken();
    router.replace("/login");
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-6 py-5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 font-bold text-white shadow-sm">
            P
          </span>
          <span className="font-semibold tracking-tight">ProwasappAI</span>
        </Link>
        <button
          onClick={() => setMobileOpen(false)}
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 md:hidden"
          aria-label="Fermer le menu"
        >
          <CloseIcon />
        </button>
      </div>

      <TenantCard me={me} />

      <nav className="mt-2 flex-1 space-y-0.5 px-3">
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname?.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-emerald-50 text-emerald-700 font-medium"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              <Icon
                size={18}
                className={clsx(
                  "shrink-0",
                  active ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600",
                )}
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 p-3">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <LogoutIcon size={18} className="text-slate-400" />
          Déconnexion
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-emerald-500 to-emerald-700 text-sm font-bold text-white">
            P
          </span>
          <span className="font-semibold">ProwasappAI</span>
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-md p-2 text-slate-700 hover:bg-slate-100"
          aria-label="Ouvrir le menu"
        >
          <MenuIcon />
        </button>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-slate-200 bg-white md:block">
          {sidebar}
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200 bg-white shadow-xl md:hidden">
              {sidebar}
            </aside>
          </>
        )}

        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">{children}</div>
        </main>
      </div>
    </div>
  );
}

function TenantCard({ me }: { me: Me | undefined }) {
  if (!me) {
    return (
      <div className="mx-3 mb-4 h-16 animate-pulse rounded-xl bg-slate-100" />
    );
  }
  const plan = me.tenant.subscription?.plan ?? "starter";
  const status = me.tenant.subscription?.status;
  const initials = me.tenant.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="mx-3 mb-2 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-600/10 text-sm font-bold text-emerald-700">
          {initials || "P"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{me.tenant.name}</p>
          <p className="truncate text-xs text-slate-500">{me.user.email}</p>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <PlanBadge plan={plan} />
        {status && status !== "active" && <StatusBadge status={status} />}
      </div>
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const styles: Record<string, string> = {
    starter: "bg-slate-100 text-slate-700",
    pro: "bg-emerald-100 text-emerald-700",
    business: "bg-amber-100 text-amber-800",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        styles[plan] ?? styles.starter,
      )}
    >
      {plan}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label: Record<string, string> = {
    trialing: "Essai",
    past_due: "Impayé",
    canceled: "Annulé",
  };
  return (
    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
      {label[status] ?? status}
    </span>
  );
}
