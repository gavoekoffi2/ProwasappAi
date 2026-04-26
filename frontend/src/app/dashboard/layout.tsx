"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { clearToken, getToken } from "@/lib/api";
import clsx from "clsx";

const NAV = [
  { href: "/dashboard", label: "Pilotage", marker: "01" },
  { href: "/dashboard/whatsapp", label: "WhatsApp", marker: "02" },
  { href: "/dashboard/conversations", label: "Conversations", marker: "03" },
  { href: "/dashboard/knowledge", label: "Connaissances", marker: "04" },
  { href: "/dashboard/settings", label: "IA & regles", marker: "05" },
  { href: "/dashboard/billing", label: "Abonnement", marker: "06" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) router.replace("/login");
  }, [router]);

  function logout() {
    clearToken();
    router.replace("/login");
  }

  return (
    <div className="dash-shell min-h-screen">
      <aside className="dash-sidebar hidden w-[284px] shrink-0 border-r border-white/10 lg:flex lg:flex-col">
        <div className="px-6 pb-7 pt-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg border border-white/15 bg-white text-sm font-black text-slate-950 shadow-xl">
              P
            </span>
            <span>
              <span className="block text-sm font-semibold text-white">ProwasappAI</span>
              <span className="block text-xs text-emerald-200/80">Business command center</span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((n) => {
            const active = pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={clsx("dash-nav-link group", active && "dash-nav-link-active")}
              >
                <span className="dash-nav-marker">{n.marker}</span>
                <span>{n.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-4 pb-5">
          <div className="dash-side-status mb-3">
            <span className="status-pulse" />
            <div>
              <p className="text-xs font-semibold text-white">Backend actif</p>
              <p className="text-[11px] text-slate-300">IA, WhatsApp et data connectes</p>
            </div>
          </div>
          <button onClick={logout} className="btn-secondary w-full border-white/10 bg-white/[0.08] text-white hover:bg-white/[0.14]">
            Deconnexion
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="sticky top-0 z-30 border-b border-white/70 bg-slate-50/82 px-4 py-3 backdrop-blur-xl lg:hidden">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="font-semibold text-slate-950">
              ProwasappAI
            </Link>
            <button onClick={logout} className="btn-secondary px-3 py-1.5">
              Sortir
            </button>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={clsx(
                  "shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold",
                  pathname === n.href
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-white text-slate-700",
                )}
              >
                {n.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-9">{children}</div>
      </main>
    </div>
  );
}
