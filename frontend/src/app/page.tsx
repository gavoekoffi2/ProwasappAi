import "./landing.css";
import LandingClient from "./LandingClient";

export const metadata = {
  title: "ProwasappAI - Assistant IA WhatsApp pour entreprises africaines",
  description:
    "Automatisez vos conversations WhatsApp avec une IA formée sur vos documents, vos prix et votre façon de vendre.",
};

export default function HomePage() {
  return <LandingClient />;
}
