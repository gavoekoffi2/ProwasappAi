"use client";

import { useState } from "react";
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
    } catch (err: any) {
      setError(err.message ?? "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <form onSubmit={onSubmit} className="card w-full max-w-md space-y-4 p-8">
        <h1 className="text-2xl font-semibold">Créer votre compte</h1>
        <p className="text-sm text-slate-600">
          7 jours gratuits. Aucune carte bancaire requise.
        </p>
        {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        <Input label="Nom complet" value={form.name} onChange={(v) => set("name", v)} />
        <Input label="Nom de l'entreprise" value={form.businessName} onChange={(v) => set("businessName", v)} />
        <label className="block">
          <span className="mb-1 block text-sm">Secteur</span>
          <select
            className="input"
            value={form.industry}
            onChange={(e) => set("industry", e.target.value as typeof form.industry)}
          >
            <option value="ecommerce">E-commerce / Boutique</option>
            <option value="realestate">Immobilier</option>
            <option value="services">Services / Prestations</option>
            <option value="other">Autre</option>
          </select>
        </label>
        <Input label="Email" type="email" value={form.email} onChange={(v) => set("email", v)} />
        <Input label="Mot de passe (min. 8 caractères)" type="password" value={form.password} onChange={(v) => set("password", v)} />
        <button className="btn-primary w-full" type="submit" disabled={loading}>
          {loading ? "..." : "Créer mon compte"}
        </button>
        <p className="text-center text-sm text-slate-600">
          Déjà inscrit ?{" "}
          <Link href="/login" className="text-brand-600 hover:underline">Se connecter</Link>
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm">{label}</span>
      <input
        className="input"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
      />
    </label>
  );
}
