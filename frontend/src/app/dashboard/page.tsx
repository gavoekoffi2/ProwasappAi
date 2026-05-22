"use client";

import useSWR from "swr";
import { motion, useMotionValue, useTransform, animate, type Variants } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";
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
  phone?: string | null;
  status: string;
  updatedAt: string;
};

type Conversation = {
  id: string;
  displayName?: string | null;
  remoteJid: string;
  lastAt: string;
  unread: number;
  mode: "ai" | "human";
};

export default function DashboardHome() {
  const { data: me } = useSWR<Me>("/auth/me", fetcher);
  const { data: usage } = useSWR<Usage>("/billing/usage", fetcher, { refreshInterval: 10_000 });
  const { data: sessions } = useSWR<Session[]>("/whatsapp/sessions", fetcher, {
    refreshInterval: 5_000,
  });
  const { data: conversations } = useSWR<Conversation[]>("/conversations", fetcher, {
    refreshInterval: 8_000,
  });

  const firstName = me?.user.name?.split(" ")[0] ?? "";
  const recent = (conversations ?? []).slice(0, 5);

  return (
    <div className="space-y-8">
      <Hero name={firstName} tenant={me?.tenant.name} plan={me?.tenant.subscription.plan} />

      <motion.section
        initial="hidden"
        animate="visible"
        variants={stagger}
        className="grid gap-4 md:grid-cols-3"
      >
        <StatCard
          label="Réponses IA ce mois"
          value={usage?.usage.aiReplies ?? 0}
          max={usage?.limit}
          accent="brand"
          icon="✨"
        />
        <StatCard
          label="Messages reçus"
          value={usage?.usage.messagesIn ?? 0}
          accent="sky"
          icon="📥"
        />
        <StatCard
          label="Messages envoyés"
          value={usage?.usage.messagesOut ?? 0}
          accent="violet"
          icon="📤"
        />
      </motion.section>

      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="lg:col-span-1"
        >
          <SessionsCard sessions={sessions} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="lg:col-span-2"
        >
          <ActivityCard conversations={recent} />
        </motion.div>
      </div>

      <motion.section
        initial="hidden"
        animate="visible"
        variants={stagger}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <OnboardCard
          step={1}
          title="Connectez WhatsApp"
          href="/dashboard/whatsapp"
          cta="Scanner le QR"
          gradient="from-emerald-500 to-teal-600"
          icon="📱"
        >
          Liez votre numéro WhatsApp. Vos messages arrivent en temps réel.
        </OnboardCard>
        <OnboardCard
          step={2}
          title="Entraînez votre IA"
          href="/dashboard/knowledge"
          cta="Importer un document"
          gradient="from-violet-500 to-indigo-600"
          icon="📚"
        >
          Ajoutez vos PDF, tarifs, FAQ. L'IA répond à partir de votre contenu.
        </OnboardCard>
        <OnboardCard
          step={3}
          title="Personnalisez le ton"
          href="/dashboard/settings"
          cta="Configurer l'IA"
          gradient="from-amber-500 to-orange-600"
          icon="🎨"
        >
          Choisissez le ton, la langue, activez les réponses vocales.
        </OnboardCard>
        <OnboardCard
          step={4}
          title="Suivez les conversations"
          href="/dashboard/conversations"
          cta="Voir tout"
          gradient="from-sky-500 to-blue-600"
          icon="💬"
        >
          Surveillez les échanges, reprenez la main quand vous voulez.
        </OnboardCard>
      </motion.section>
    </div>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────────────

function Hero({ name, tenant, plan }: { name: string; tenant?: string; plan?: string }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-brand-600 via-brand-500 to-emerald-500 px-6 py-8 text-white shadow-lg md:px-10 md:py-10"
    >
      <div className="absolute inset-0 opacity-30">
        <motion.div
          className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/40 blur-3xl"
          animate={{ scale: [1, 1.15, 1], rotate: [0, 30, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-emerald-200/60 blur-3xl"
          animate={{ scale: [1, 1.2, 1], rotate: [0, -25, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <div className="relative">
        <p className="text-sm uppercase tracking-wider text-white/80">Tableau de bord</p>
        <h1 className="mt-1 text-3xl font-semibold md:text-4xl">
          Bonjour {name} 👋
        </h1>
        <p className="mt-2 max-w-xl text-white/90">
          {tenant ? (
            <>
              Pilotage de <strong>{tenant}</strong>. Votre assistant IA est prêt à répondre
              à vos clients sur WhatsApp 24h/24.
            </>
          ) : (
            "Chargement…"
          )}
        </p>
        {plan && (
          <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur">
            Plan <span className="uppercase">{plan}</span>
          </span>
        )}
      </div>
    </motion.header>
  );
}

// ─── Stat counter card ───────────────────────────────────────────────────────

const ACCENTS: Record<string, { bg: string; ring: string; text: string }> = {
  brand: { bg: "bg-brand-50", ring: "ring-brand-200", text: "text-brand-700" },
  sky: { bg: "bg-sky-50", ring: "ring-sky-200", text: "text-sky-700" },
  violet: { bg: "bg-violet-50", ring: "ring-violet-200", text: "text-violet-700" },
};

function StatCard({
  label,
  value,
  max,
  accent,
  icon,
}: {
  label: string;
  value: number;
  max?: number;
  accent: keyof typeof ACCENTS;
  icon: string;
}) {
  const colors = ACCENTS[accent];
  const pct = max && max > 0 ? Math.min(100, (value / max) * 100) : null;

  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="card relative overflow-hidden p-5"
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${colors.bg} text-lg ring-1 ${colors.ring}`}
        >
          {icon}
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <Counter value={value} className="text-3xl font-semibold text-slate-900" />
        {typeof max === "number" && (
          <span className="text-sm text-slate-400">/ {max.toLocaleString("fr-FR")}</span>
        )}
      </div>
      {pct !== null && (
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <motion.div
            className={`h-full bg-gradient-to-r ${
              accent === "brand"
                ? "from-brand-400 to-brand-600"
                : accent === "sky"
                  ? "from-sky-400 to-sky-600"
                  : "from-violet-400 to-violet-600"
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
      )}
    </motion.div>
  );
}

function Counter({ value, className }: { value: number; className?: string }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v).toLocaleString("fr-FR"));
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.9, ease: "easeOut" });
    const unsub = rounded.on("change", setDisplay);
    return () => {
      controls.stop();
      unsub();
    };
  }, [mv, rounded, value]);

  return <span className={className}>{display}</span>;
}

