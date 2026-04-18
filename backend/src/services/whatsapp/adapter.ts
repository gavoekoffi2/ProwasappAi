// Abstraction over the concrete WhatsApp transport (Baileys, Cloud API, SMS…).
// Keep all call sites in the AI/orchestrator layer depending only on this
// interface so we can swap transports without touching business logic.

export interface OutboundText {
  type: "text";
  text: string;
}

export interface OutboundAudio {
  type: "audio";
  audio: Buffer;        // OGG/Opus
  durationSec?: number;
}

export type OutboundMessage = OutboundText | OutboundAudio;

export interface IWhatsappAdapter {
  send(sessionId: string, remoteJid: string, msg: OutboundMessage): Promise<string | null>;
}
