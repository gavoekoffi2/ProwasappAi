"use client";

import { useRef, useState } from "react";
import useSWR from "swr";
import { api, apiUpload } from "@/lib/api";
import { fetcher } from "@/lib/fetcher";

type Doc = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  status: "pending" | "processing" | "ready" | "failed";
  error: string | null;
  createdAt: string;
};

export default function KnowledgePage() {
  const { data: docs, mutate } = useSWR<Doc[]>("/knowledge/documents", fetcher, {
    refreshInterval: 4000,
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    setUploading(true);
    setError(null);
    try {
      await apiUpload("/knowledge/documents", fd);
      await mutate();
    } catch (err: any) {
      setError(err.message ?? "Échec de l'envoi");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remove(id: string) {
    if (!confirm("Supprimer ce document de la base ?")) return;
    await api(`/knowledge/documents/${id}`, { method: "DELETE" });
    await mutate();
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Base de connaissances</h1>
        <p className="text-sm text-slate-600">
          Importez vos PDF, FAQ, catalogues, tarifs. L'IA utilisera ces
          informations pour répondre précisément à vos clients.
        </p>
      </header>

      <div className="card p-4">
        <label className="btn-primary inline-flex cursor-pointer">
          {uploading ? "Envoi..." : "📎 Importer un document"}
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".pdf,.txt,.md,text/plain,application/pdf"
            onChange={upload}
            disabled={uploading}
          />
        </label>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      <div className="card divide-y divide-slate-100">
        {docs?.map((d) => (
          <div key={d.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{d.name}</p>
              <p className="text-xs text-slate-500">
                {Math.round(d.sizeBytes / 1024)} Ko · <StatusLabel status={d.status} />
                {d.error && <span className="ml-2 text-red-600">— {d.error}</span>}
              </p>
            </div>
            <button className="btn-secondary" onClick={() => remove(d.id)}>
              Supprimer
            </button>
          </div>
        ))}
        {docs && docs.length === 0 && (
          <p className="p-6 text-center text-sm text-slate-500">
            Aucun document. Importez-en un pour commencer.
          </p>
        )}
      </div>
    </div>
  );
}

function StatusLabel({ status }: { status: Doc["status"] }) {
  const map = {
    pending: "⏳ En attente",
    processing: "⚙️ Traitement...",
    ready: "✅ Prêt",
    failed: "❌ Échec",
  } as const;
  return <span>{map[status]}</span>;
}
