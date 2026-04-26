import Link from "next/link";

const features = [
  {
    title: "Réponses instantanées",
    text: "Chaque message WhatsApp reçoit une réponse claire, contextualisée et alignée avec votre façon de vendre.",
  },
  {
    title: "IA formée sur vos documents",
    text: "Importez tarifs, FAQ, catalogues ou procédures. L'assistant répond avec vos vraies informations.",
  },
  {
    title: "Notes vocales comprises",
    text: "Les clients peuvent envoyer des audios. L'IA transcrit, comprend et peut répondre en texte ou en vocal.",
  },
  {
    title: "Reprise humaine",
    text: "Quand la conversation devient sensible, l'IA passe la main à votre équipe sans perdre le contexte.",
  },
];

const useCases = [
  "Boutiques et e-commerce",
  "Agences immobilières",
  "Services, salons et rendez-vous",
  "Écoles, formations et cabinets",
];

const steps = [
  ["1", "Connectez WhatsApp", "Scannez un QR code et reliez votre numéro principal ou vos numéros d'équipe."],
  ["2", "Ajoutez vos connaissances", "Chargez vos PDF, prix, conditions, FAQ et réponses fréquentes."],
  ["3", "Laissez l'IA qualifier", "Elle répond, collecte les infos utiles et vous alerte quand un humain doit intervenir."],
];

