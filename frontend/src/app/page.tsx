import "./landing.css";
import LandingClient from "./LandingClient";

export const metadata = {
  title: "ProwasappAI — Assistant IA WhatsApp pour entreprises africaines",
  description:
    "Automatisez vos conversations WhatsApp avec une IA formée sur vos documents, vos prix et votre façon de vendre. Texte et notes vocales, transfert humain, prêt pour le terrain africain.",
  keywords: [
    "WhatsApp IA",
    "chatbot WhatsApp",
    "Afrique",
    "assistant vocal",
    "automatisation WhatsApp",
    "SaaS WhatsApp",
  ],
  authors: [{ name: "ProwasappAI" }],
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://prowasappai.netlify.app",
    siteName: "ProwasappAI",
    title: "ProwasappAI — L'IA qui vend sur WhatsApp pour vous",
    description:
      "L'assistant WhatsApp pensé pour l'Afrique : texte et vocal, formé sur vos documents, transfert humain. Lancez votre assistant en moins d'une minute.",
    images: [
      {
        url: "/images/african-business-hero.png",
        width: 1200,
        height: 630,
        alt: "Entrepreneurs africains utilisant ProwasappAI sur WhatsApp",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ProwasappAI — L'IA qui vend sur WhatsApp pour vous",
    description:
      "L'assistant WhatsApp pensé pour l'Afrique : texte, vocal, transfert humain.",
    images: ["/images/african-business-hero.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function HomePage() {
  return <LandingClient />;
}
