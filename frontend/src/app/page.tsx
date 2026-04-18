import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-brand-50">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-brand-600" />
          <span className="text-lg font-semibold">ProwasappAI</span>
        </div>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="text-sm">Se connecter</Link>
          <Link href="/register" className="btn-primary">Essai gratuit</Link>
        </nav>
      </header>

      <section className="mx-auto max-w-5xl px-6 pt-16 pb-24 text-center">
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
          L'IA qui répond à vos clients WhatsApp,{" "}
          <span className="text-brand-600">24h/24.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
          Connectez votre numéro WhatsApp, entraînez l'IA avec vos informations,
          et transformez chaque conversation en vente. Pensé pour l'Afrique —
          texte <strong>et</strong> notes vocales.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/register" className="btn-primary px-6 py-3">
            Commencer gratuitement
          </Link>
          <Link href="/login" className="btn-secondary px-6 py-3">
            J'ai déjà un compte
          </Link>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          <Feature
            title="QR Code WhatsApp"
            desc="Connectez votre numéro en 30 secondes. Multi-session supporté."
          />
          <Feature
            title="IA entraînée sur vous"
            desc="Importez vos PDF, tarifs, FAQ. L'IA répond avec votre contexte."
          />
          <Feature
            title="Notes vocales"
            desc="L'IA comprend les audios et peut répondre en vocal, comme un humain."
          />
        </div>
      </section>
    </main>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="card p-6 text-left">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{desc}</p>
    </div>
  );
}
