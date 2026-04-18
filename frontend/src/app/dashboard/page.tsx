"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import Link from "next/link";

type Me = {
  user: { name: string; email: string };
  tenant: { name: string; industry: string; subscription: { plan: string; status: string; trialEndsAt?: string } };
};

type Usage = {
  plan: string;
  limit: number;
  period: string;
  usage: { messagesIn: number; messagesOut: number; aiReplies: number };
};

export default function DashboardHome() {
  const { data: me } = useSWR<Me>("/auth/me", fetcher);
  const { data: usage } = useSWR<Usage>("/billing/usage", fetcher);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">
          Bonjour {me?.user.name?.split(" ")[0] ?? ""} 👋
        </h1>
        <p className="text-sm text-slate-600">
          Tableau de bord de <strong>{me?.tenant.name}</strong>
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Stat label="Réponses IA (mois)" value={usage ? `${usage.usage.aiReplies} / ${usage.limit}` : "—"} />
        <Stat label="Messages reçus" value={usage?.usage.messagesIn ?? "—"} />
        <Stat label="Messages envoyés" value={usage?.usage.messagesOut ?? "—"} />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card title="1. Connectez WhatsApp" href="/dashboard/whatsapp" cta="Scanner le QR code">
          Liez votre numéro WhatsApp à ProwasappAI via un QR code. Vos messages
          arrivent dans le dashboard en temps réel.
        </Card>
        <Card title="2. Entraînez votre IA" href="/dashboard/knowledge" cta="Importer un document">
          Ajoutez vos PDF, tarifs, FAQ. L'IA utilisera ce contexte pour répondre
          à vos clients.
        </Card>
        <Card title="3. Personnalisez le ton" href="/dashboard/settings" cta="Configurer l'IA">
          Choisissez le ton, la langue, et activez les réponses vocales.
        </Card>
        <Card title="4. Gérez les conversations" href="/dashboard/conversations" cta="Voir les conversations">
          Surveillez les discussions, reprenez la main à tout moment.
        </Card>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="card p-5">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Card({
  title,
  href,
  cta,
  children,
}: {
  title: string;
  href: string;
  cta: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-6">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{children}</p>
      <Link href={href} className="btn-primary mt-4 inline-flex">
        {cta}
      </Link>
    </div>
  );
}
