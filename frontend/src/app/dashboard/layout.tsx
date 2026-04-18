"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { clearToken, getToken } from "@/lib/api";
import clsx from "clsx";

const NAV = [
  { href: "/dashboard", label: "Accueil" },
  { href: "/dashboard/whatsapp", label: "WhatsApp" },
  { href: "/dashboard/conversations", label: "Conversations" },
  { href: "/dashboard/knowledge", label: "Base de connaissances" },
  { href: "/dashboard/settings", label: "IA & Paramètres" },
  { href: "/dashboard/billing", label: "Abonnement" },
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
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white md:block">
        <div className="flex items-center gap-2 px-6 py-5">
          <div className="h-7 w-7 rounded-md bg-brand-600" />
          <span className="font-semibold">ProwasappAI</span>
        </div>
        <nav className="px-3">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={clsx(
                "block rounded-lg px-3 py-2 text-sm",
                pathname === n.href
                  ? "bg-brand-50 text-brand-700 font-medium"
                  : "text-slate-700 hover:bg-slate-100",
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 px-3">
          <button onClick={logout} className="btn-secondary w-full">
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">{children}</div>
      </main>
    </div>
  );
}
