"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import { fetcher } from "@/lib/fetcher";

type AiConfig = {
  systemPrompt: string;
  tone: string;
  language: string;
  voiceReply: boolean;
  fallbackMessage: string;
  confidenceFallback: number;
  enabled: boolean;
};

export default function SettingsPage() {
  const { data, mutate } = useSWR<AiConfig>("/ai-config", fetcher);
  const [form, setForm] = useState<AiConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data && !form) setForm(data);
  }, [data, form]);

  function set<K extends keyof AiConfig>(k: K, v: AiConfig[K]) {
    setForm((p) => (p ? { ...p, [k]: v } : p));
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    setSaved(false);
    try {
      await api("/ai-config", { method: "PUT", body: JSON.stringify(form) });
      await mutate();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  if (!form) return <p className="text-sm text-slate-500">Chargement...</p>;

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Paramètres de l'IA</h1>
        <p className="text-sm text-slate-600">
          Ce que votre IA sait, comment elle parle, et quand elle passe la
          main à un humain.
        </p>
      </header>

      <div className="card space-y-4 p-6">
        <label className="flex items-center justify-between">
          <div>
            <p className="font-medium">IA activée</p>
            <p className="text-xs text-slate-500">
              Désactivée, les messages entrants ne reçoivent pas de réponse auto.
            </p>
          </div>
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => set("enabled", e.target.checked)}
            className="h-5 w-5"
          />
        </label>

        <label className="flex items-center justify-between">
          <div>
            <p className="font-medium">Réponses vocales</p>
            <p className="text-xs text-slate-500">
              L'IA renvoie une note vocale au lieu d'un texte.
            </p>
          </div>
          <input
            type="checkbox"
            checked={form.voiceReply}
            onChange={(e) => set("voiceReply", e.target.checked)}
            className="h-5 w-5"
          />
        </label>
      </div>

      <div className="card space-y-4 p-6">
        <Field label="Prompt système (ce que l'IA sait d'elle-même)">
          <textarea
            className="input min-h-[180px] font-mono text-xs"
            value={form.systemPrompt}
            onChange={(e) => set("systemPrompt", e.target.value)}
          />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Ton">
            <select
              className="input"
              value={form.tone}
              onChange={(e) => set("tone", e.target.value)}
            >
              <option value="friendly">Amical</option>
              <option value="professional">Professionnel</option>
              <option value="casual">Décontracté</option>
              <option value="formal">Formel</option>
            </select>
          </Field>
          <Field label="Langue par défaut">
            <select
              className="input"
              value={form.language}
              onChange={(e) => set("language", e.target.value)}
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </Field>
        </div>
        <Field label="Message de transfert à un humain">
          <input
            className="input"
            value={form.fallbackMessage}
            onChange={(e) => set("fallbackMessage", e.target.value)}
          />
        </Field>
        <Field label={`Seuil de confiance (${Math.round(form.confidenceFallback * 100)}%)`}>
          <input
            type="range"
            min={0.3}
            max={0.9}
            step={0.05}
            value={form.confidenceFallback}
            onChange={(e) => set("confidenceFallback", Number(e.target.value))}
            className="w-full"
          />
        </Field>
      </div>

      <div className="flex items-center gap-3">
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
        {saved && <span className="text-sm text-brand-700">✓ Enregistré</span>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
