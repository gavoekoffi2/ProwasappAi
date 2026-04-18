import "@/styles/globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ProwasappAI — WhatsApp AI for African businesses",
  description:
    "Automate WhatsApp conversations with AI. Train on your business data. Reply in text or voice. Built for Africa.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
