"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import { fetcher } from "@/lib/fetcher";
import { useState } from "react";

type Subscription = {
  plan: "starter" | "pro" | "business";
  status: "trialing" | "active" | "past_due" | "canceled";
  trialEndsAt: string | null;
};
type Usage = {
  plan: string;
  limit: number;
  period: string;
  usage: { messagesIn: number; messagesOut: number; aiReplies: number };
};

const PLANS = [
  { id: "starter", name: "Starter", price: "Gratuit / 7 jours", limit: "1 000 réponses IA / mois" },
  { id: "pro", name: "Pro", price: "15 000 FCFA / mois", limit: "10 000 réponses IA / mois" },
  { id: "business", name: "Business", price: "50 000 FCFA / mois", limit: "50 000 réponses IA / mois" },
] as const;

export default function BillingPage() {
  const { data: sub, mutate: refreshSub } = useSWR<Subscription>("/billing/subscription", fetcher);
  const { data: usage } = useSWR<Usage>("/billing/usage", fetcher);
  const [loading, setLoading] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function choose(plan: "starter" | "pro" | "business") {
    setLoading(plan);
    setNotice(null);
    try {
      const r = await api<{ url: string | null; provider: string }>("/billing/subscription", {
        method: "POST",
        body: JSON.stringify({ plan }),
      });
      if (r.url) {
        window.location.href = r.url;
        return;
      }
      setNotice({
        kind: "ok",
        text: "Abonnement activé. Si vous payez en Mobile Money, votre responsable ProwasappAI vous contactera pour confirmer le versement.",
      });
      await refreshSub();
    } catch (err) {
      setNotice({
        kind: "err",
        text:
          err instanceof Error
            ? err.message
            : "Impossible de mettre à jour l'abonnement. Réessayez.",
      });
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Abonnement</h1>
        <p className="text-sm text-slate-600">
          Plan actuel: <strong>{sub?.plan ?? "—"}</strong> · Statut:{" "}
          <strong>{sub?.status ?? "—"}</strong>
        </p>
      </header>

      {notice && (
        <div
          role={notice.kind === "err" ? "alert" : "status"}
          className={`rounded-lg p-3 text-sm ${
            notice.kind === "ok"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-700"
          }`}
        >
          {notice.text}
        </div>
      )}

      {usage && (
        <div className="card p-6">
          <p className="text-sm text-slate-500">Usage du mois ({usage.period})</p>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-brand-600"
              style={{
                width: `${Math.min(100, (usage.usage.aiReplies / usage.limit) * 100)}%`,
              }}
            />
          </div>
          <p className="mt-2 text-sm">
            {usage.usage.aiReplies} / {usage.limit} réponses IA
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => (
          <div key={p.id} className="card flex flex-col p-6">
            <h3 className="text-lg font-semibold">{p.name}</h3>
            <p className="mt-1 text-sm text-slate-600">{p.limit}</p>
            <p className="mt-4 text-2xl font-semibold">{p.price}</p>
            <button
              className="btn-primary mt-auto"
              disabled={loading !== null || sub?.plan === p.id}
              aria-busy={loading === p.id}
              onClick={() => choose(p.id)}
            >
              {sub?.plan === p.id
                ? "Plan actuel"
                : loading === p.id
                  ? "Activation en cours…"
                  : "Choisir"}
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-500">
        Mobile Money (Flooz / T-Money / Orange Money / MTN MoMo) accepté sur
        demande — contactez-nous après avoir choisi un plan.
      </p>
    </div>
  );
}
