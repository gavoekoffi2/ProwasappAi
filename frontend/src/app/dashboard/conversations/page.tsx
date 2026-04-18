"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import { fetcher } from "@/lib/fetcher";

type Message = {
  id: string;
  direction: "inbound" | "outbound";
  type: string;
  text: string | null;
  transcription: string | null;
  aiGenerated: boolean;
  createdAt: string;
};

type Conversation = {
  id: string;
  remoteJid: string;
  displayName: string | null;
  mode: "ai" | "human";
  lastAt: string;
  unread: number;
  messages: Message[];
};

export default function ConversationsPage() {
  const { data: conversations, mutate: refreshList } = useSWR<Conversation[]>(
    "/conversations",
    fetcher,
    { refreshInterval: 5000 },
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId && conversations?.[0]) setSelectedId(conversations[0].id);
  }, [conversations, selectedId]);

  return (
    <div className="grid h-[calc(100vh-7rem)] grid-cols-1 gap-4 md:grid-cols-[320px_1fr]">
      <aside className="card overflow-y-auto">
        <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold">
          Conversations
        </h2>
        <ul className="divide-y divide-slate-100">
          {conversations?.map((c) => (
            <li key={c.id}>
              <button
                className={`w-full px-4 py-3 text-left hover:bg-slate-50 ${
                  selectedId === c.id ? "bg-brand-50" : ""
                }`}
                onClick={() => setSelectedId(c.id)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {c.displayName ?? c.remoteJid.split("@")[0]}
                  </span>
                  {c.unread > 0 && (
                    <span className="ml-2 rounded-full bg-brand-600 px-2 text-xs text-white">
                      {c.unread}
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-slate-500">
                  {c.messages[0]?.text ?? c.messages[0]?.transcription ?? "—"}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">
                  {c.mode === "human" ? "👤 Humain" : "🤖 IA"}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {selectedId ? (
        <Thread conversationId={selectedId} onChanged={() => refreshList()} />
      ) : (
        <div className="card flex items-center justify-center text-sm text-slate-500">
          Sélectionnez une conversation.
        </div>
      )}
    </div>
  );
}

function Thread({ conversationId, onChanged }: { conversationId: string; onChanged: () => void }) {
  const { data, mutate } = useSWR<{ conversation: Conversation; messages: Message[] }>(
    `/conversations/${conversationId}/messages`,
    fetcher,
    { refreshInterval: 3000 },
  );
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    try {
      await api(`/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      setText("");
      await mutate();
      onChanged();
    } finally {
      setSending(false);
    }
  }

  async function toggleMode() {
    if (!data) return;
    const next = data.conversation.mode === "ai" ? "human" : "ai";
    await api(`/conversations/${conversationId}/handoff`, {
      method: "POST",
      body: JSON.stringify({ mode: next }),
    });
    await mutate();
    onChanged();
  }

  return (
    <section className="card flex flex-col">
      <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <h3 className="font-semibold">
            {data?.conversation.displayName ??
              data?.conversation.remoteJid.split("@")[0] ??
              "..."}
          </h3>
          <p className="text-xs text-slate-500">
            Mode: {data?.conversation.mode === "ai" ? "🤖 IA" : "👤 Humain"}
          </p>
        </div>
        <button className="btn-secondary" onClick={toggleMode}>
          {data?.conversation.mode === "ai" ? "Reprendre la main" : "Rendre à l'IA"}
        </button>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {data?.messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
              m.direction === "outbound"
                ? "ml-auto bg-brand-600 text-white"
                : "bg-slate-100"
            }`}
          >
            {m.aiGenerated && m.direction === "outbound" && (
              <p className="mb-0.5 text-[10px] opacity-75">🤖 IA</p>
            )}
            {m.type === "audio" && !m.transcription && <em>🎙️ Note vocale</em>}
            {m.transcription && <p>🎙️ {m.transcription}</p>}
            {m.text && <p>{m.text}</p>}
          </div>
        ))}
      </div>

      <div className="flex gap-2 border-t border-slate-100 p-3">
        <input
          className="input flex-1"
          placeholder="Tapez votre message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button className="btn-primary" onClick={send} disabled={sending}>
          Envoyer
        </button>
      </div>
    </section>
  );
}