export default function HomePage() {
  return (
    <main className="overflow-hidden bg-[#f8faf7] text-slate-950">
      <section className="relative min-h-[92vh] border-b border-black/5">
        <div className="absolute inset-0">
          <img
            src="/images/african-business-hero.png"
            alt="Entrepreneurs africains utilisant une plateforme WhatsApp professionnelle"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/82 via-black/62 to-black/20" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#f8faf7] to-transparent" />
        </div>

        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8">
          <Link href="/" className="flex items-center gap-3 text-white">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500 font-black text-slate-950">
              P
            </span>
            <span className="text-lg font-semibold tracking-normal">ProwasappAI</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/login" className="hidden text-sm font-medium text-white/85 hover:text-white sm:inline">
              Connexion
            </Link>
            <Link href="/register" className="btn-primary shadow-lg shadow-emerald-950/30">
              Essai gratuit
            </Link>
          </nav>
        </header>

        <div className="relative z-10 mx-auto grid min-h-[calc(92vh-84px)] max-w-7xl items-center gap-10 px-5 pb-20 pt-8 md:grid-cols-[1.05fr_0.95fr] md:px-8">
          <div className="max-w-3xl text-white">
            <p className="mb-5 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-emerald-100 backdrop-blur">
              Pour les entreprises africaines qui vendent déjà sur WhatsApp
            </p>
            <h1 className="max-w-4xl text-5xl font-black leading-[1.02] tracking-normal md:text-7xl">
              Votre meilleur commercial répond sur WhatsApp, même quand vous dormez.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/84 md:text-xl">
              ProwasappAI transforme vos conversations WhatsApp en ventes : réponses rapides,
              qualification, FAQ, notes vocales et transfert humain quand le sujet devient délicat.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className="btn-primary px-6 py-3 text-base">
                Lancer mon assistant IA
              </Link>
              <Link href="/login" className="btn-secondary border-white/25 bg-white/12 px-6 py-3 text-base text-white hover:bg-white/20">
                Voir le tableau de bord
              </Link>
            </div>
            <div className="mt-9 grid max-w-2xl grid-cols-3 gap-3 text-white">
              <Proof value="24/7" label="réponses clients" />
              <Proof value="< 1 min" label="prise en main" />
              <Proof value="FR + vocal" label="conçu terrain" />
            </div>
          </div>

          <div className="relative mx-auto h-[580px] w-full max-w-[520px]">
            <div className="absolute left-2 top-10 hidden rounded-2xl border border-white/15 bg-white/12 p-4 text-white shadow-2xl backdrop-blur md:block animate-float-slow">
              <p className="text-xs uppercase text-emerald-100">Client qualifié</p>
              <p className="mt-1 text-2xl font-bold">+38%</p>
            </div>
            <PhoneMockup />
            <div className="absolute bottom-10 right-0 rounded-2xl border border-white/15 bg-slate-950/70 p-4 text-white shadow-2xl backdrop-blur animate-float">
              <p className="text-xs text-white/70">Handoff humain</p>
              <p className="mt-1 font-semibold">Le vendeur prend le relais</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <div className="grid gap-4 md:grid-cols-4">
          {features.map((feature) => (
            <article key={feature.title} className="card feature-card p-6">
              <div className="mb-5 h-2 w-12 rounded-full bg-emerald-500" />
              <h2 className="text-lg font-bold">{feature.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 md:grid-cols-[0.85fr_1.15fr] md:px-8">
          <div>
            <p className="text-sm font-bold uppercase text-emerald-700">Le problème</p>
            <h2 className="mt-3 text-4xl font-black tracking-normal md:text-5xl">
              Vos clients écrivent vite. Votre équipe ne peut pas toujours suivre.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              En Afrique francophone, WhatsApp est souvent la boutique, le support, le CRM
              et le canal de paiement en même temps. Une réponse tardive peut coûter une vente.
            </p>
            <div className="mt-8 overflow-hidden rounded-lg border border-slate-200 shadow-2xl shadow-slate-900/10">
              <img
                src="/images/african-boutique-owner.png"
                alt="Entrepreneure africaine gérant ses clients WhatsApp depuis sa boutique"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
          <div className="grid gap-4">
            {steps.map(([number, title, text]) => (
              <div key={number} className="group flex gap-5 rounded-lg border border-slate-200 bg-[#fbfcf8] p-5 transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-slate-950 text-lg font-black text-white">
                  {number}
                </span>
                <div>
                  <h3 className="font-bold">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="grid gap-8 md:grid-cols-[1fr_1fr]">
          <div className="rounded-lg bg-slate-950 p-8 text-white md:p-10">
            <p className="text-sm font-bold uppercase text-amber-300">Ce que l'IA sait faire</p>
            <h2 className="mt-3 text-4xl font-black tracking-normal">
              Elle vend avec vos mots, pas avec des réponses génériques.
            </h2>
            <p className="mt-5 text-white/75">
              Prompts par métier, mémoire de conversation, documents importés, quotas,
              tableau de bord et contrôle humain : tout est pensé pour une vraie exploitation.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {useCases.map((item) => (
                <div key={item} className="rounded-lg border border-white/10 bg-white/[0.07] p-4 text-sm">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="grid content-between gap-4">
            <div className="overflow-hidden rounded-lg border border-slate-200 shadow-2xl shadow-slate-900/10">
              <img
                src="/images/african-sales-team.png"
                alt="Équipe commerciale africaine suivant des commandes et conversations clients"
                className="h-full min-h-[260px] w-full object-cover"
              />
            </div>
            <Insight title="Moins de messages perdus" text="Les demandes simples sont traitées immédiatement, même pendant les heures de pointe." />
            <Insight title="Plus de conversations utiles" text="L'IA demande les informations qui comptent : besoin, budget, délai, localisation." />
            <Insight title="Une équipe plus légère" text="Vos agents se concentrent sur les ventes chaudes et les sujets importants." />
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-emerald-700 py-20 text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 md:grid-cols-[0.9fr_1.1fr] md:px-8">
          <div>
            <p className="text-sm font-bold uppercase text-emerald-100">Texte et vocal</p>
            <h2 className="mt-3 text-4xl font-black tracking-normal md:text-5xl">
              Les clients n'ont pas besoin de changer leurs habitudes.
            </h2>
            <p className="mt-5 text-lg leading-8 text-emerald-50">
              Ils écrivent, envoient une note vocale, demandent un prix ou une disponibilité.
              ProwasappAI comprend, répond, puis vous laisse reprendre la main au bon moment.
            </p>
            <div className="mt-8 overflow-hidden rounded-lg border border-white/15 shadow-2xl shadow-emerald-950/30">
              <img
                src="/images/african-voice-support.png"
                alt="Équipe africaine traitant des messages vocaux clients"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
          <div className="rounded-lg border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur">
            <div className="space-y-3">
              <Bubble who="Client" text="Bonjour, vous livrez à Lomé ce soir ?" />
              <Bubble who="IA" text="Oui. Dites-moi le quartier et le produit souhaité, je vérifie la disponibilité." active />
              <Bubble who="Client" text="J'envoie une note vocale avec la commande." />
              <div className="voice-wave">
                <span /><span /><span /><span /><span /><span /><span />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-20 text-center md:px-8">
        <p className="text-sm font-bold uppercase text-emerald-700">Prêt pour les premiers clients</p>
        <h2 className="mt-3 text-4xl font-black tracking-normal md:text-6xl">
          Lancez une expérience WhatsApp plus rapide, plus sérieuse, plus rentable.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
          Créez votre espace, connectez WhatsApp, ajoutez vos documents et laissez l'assistant
          répondre comme un membre formé de votre équipe.
        </p>
        <div className="mt-8 flex justify-center">
          <Link href="/register" className="btn-primary px-8 py-4 text-base shadow-xl shadow-emerald-900/20">
            Créer mon assistant maintenant
          </Link>
        </div>
      </section>
    </main>
  );
}

function Proof({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border border-white/15 bg-white/10 p-4 backdrop-blur">
      <p className="text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs text-white/70">{label}</p>
    </div>
  );
}

function PhoneMockup() {
  return (
    <div className="phone-scene">
      <div className="phone-shell">
        <div className="phone-screen">
          <div className="phone-topbar">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-semibold text-slate-700">ProwasappAI</span>
          </div>
          <div className="space-y-3 p-4">
            <ChatLine side="left" text="Bonjour, le modèle bleu est disponible ?" />
            <ChatLine side="right" text="Oui, disponible. Livraison possible aujourd'hui à Cotonou." />
            <ChatLine side="left" text="Combien avec livraison ?" delay />
            <ChatLine side="right" text="Total 18 500 FCFA. Voulez-vous confirmer la commande ?" delay />
          </div>
          <div className="mx-4 mt-2 rounded-lg bg-emerald-50 p-3">
            <p className="text-xs font-bold text-emerald-800">IA active</p>
            <div className="mt-2 h-2 rounded-full bg-emerald-200">
              <div className="h-2 w-4/5 rounded-full bg-emerald-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatLine({ side, text, delay = false }: { side: "left" | "right"; text: string; delay?: boolean }) {
  return (
    <div className={`chat-line ${side === "right" ? "ml-auto bg-emerald-600 text-white" : "mr-auto bg-white text-slate-700"} ${delay ? "animation-delay" : ""}`}>
      {text}
    </div>
  );
}

function Insight({ title, text }: { title: string; text: string }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="mt-2 leading-7 text-slate-600">{text}</p>
    </article>
  );
}

function Bubble({ who, text, active = false }: { who: string; text: string; active?: boolean }) {
  return (
    <div className={`rounded-lg p-4 ${active ? "bg-white text-slate-950" : "bg-white/10 text-white"}`}>
      <p className="text-xs font-bold uppercase opacity-70">{who}</p>
      <p className="mt-1">{text}</p>
    </div>
  );
}
