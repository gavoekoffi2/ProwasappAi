"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, setToken } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    businessName: "",
    industry: "ecommerce" as "ecommerce" | "realestate" | "services" | "other",
    locale: "fr",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const r = await api<{ token: string }>("/auth/register", {
        method: "POST",
        auth: false,
        body: JSON.stringify(form),
      });
      setToken(r.token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  }

  const industryId = useId();

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <form onSubmit={onSubmit} className="card w-full max-w-md space-y-4 p-8">
        <h1 className="text-2xl font-semibold">Créer votre compte</h1>
        <p className="text-sm text-slate-600">
          7 jours gratuits. Aucune carte bancaire requise.
        </p>
        {error && (
          <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <Input
          label="Nom complet"
          autoComplete="name"
          value={form.name}
          onChange={(v) => set("name", v)}
          maxLength={120}
        />
        <Input
          label="Nom de l'entreprise"
          autoComplete="organization"
          value={form.businessName}
          onChange={(v) => set("businessName", v)}
          maxLength={120}
        />
        <div>
          <label htmlFor={industryId} className="mb-1 block text-sm">
            Secteur
          </label>
          <select
            id={industryId}
            className="input"
            value={form.industry}
            onChange={(e) => set("industry", e.target.value as typeof form.industry)}
          >
            <option value="ecommerce">E-commerce / Boutique</option>
            <option value="realestate">Immobilier</option>
            <option value="services">Services / Prestations</option>
            <option value="other">Autre</option>
          </select>
        </div>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={form.email}
          onChange={(v) => set("email", v)}
        />
        <Input
          label="Mot de passe (min. 8 caractères)"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={(v) => set("password", v)}
          minLength={8}
          maxLength={128}
        />
        <button
          className="btn-primary w-full"
          type="submit"
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? "Création du compte…" : "Créer mon compte"}
        </button>
        <p className="text-center text-sm text-slate-600">
          Déjà inscrit ?{" "}
          <Link href="/login" className="text-brand-600 hover:underline">
            Se connecter
          </Link>
        </p>
      </form>
    </main>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  inputMode,
  minLength,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  minLength?: number;
  maxLength?: number;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm">
        {label}
      </label>
      <input
        id={id}
        className="input"
        type={type}
        autoComplete={autoComplete}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        minLength={minLength}
        maxLength={maxLength}
      />
    </div>
  );
}