// ─── WhatsApp status card ────────────────────────────────────────────────────

function SessionsCard({ sessions }: { sessions?: Session[] }) {
  const list = sessions ?? [];
  const connected = list.filter((s) => s.status === "connected").length;

  return (
    <div className="card flex h-full flex-col p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Statut WhatsApp</h3>
        <Link href="/dashboard/whatsapp" className="text-xs text-brand-700 hover:underline">
          Gérer →
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="mt-6 flex flex-1 flex-col items-center justify-center text-center">
          <div className="text-3xl">📵</div>
          <p className="mt-2 text-sm text-slate-500">Aucun numéro connecté</p>
          <Link href="/dashboard/whatsapp" className="btn-primary mt-4">
            Connecter un numéro
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-1 text-xs text-slate-500">
            {connected} / {list.length} actif{list.length > 1 ? "s" : ""}
          </p>
          <ul className="mt-3 space-y-2">
            {list.slice(0, 3).map((s) => (
              <motion.li
                key={s.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2"
              >
                <StatusDot status={s.status} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.label}</p>
                  <p className="truncate text-xs text-slate-500">
                    {s.phone ?? statusLabel(s.status)}
                  </p>
                </div>
              </motion.li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "connected"
      ? "bg-emerald-500"
      : status === "qr" || status === "connecting"
        ? "bg-amber-500"
        : status === "error"
          ? "bg-rose-500"
          : "bg-slate-400";
  const alive = status === "connected";

  return (
    <span className="relative flex h-2.5 w-2.5">
      {alive && (
        <motion.span
          className={`absolute inline-flex h-full w-full rounded-full ${color} opacity-75`}
          animate={{ scale: [1, 2, 1], opacity: [0.7, 0, 0.7] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${color}`} />
    </span>
  );
}

function statusLabel(s: string) {
  return (
    {
      connected: "Connecté",
      connecting: "Connexion…",
      qr: "QR en attente",
      disconnected: "Déconnecté",
      error: "Erreur",
      pending: "En attente",
    } as Record<string, string>
  )[s] ?? s;
}

// ─── Recent activity ─────────────────────────────────────────────────────────

function ActivityCard({ conversations }: { conversations: Conversation[] }) {
  return (
    <div className="card flex h-full flex-col p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Activité récente</h3>
        <Link href="/dashboard/conversations" className="text-xs text-brand-700 hover:underline">
          Voir tout →
        </Link>
      </div>

      {conversations.length === 0 ? (
        <div className="mt-6 flex flex-1 flex-col items-center justify-center text-center">
          <div className="text-3xl">💬</div>
          <p className="mt-2 text-sm text-slate-500">
            Aucune conversation pour le moment.
            <br />
            Elles apparaîtront ici dès qu'un client vous écrit.
          </p>
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {conversations.map((c, i) => (
            <motion.li
              key={c.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 py-3"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                {(c.displayName ?? c.remoteJid).slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {c.displayName ?? c.remoteJid.split("@")[0]}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {c.mode === "ai" ? "Géré par l'IA" : "Pris par un humain"} •{" "}
                  {timeAgo(c.lastAt)}
                </p>
              </div>
              {c.unread > 0 && (
                <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-medium text-white">
                  {c.unread}
                </span>
              )}
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}

// ─── Onboarding cards ────────────────────────────────────────────────────────

function OnboardCard({
  step,
  title,
  href,
  cta,
  gradient,
  icon,
  children,
}: {
  step: number;
  title: string;
  href: string;
  cta: string;
  gradient: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className="card group relative overflow-hidden p-5"
    >
      <div
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${gradient} opacity-80`}
      />
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-xl text-white shadow-sm`}
      >
        {icon}
      </div>
      <p className="mt-4 text-xs font-medium uppercase tracking-wider text-slate-400">
        Étape {step}
      </p>
      <h3 className="mt-0.5 font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{children}</p>
      <Link
        href={href}
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700 transition group-hover:gap-2"
      >
        {cta}
        <span aria-hidden>→</span>
      </Link>
    </motion.div>
  );
}

// ─── Motion variants ─────────────────────────────────────────────────────────

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};
