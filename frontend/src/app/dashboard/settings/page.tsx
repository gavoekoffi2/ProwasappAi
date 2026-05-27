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
  const [error, setError] = useState<string | null>(null);

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
    setError(null);
    try {
      await api("/ai-config", { method: "PUT", body: JSON.stringify(form) });
      await mutate();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  if (!form) return <p className="text-sm text-slate-500">Chargement…</p>;

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Paramètres de l&apos;IA</h1>
        <p className="text-sm text-slate-600">
          Ce que votre IA sait, comment elle parle, et quand elle passe la
          main à un humain.
        </p>
      </header>

      <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-4 text-sm text-brand-900">
        <p className="font-semibold">Comment l&apos;IA répond</p>
        <p className="mt-1 text-brand-800/90">
          L&apos;assistant utilise <strong>uniquement</strong> les informations
          présentes dans votre{" "}
          <a href="/dashboard/knowledge" className="underline">
            base de connaissances
          </a>
          . Si une question sort du périmètre, il répond poliment qu&apos;il
          vérifie avec votre équipe et la conversation bascule en mode humain.
          Plus votre base est riche, plus l&apos;IA répond directement.
        </p>
      </div>

      <div className="card space-y-4 p-6">
        <ToggleRow
          label="IA activée"
          desc="Désactivée, les messages entrants ne reçoivent pas de réponse auto."
          checked={form.enabled}
          onChange={(v) => set("enabled", v)}
        />
        <ToggleRow
          label="Réponses vocales"
          desc="L'IA renvoie une note vocale au lieu d'un texte quand c'est pertinent."
          checked={form.voiceReply}
          onChange={(v) => set("voiceReply", v)}
        />
      </div>

      <div className="card space-y-4 p-6">
        <Field
          label="Persona / rôle de l'IA"
          hint="Décrit en 1-3 phrases qui parle. Les règles strictes (ne pas inventer, basculer vers un humain si besoin) sont ajoutées automatiquement à chaque réponse — pas besoin de les répéter ici."
        >
          <textarea
            className="input min-h-[160px] font-mono text-xs leading-relaxed"
            value={form.systemPrompt}
            onChange={(e) => set("systemPrompt", e.target.value)}
            maxLength={8000}
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
        <Field
          label="Message envoyé quand l'IA passe la main"
          hint="Affiché au client quand l'information n'est pas dans la base. Garde-le court et rassurant."
        >
          <input
            className="input"
            value={form.fallbackMessage}
            onChange={(e) => set("fallbackMessage", e.target.value)}
            maxLength={500}
          />
        </Field>
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-red-50 p-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          className="btn-primary"
          onClick={save}
          disabled={saving}
          aria-busy={saving}
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
        {saved && (
          <span role="status" className="text-sm text-brand-700">
            ✓ Enregistré
          </span>
        )}
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="font-medium text-slate-900">{label}</p>
        <p className="mt-0.5 text-xs text-slate-500">{desc}</p>
      </div>
      <span
        role="switch"
        aria-checked={checked}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-brand-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
        <input
          type="checkbox"
          className="absolute inset-0 cursor-pointer opacity-0"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
      </span>
    </label>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 text-sm font-medium text-slate-800">{label}</div>
      {hint && <p className="mb-2 text-xs text-slate-500">{hint}</p>}
      {children}
    </div>
  );
}
