"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { api, apiUrl, getToken } from "@/lib/api";
import { fetcher } from "@/lib/fetcher";

type Session = {
  id: string;
  label: string;
  phone: string | null;
  status: "pending" | "qr" | "connecting" | "connected" | "disconnected" | "error";
  createdAt: string;
};

export default function WhatsappPage() {
  const { data: sessions, mutate } = useSWR<Session[]>("/whatsapp/sessions", fetcher, {
    refreshInterval: 3000,
  });
  const [label, setLabel] = useState("Principal");
  const [creating, setCreating] = useState(false);

  async function createSession() {
    setCreating(true);
    try {
      await api("/whatsapp/sessions", { method: "POST", body: JSON.stringify({ label }) });
      await mutate();
    } finally {
      setCreating(false);
    }
  }

  async function deleteSession(id: string) {
    if (!confirm("Déconnecter cette session ?")) return;
    await api(`/whatsapp/sessions/${id}`, { method: "DELETE" });
    await mutate();
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Connexion WhatsApp</h1>
        <p className="text-sm text-slate-600">
          Liez votre numéro WhatsApp via un QR code. Vous pouvez connecter
          plusieurs numéros (un par session).
        </p>
      </header>

      <div className="card flex flex-col gap-3 p-4 md:flex-row">
        <input
          className="input flex-1"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Nom de la session (ex: Ventes)"
        />
        <button className="btn-primary" onClick={createSession} disabled={creating}>
          {creating ? "..." : "+ Nouvelle session"}
        </button>
      </div>

      <div className="space-y-4">
        {sessions?.map((s) => (
          <SessionCard key={s.id} session={s} onDelete={() => deleteSession(s.id)} />
        ))}
        {sessions && sessions.length === 0 && (
          <p className="card p-6 text-center text-sm text-slate-500">
            Aucune session. Créez-en une pour afficher le QR code.
          </p>
        )}
      </div>
    </div>
  );
}

function SessionCard({ session, onDelete }: { session: Session; onDelete: () => void }) {
  const [qr, setQr] = useState<string | null>(null);
  const [status, setStatus] = useState(session.status);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // EventSource doesn't support custom headers, so we pass the token via URL.
    // The backend's SSE endpoint does not yet read `access_token`, so we use a
    // regular fetch-based stream instead.
    const token = getToken();
    if (!token) return;
    const ctrl = new AbortController();

    (async () => {
      const res = await fetch(apiUrl(`/whatsapp/sessions/${session.id}/qr`), {
        headers: { Authorization: `Bearer ${token}` },
        signal: ctrl.signal,
      });
      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const p of parts) {
          const event = /event:\s*(.*)/.exec(p)?.[1]?.trim();
          const data = /data:\s*(.*)/.exec(p)?.[1]?.trim();
          if (!event || !data) continue;
          if (event === "qr") setQr(data);
          else if (event === "status") setStatus(data as Session["status"]);
        }
      }
    })().catch(() => {});

    return () => ctrl.abort();
  }, [session.id]);

  const connected = status === "connected";

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{session.label}</h3>
          <p className="text-xs text-slate-500">
            {session.phone ?? "Non lié"} · <StatusBadge status={status} />
          </p>
        </div>
        <button className="btn-secondary" onClick={onDelete}>Supprimer</button>
      </div>

      {!connected && (
        <div className="mt-4 flex flex-col items-center gap-3 rounded-lg bg-slate-50 p-6">
          {qr ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="QR code WhatsApp" className="h-60 w-60" />
              <p className="text-center text-xs text-slate-600">
                Ouvrez WhatsApp → Paramètres → Appareils liés → Scanner ce QR
                code.
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-500">Génération du QR code...</p>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Session["status"] }) {
  const label: Record<Session["status"], string> = {
    pending: "En attente",
    qr: "Scannez le QR",
    connecting: "Connexion...",
    connected: "Connecté ✅",
    disconnected: "Déconnecté",
    error: "Erreur",
  };
  return <span>{label[status]}</span>;
}
