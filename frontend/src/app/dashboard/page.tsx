"use client";

import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

type Me = {
  user: { name: string; email: string };
  tenant: {
    name: string;
    industry: string;
    subscription: { plan: string; status: string; trialEndsAt?: string };
  };
};

type Usage = {
  plan: string;
  limit: number;
  period: string;
  usage: { messagesIn: number; messagesOut: number; aiReplies: number };
};

type Session = {
  id: string;
  label: string;
  status: "pending" | "qr" | "connecting" | "connected" | "disconnected" | "error";
};

type Doc = {
  id: string;
  status: "pending" | "processing" | "ready" | "failed";
};

type AiConfig = {
  enabled: boolean;
  tone: string;
  language: string;
  voiceReply: boolean;
  confidenceFallback: number;
};

export default function DashboardHome() {
  const { data: me } = useSWR<Me>("/auth/me", fetcher);
  const { data: usage } = useSWR<Usage>("/billing/usage", fetcher);
  const { data: sessions } = useSWR<Session[]>("/whatsapp/sessions", fetcher, {
    refreshInterval: 5000,
  });
  const { data: docs } = useSWR<Doc[]>("/knowledge/documents", fetcher, {
    refreshInterval: 7000,
  });
  const { data: aiConfig } = useSWR<AiConfig>("/ai-config", fetcher);

  const firstName = me?.user.name?.split(" ")[0] || "Boss";
  const aiReplies = usage?.usage.aiReplies ?? 0;
  const limit = usage?.limit ?? 0;
  const usagePct = limit ? Math.min(100, Math.round((aiReplies / limit) * 100)) : 0;
  const connectedSessions = sessions?.filter((s) => s.status === "connected").length ?? 0;
  const readyDocs = docs?.filter((d) => d.status === "ready").length ?? 0;
  const processingDocs = docs?.filter((d) => d.status === "processing" || d.status === "pending").length ?? 0;

  const readiness = [
    {
      label: "IA active",
      done: Boolean(aiConfig?.enabled),
      href: "/dashboard/settings",
      detail: aiConfig ? `${toneLabel(aiConfig.tone)} - ${aiConfig.language.toUpperCase()}` : "Verification",
    },
    {
      label: "WhatsApp connecte",
      done: connectedSessions > 0,
      href: "/dashboard/whatsapp",
      detail: connectedSessions > 0 ? `${connectedSessions} session active` : "QR a scanner",
    },
    {
      label: "Base entrainee",
      done: readyDocs > 0,
      href: "/dashboard/knowledge",
      detail: readyDocs > 0 ? `${readyDocs} document pret` : "Importer PDF/FAQ",
    },
    {
      label: "Quota sous controle",
      done: usagePct < 85,
      href: "/dashboard/billing",
      detail: `${usagePct}% du plan ${usage?.plan ?? "Starter"}`,
    },
  ];
  const readyCount = readiness.filter((item) => item.done).length;

  return (
    <div className="space-y-6">
      <section className="dash-hero overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="dash-hero-grid">
          <div className="relative z-10 space-y-5 p-5 md:p-7">
            <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              <span className="status-pulse status-pulse-dark" />
              Centre de pilotage live
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Bonjour {firstName}</p>
              <h1 className="mt-1 max-w-3xl text-3xl font-semibold tracking-normal text-slate-950 md:text-4xl">
                {me?.tenant.name ?? "Votre entreprise"} peut gerer ses clients WhatsApp avec une IA prete a vendre.
              </h1>
            </div>
            <div className="grid max-w-4xl gap-3 sm:grid-cols-3">
              <Signal label="Readiness" value={`${readyCount}/4`} tone={readyCount >= 3 ? "green" : "amber"} />
              <Signal label="Reponses IA" value={formatNumber(aiReplies)} tone="blue" />
              <Signal label="Sessions WhatsApp" value={formatNumber(connectedSessions)} tone="slate" />
            </div>
          </div>
          <div className="dash-command-panel m-4 md:m-5">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase text-emerald-200">Operations</p>
                <p className="text-sm text-white">Pipeline automatique</p>
              </div>
              <span className="rounded-lg bg-emerald-400/18 px-2.5 py-1 text-xs font-semibold text-emerald-100">
                Online
              </span>
            </div>
            <div className="space-y-3 p-4">
              <FlowStep title="Message client recu" meta={`${formatNumber(usage?.usage.messagesIn ?? 0)} entrants`} active />
              <FlowStep title="Contexte verifie" meta={`${formatNumber(readyDocs)} sources pretes`} active={readyDocs > 0} />
              <FlowStep title="IA repond" meta={`${formatNumber(usage?.usage.messagesOut ?? 0)} sortants`} active={Boolean(aiConfig?.enabled)} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Messages entrants" value={usage?.usage.messagesIn ?? "-"} change="Capture client" />
        <MetricCard label="Messages sortants" value={usage?.usage.messagesOut ?? "-"} change="Suivi commercial" />
        <MetricCard label="Automatisations IA" value={aiReplies} change={`${usagePct}% du quota`} />
        <MetricCard label="Documents actifs" value={readyDocs} change={processingDocs ? `${processingDocs} en cours` : "Base stable"} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="card p-5">
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Plan de lancement</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">Ce qu'il faut pour accueillir les premiers utilisateurs</h2>
            </div>
            <div className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white">
              {readyCount * 25}% pret
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {readiness.map((item) => (
              <Link key={item.label} href={item.href} className="readiness-tile group">
                <span className={item.done ? "readiness-dot readiness-dot-ok" : "readiness-dot"} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-950">{item.label}</span>
                  <span className="block truncate text-xs text-slate-500">{item.detail}</span>
                </span>
                <span className="ml-auto text-sm text-slate-400 transition group-hover:translate-x-1 group-hover:text-slate-900">
                  →
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="card overflow-hidden p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Usage mensuel</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">Capacite IA</h2>
            </div>
            <span className="rounded-lg bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">
              {usage?.plan ?? "Starter"}
            </span>
          </div>
          <div className="mt-6">
            <div className="mb-2 flex items-end justify-between">
              <span className="text-sm text-slate-500">Reponses consommees</span>
              <span className="text-2xl font-semibold text-slate-950">
                {formatNumber(aiReplies)}
                <span className="text-sm font-medium text-slate-400"> / {formatNumber(limit)}</span>
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-lg bg-slate-100">
              <div className="usage-bar h-full rounded-lg" style={{ width: `${usagePct}%` }} />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <MiniStat label="Ton IA" value={aiConfig ? toneLabel(aiConfig.tone) : "-"} />
            <MiniStat label="Voix" value={aiConfig?.voiceReply ? "Active" : "Texte"} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <ActionCard href="/dashboard/whatsapp" title="Connecter un numero" text="Activez le canal qui recevra les demandes clients." />
        <ActionCard href="/dashboard/knowledge" title="Ajouter vos offres" text="Transformez vos tarifs, FAQ et catalogues en memoire IA." />
        <ActionCard href="/dashboard/conversations" title="Superviser les chats" text="Gardez la main sur les conversations importantes." />
      </section>
    </div>
  );
}

function Signal({ label, value, tone }: { label: string; value: string; tone: "green" | "amber" | "blue" | "slate" }) {
  return (
    <div className={`signal-card signal-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MetricCard({ label, value, change }: { label: string; value: React.ReactNode; change: string }) {
  return (
    <div className="metric-card">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
      <p className="mt-3 text-xs font-medium text-slate-500">{change}</p>
    </div>
  );
}

function FlowStep({ title, meta, active }: { title: string; meta: string; active?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.08] p-3">
      <span className={active ? "flow-node flow-node-active" : "flow-node"} />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-white">{title}</span>
        <span className="block truncate text-xs text-slate-300">{meta}</span>
      </span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function ActionCard({ href, title, text }: { href: string; title: string; text: string }) {
  return (
    <Link href={href} className="action-card group">
      <span className="action-corner" />
      <span className="block text-base font-semibold text-slate-950">{title}</span>
      <span className="mt-2 block text-sm leading-6 text-slate-600">{text}</span>
      <span className="mt-4 inline-flex text-sm font-semibold text-emerald-700 transition group-hover:translate-x-1">
        Ouvrir →
      </span>
    </Link>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

function toneLabel(tone: string) {
  const labels: Record<string, string> = {
    friendly: "Amical",
    professional: "Pro",
    casual: "Direct",
    formal: "Formel",
  };
  return labels[tone] ?? tone;
}
