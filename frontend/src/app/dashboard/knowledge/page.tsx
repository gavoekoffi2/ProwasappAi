"use client";

import { useRef, useState } from "react";
import useSWR from "swr";
import { api, apiUpload } from "@/lib/api";
import { fetcher } from "@/lib/fetcher";
import { FileIcon, TextIcon } from "@/lib/icons";
import clsx from "clsx";

type Doc = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  status: "pending" | "processing" | "ready" | "failed";
  error: string | null;
  createdAt: string;
};

type Mode = "file" | "text";

export default function KnowledgePage() {
  const { data: docs, mutate } = useSWR<Doc[]>("/knowledge/documents", fetcher, {
    refreshInterval: 4000,
  });
  const [mode, setMode] = useState<Mode>("file");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Base de connaissances</h1>
        <p className="mt-1 text-sm text-slate-600">
          Importez vos PDF, FAQ, catalogues, tarifs — ou collez directement du
          texte. L&apos;IA utilisera ces informations pour répondre précisément
          à vos clients.
        </p>
      </header>

      <div className="card overflow-hidden">
        <div className="flex border-b border-slate-100">
          <TabButton active={mode === "file"} onClick={() => setMode("file")}>
            <FileIcon size={16} /> Fichier
          </TabButton>
          <TabButton active={mode === "text"} onClick={() => setMode("text")}>
            <TextIcon size={16} /> Texte brut
          </TabButton>
        </div>
        <div className="p-5">
          {mode === "file" ? <FileUpload onDone={mutate} /> : <TextUpload onDone={mutate} />}
        </div>
      </div>

      <div className="card overflow-hidden">
        <header className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">
          Documents importés{docs ? ` (${docs.length})` : ""}
        </header>
        <ul className="divide-y divide-slate-100">
          {docs?.map((d) => (
            <li key={d.id} className="flex items-center justify-between px-5 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">{d.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatSize(d.sizeBytes)} · <StatusLabel status={d.status} />
                  {d.error && <span className="ml-2 text-red-600">— {d.error}</span>}
                </p>
              </div>
              <button
                className="ml-3 shrink-0 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-red-50 hover:text-red-700"
                onClick={async () => {
                  if (!confirm(`Supprimer "${d.name}" de la base ?`)) return;
                  await api(`/knowledge/documents/${d.id}`, { method: "DELETE" });
                  await mutate();
                }}
              >
                Supprimer
              </button>
            </li>
          ))}
          {docs && docs.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-slate-500">
              Aucun document pour l&apos;instant. Importez-en un ci-dessus.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "inline-flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
        active
          ? "border-b-2 border-emerald-600 text-emerald-700"
          : "border-b-2 border-transparent text-slate-500 hover:text-slate-800",
      )}
    >
      {children}
    </button>
  );
}

function FileUpload({ onDone }: { onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  async function sendFile(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    setUploading(true);
    setError(null);
    try {
      await apiUpload("/knowledge/documents", fd);
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'envoi");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) sendFile(f);
        }}
        className={clsx(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors",
          dragging
            ? "border-emerald-500 bg-emerald-50"
            : "border-slate-200 bg-slate-50/60 hover:border-emerald-400 hover:bg-emerald-50/40",
        )}
      >
        <FileIcon size={28} className="text-emerald-600" />
        <p className="mt-3 text-sm font-medium text-slate-800">
          {uploading ? "Envoi en cours…" : "Cliquez ou glissez un fichier ici"}
        </p>
        <p className="mt-1 text-xs text-slate-500">PDF, TXT ou Markdown · 20 Mo max</p>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept=".pdf,.txt,.md,text/plain,application/pdf"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) sendFile(f);
          }}
          disabled={uploading}
        />
      </label>
      {error && (
        <p role="alert" className="mt-3 rounded-md bg-red-50 p-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

function TextUpload({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    setOk(false);
    try {
      await api("/knowledge/documents/text", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), content }),
      });
      setName("");
      setContent("");
      setOk(true);
      await onDone();
      setTimeout(() => setOk(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'envoi");
    } finally {
      setSending(false);
    }
  }

  const minOk = content.trim().length >= 20 && name.trim().length > 0;

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label htmlFor="kb-name" className="mb-1 block text-sm font-medium text-slate-700">
          Titre
        </label>
        <input
          id="kb-name"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='Ex: "Tarifs et livraison", "FAQ retours"…'
          maxLength={200}
          required
        />
      </div>
      <div>
        <label htmlFor="kb-content" className="mb-1 block text-sm font-medium text-slate-700">
          Contenu
        </label>
        <textarea
          id="kb-content"
          className="input min-h-[220px] resize-y leading-relaxed"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Collez ici vos informations : tarifs, horaires, conditions de livraison, FAQ, procédures, scripts de vente…"
          minLength={20}
          maxLength={200_000}
          required
        />
        <p className="mt-1 text-xs text-slate-500">
          {content.length.toLocaleString()} caractères · minimum 20.
        </p>
      </div>
      {error && (
        <p role="alert" className="rounded-md bg-red-50 p-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {ok && (
        <p role="status" className="rounded-md bg-emerald-50 p-2 text-sm text-emerald-800">
          ✓ Ajouté. L&apos;IA va l&apos;indexer dans quelques secondes.
        </p>
      )}
      <button
        type="submit"
        className="btn-primary"
        disabled={sending || !minOk}
        aria-busy={sending}
      >
        {sending ? "Ajout en cours…" : "Ajouter à la base"}
      </button>
    </form>
  );
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

function StatusLabel({ status }: { status: Doc["status"] }) {
  const map: Record<Doc["status"], { label: string; cls: string }> = {
    pending: { label: "⏳ En attente", cls: "text-slate-500" },
    processing: { label: "⚙️ Traitement…", cls: "text-blue-600" },
    ready: { label: "✅ Prêt", cls: "text-emerald-600" },
    failed: { label: "❌ Échec", cls: "text-red-600" },
  };
  const v = map[status];
  return <span className={v.cls}>{v.label}</span>;
}
