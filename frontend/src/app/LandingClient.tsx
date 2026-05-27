"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  motion,
  useInView,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  animate,
  type Variants,
} from "framer-motion";

// ─── Top scroll progress bar ────────────────────────────────────────────────
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const w = useSpring(scrollYProgress, { stiffness: 120, damping: 22 });
  return (
    <motion.div
      style={{ scaleX: w }}
      className="fixed left-0 right-0 top-0 z-[60] h-[3px] origin-left bg-gradient-to-r from-emerald-400 via-emerald-500 to-amber-400"
    />
  );
}

// ─── Reveal wrapper: fade + slide-up when entering the viewport ─────────────
function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Counter that animates from 0 to target when in view ────────────────────
function Counter({
  to,
  suffix = "",
  prefix = "",
  duration = 1.2,
}: {
  to: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v).toString());
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, to, { duration, ease: "easeOut" });
    const unsub = rounded.on("change", setDisplay);
    return () => {
      controls.stop();
      unsub();
    };
  }, [inView, mv, rounded, to, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

// ─── Animated phone chat (loops a realistic conversation) ───────────────────
type ChatItem =
  | { side: "left" | "right"; text: string; delay: number }
  | { side: "typing"; delay: number; who: "left" | "right" };

const CHAT_SCRIPT: ChatItem[] = [
  { side: "typing", who: "left", delay: 0.6 },
  { side: "left", text: "Bonjour, le modèle bleu est disponible ?", delay: 1.4 },
  { side: "typing", who: "right", delay: 2.3 },
  {
    side: "right",
    text: "Oui, disponible. Livraison possible aujourd'hui à Cotonou.",
    delay: 3.3,
  },
  { side: "typing", who: "left", delay: 4.2 },
  { side: "left", text: "Combien avec livraison ?", delay: 5.0 },
  { side: "typing", who: "right", delay: 5.9 },
  {
    side: "right",
    text: "Total 18 500 FCFA. Voulez-vous confirmer la commande ?",
    delay: 7.0,
  },
];

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block h-1.5 w-1.5 rounded-full bg-slate-400"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

function AnimatedPhone() {
  const [tick, setTick] = useState(0);
  // Loop the whole chat sequence every ~10s.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="phone-area">
      <motion.div
        className="floating float-a hide-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: [0, -10, 0] }}
        transition={{
          opacity: { duration: 0.6, delay: 0.4 },
          y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
        }}
      >
        <small>Client qualifié</small>
        <strong style={{ display: "block", fontSize: 30 }}>
          +<Counter to={38} suffix="%" duration={1.5} />
        </strong>
      </motion.div>

      <motion.div
        className="phone"
        initial={{ opacity: 0, scale: 0.92, rotateY: -25 }}
        animate={{ opacity: 1, scale: 1, rotateY: -16 }}
        transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="screen">
          <div className="topbar">
            <span className="dot" />
            <strong>ProwasappAI</strong>
          </div>

          <div className="chats" key={tick}>
            {CHAT_SCRIPT.map((item, i) => {
              if (item.side === "typing") {
                return (
                  <motion.div
                    key={`t-${i}`}
                    className={`chat ${item.who}`}
                    style={{ padding: "8px 12px" }}
                    initial={{ opacity: 0, y: 6, scale: 0.95 }}
                    animate={{ opacity: [0, 1, 1, 0], y: 0, scale: 1 }}
                    transition={{
                      delay: item.delay,
                      duration: 0.9,
                      times: [0, 0.2, 0.7, 1],
                    }}
                  >
                    <TypingDots />
                  </motion.div>
                );
              }
              return (
                <motion.div
                  key={`m-${i}`}
                  className={`chat ${item.side}`}
                  initial={{ opacity: 0, y: 10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    delay: item.delay,
                    duration: 0.4,
                    ease: "easeOut",
                  }}
                >
                  {item.text}
                </motion.div>
              );
            })}
          </div>

          <div className="ai-card">
            <strong>IA active</strong>
            <div className="bar">
              <motion.i
                style={{ display: "block", height: "100%" }}
                initial={{ width: "20%" }}
                animate={{ width: ["20%", "92%", "20%"] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="floating float-b"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: [0, -8, 0] }}
        transition={{
          opacity: { duration: 0.6, delay: 0.6 },
          y: { duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.3 },
        }}
      >
        <small>Handoff humain</small>
        <strong style={{ display: "block" }}>
          Le vendeur prend le relais
        </strong>
      </motion.div>
    </div>
  );
}

// ─── How it works — animated 4-step workflow ────────────────────────────────
const STEPS = [
  {
    icon: "📱",
    title: "Client écrit sur WhatsApp",
    desc: "Texte ou note vocale — le client utilise WhatsApp comme d'habitude.",
    color: "from-emerald-400 to-emerald-600",
  },
  {
    icon: "🧠",
    title: "L'IA comprend et cherche",
    desc: "Elle lit le message, écoute le vocal, et fouille votre base de connaissances.",
    color: "from-sky-400 to-indigo-600",
  },
  {
    icon: "✨",
    title: "Réponse personnalisée",
    desc: "L'IA envoie une réponse claire, en langue locale, avec vos vraies infos.",
    color: "from-amber-400 to-orange-600",
  },
  {
    icon: "🤝",
    title: "Vous prenez le relais",
    desc: "Quand c'est délicat, l'IA passe la main et alerte votre équipe.",
    color: "from-fuchsia-500 to-rose-600",
  },
];

function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} style={{ background: "#f8faf7", padding: "100px 0" }}>
      <div className="wrap">
        <Reveal>
          <p className="kicker" style={{ textAlign: "center" }}>
            Comment ça marche
          </p>
          <h2 className="title" style={{ textAlign: "center", margin: "12px auto 18px" }}>
            De la question du client à la vente confirmée, en 4 étapes.
          </h2>
          <p className="muted" style={{ textAlign: "center", maxWidth: 640, margin: "0 auto" }}>
            Aucune installation. Vous connectez WhatsApp, vous chargez vos infos,
            et l'IA travaille pour vous.
          </p>
        </Reveal>

        <div
          style={{
            position: "relative",
            marginTop: 64,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 28,
          }}
        >
          {/* Connecting line that draws itself */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={inView ? { scaleX: 1 } : {}}
            transition={{ duration: 1.4, delay: 0.4, ease: "easeOut" }}
            style={{
              position: "absolute",
              top: 32,
              left: "8%",
              right: "8%",
              height: 2,
              background:
                "linear-gradient(90deg, #34d399, #60a5fa, #f59e0b, #f43f5e)",
              transformOrigin: "left",
              borderRadius: 999,
              zIndex: 0,
              opacity: 0.4,
            }}
            className="hide-sm-step-line"
          />

          {STEPS.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.6,
                delay: 0.3 + i * 0.18,
                ease: [0.22, 1, 0.36, 1],
              }}
              whileHover={{ y: -6, transition: { duration: 0.25 } }}
              style={{ position: "relative", zIndex: 1, textAlign: "center" }}
            >
              <div
                className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br ${s.color} text-3xl shadow-lg`}
                style={{ boxShadow: "0 18px 35px rgba(0,0,0,.12)" }}
              >
                {s.icon}
              </div>
              <p
                style={{
                  marginTop: 12,
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                  color: "#64748b",
                }}
              >
                Étape {i + 1}
              </p>
              <h3
                style={{
                  marginTop: 4,
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#0f172a",
                }}
              >
                {s.title}
              </h3>
              <p
                style={{
                  marginTop: 8,
                  fontSize: 14,
                  color: "#64748b",
                  lineHeight: 1.55,
                }}
              >
                {s.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Voice section — animated wave synced to a fake live transcription ─────
function VoiceShowcase() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  return (
    <section className="voice" ref={ref}>
      <div className="wrap grid2">
        <Reveal>
          <p className="kicker" style={{ color: "#d1fae5" }}>
            Texte et vocal
          </p>
          <h2 className="title">
            Les clients n&apos;ont pas besoin de changer leurs habitudes.
          </h2>
          <p style={{ lineHeight: 1.7, color: "#ecfdf5" }}>
            Ils écrivent, envoient une note vocale, demandent un prix ou une
            disponibilité. ProwasappAI comprend, répond, puis vous laisse
            reprendre la main au bon moment.
          </p>
          <div
            style={{
              marginTop: 28,
              overflow: "hidden",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,.18)",
              boxShadow: "0 28px 70px rgba(2,44,34,.35)",
            }}
          >
            <img
              src="/images/african-voice-support.png"
              alt="Équipe africaine traitant des messages vocaux clients"
              style={{
                display: "block",
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>
        </Reveal>

        <div className="steps">
          {[
            { who: "CLIENT", text: "Bonjour, vous livrez à Lomé ce soir ?", active: false, delay: 0.1 },
            {
              who: "IA",
              text: "Oui. Dites-moi le quartier et le produit souhaité, je vérifie la disponibilité.",
              active: true,
              delay: 0.35,
            },
            { who: "CLIENT", text: "J'envoie une note vocale avec la commande.", active: false, delay: 0.6 },
          ].map((b, i) => (
            <motion.div
              key={i}
              className={b.active ? "bubble active" : "bubble"}
              initial={{ opacity: 0, x: -20 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: b.delay, ease: "easeOut" }}
            >
              <small>{b.who}</small>
              <p>{b.text}</p>
            </motion.div>
          ))}
          <motion.div
            className="wave"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.9, duration: 0.5 }}
          >
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <span key={i} />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── Feature cards (cards section with stagger reveal) ──────────────────────
const FEATURES = [
  {
    title: "Réponses instantanées",
    desc: "Chaque message WhatsApp reçoit une réponse claire, contextualisée et alignée avec votre façon de vendre.",
  },
  {
    title: "IA formée sur vos documents",
    desc: "Importez tarifs, FAQ, catalogues ou procédures. L'assistant répond avec vos vraies informations.",
  },
  {
    title: "Notes vocales comprises",
    desc: "Les clients envoient des audios. L'IA transcrit, comprend et peut répondre en texte ou en vocal.",
  },
  {
    title: "Reprise humaine",
    desc: "Quand la conversation devient sensible, l'IA passe la main à votre équipe sans perdre le contexte.",
  },
];

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
};

function Features() {
  return (
    <section>
      <motion.div
        className="wrap cards"
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
      >
        {FEATURES.map((f) => (
          <motion.div
            key={f.title}
            className="card"
            variants={fadeUp}
            whileHover={{ y: -8, transition: { duration: 0.25 } }}
          >
            <div className="line" />
            <h2>{f.title}</h2>
            <p>{f.desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

// ─── Main exported landing ──────────────────────────────────────────────────
export default function LandingClient() {
  return (
    <div className="landing">
      <ScrollProgress />
      <main>
        <section className="hero">
          <img
            className="bg"
            src="/images/african-business-hero.png"
            alt="Entrepreneurs africains utilisant WhatsApp pour servir leurs clients"
          />
          <div className="shade" />
          <div className="fade" />
          <div className="wrap">
            <header>
              <Link className="brand" href="/">
                <span className="mark">P</span>
                <span>ProwasappAI</span>
              </Link>
              <nav className="nav">
                <Link href="/login">Connexion</Link>
                <Link className="btn btn-primary" href="/register">
                  Essai gratuit
                </Link>
              </nav>
            </header>
            <div className="hero-grid">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="eyebrow">
                  Pour les entreprises africaines qui vendent déjà sur WhatsApp
                </span>
                <motion.h1
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.12 }}
                >
                  Votre meilleur commercial répond sur WhatsApp, même quand vous
                  dormez.
                </motion.h1>
                <motion.p
                  className="lead"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.22 }}
                >
                  ProwasappAI transforme vos conversations WhatsApp en ventes :
                  réponses rapides, qualification, FAQ, notes vocales et
                  transfert humain quand le sujet devient délicat.
                </motion.p>
                <motion.div
                  className="actions"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.32 }}
                >
                  <Link className="btn btn-primary" href="/register">
                    Lancer mon assistant IA
                  </Link>
                  <Link className="btn btn-secondary" href="/login">
                    Voir le tableau de bord
                  </Link>
                </motion.div>
                <motion.div
                  className="proofs"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.45 }}
                >
                  <div className="proof">
                    <strong>
                      <Counter to={24} duration={1.4} />
                      /7
                    </strong>
                    <span>réponses clients</span>
                  </div>
                  <div className="proof">
                    <strong>
                      &lt; <Counter to={1} duration={1} suffix=" min" />
                    </strong>
                    <span>prise en main</span>
                  </div>
                  <div className="proof">
                    <strong>FR + vocal</strong>
                    <span>conçu terrain</span>
                  </div>
                </motion.div>
              </motion.div>
              <AnimatedPhone />
            </div>
          </div>
        </section>

        <Features />

        <section style={{ background: "white" }}>
          <div className="wrap split">
            <Reveal>
              <p className="kicker">Le problème</p>
              <h2 className="title">
                Vos clients écrivent vite. Votre équipe ne peut pas toujours
                suivre.
              </h2>
              <p className="muted">
                En Afrique francophone, WhatsApp est souvent la boutique, le
                support, le CRM et le canal de paiement en même temps. Une
                réponse tardive peut coûter une vente.
              </p>
              <div
                style={{
                  marginTop: 28,
                  overflow: "hidden",
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 28px 70px rgba(15,23,42,.12)",
                }}
              >
                <img
                  src="/images/african-boutique-owner.png"
                  alt="Entrepreneure africaine gérant ses clients WhatsApp depuis sa boutique"
                  style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </div>
            </Reveal>
            <motion.div
              className="steps"
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
            >
              {[
                {
                  n: 1,
                  t: "Connectez WhatsApp",
                  d: "Scannez un QR code et reliez votre numéro principal ou vos numéros d'équipe.",
                },
                {
                  n: 2,
                  t: "Ajoutez vos connaissances",
                  d: "Chargez vos PDF, prix, conditions, FAQ et réponses fréquentes.",
                },
                {
                  n: 3,
                  t: "Laissez l'IA qualifier",
                  d: "Elle répond, collecte les infos utiles et vous alerte quand un humain doit intervenir.",
                },
              ].map((step) => (
                <motion.div key={step.n} className="step" variants={fadeUp}>
                  <span className="num">{step.n}</span>
                  <div>
                    <h3>{step.t}</h3>
                    <p className="muted">{step.d}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        <HowItWorks />

        <section>
          <div className="wrap grid2">
            <Reveal>
              <div className="dark" style={{ borderRadius: 12, padding: 36 }}>
                <p className="kicker" style={{ color: "#facc15" }}>
                  Ce que l&apos;IA sait faire
                </p>
                <h2 className="title">
                  Elle vend avec vos mots, pas avec des réponses génériques.
                </h2>
                <p style={{ color: "rgba(255,255,255,.74)", lineHeight: 1.7 }}>
                  Prompts par métier, mémoire de conversation, documents
                  importés, quotas, tableau de bord et contrôle humain : tout
                  est pensé pour une vraie exploitation.
                </p>
                <motion.div
                  className="grid2"
                  style={{ marginTop: 24 }}
                  variants={stagger}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                >
                  {["Boutiques et e-commerce", "Agences immobilières", "Services et rendez-vous", "Écoles et formations"].map((c) => (
                    <motion.div key={c} className="cardish" variants={fadeUp}>
                      {c}
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </Reveal>
            <motion.div
              className="steps"
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
            >
              <motion.div
                variants={fadeUp}
                style={{
                  overflow: "hidden",
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 28px 70px rgba(15,23,42,.12)",
                }}
              >
                <img
                  src="/images/african-sales-team.png"
                  alt="Équipe commerciale africaine suivant des commandes et conversations clients"
                  style={{
                    display: "block",
                    width: "100%",
                    minHeight: 260,
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </motion.div>
              {[
                {
                  t: "Moins de messages perdus",
                  d: "Les demandes simples sont traitées immédiatement, même pendant les heures de pointe.",
                },
                {
                  t: "Plus de conversations utiles",
                  d: "L'IA demande les informations qui comptent : besoin, budget, délai, localisation.",
                },
                {
                  t: "Une équipe plus légère",
                  d: "Vos agents se concentrent sur les ventes chaudes et les sujets importants.",
                },
              ].map((c) => (
                <motion.div
                  key={c.t}
                  className="card"
                  variants={fadeUp}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                >
                  <h3>{c.t}</h3>
                  <p>{c.d}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        <VoiceShowcase />

        <Pricing />

        <section className="cta">
          <motion.div
            className="wrap center"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
          >
            <p className="mini">Prêt pour les premiers clients</p>
            <h2 className="title">
              Lancez une expérience WhatsApp plus rapide, plus sérieuse, plus
              rentable.
            </h2>
            <p className="muted">
              Créez votre espace, connectez WhatsApp, ajoutez vos documents et
              laissez l&apos;assistant répondre comme un membre formé de votre
              équipe.
            </p>
            <motion.p
              style={{ marginTop: 30 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link className="btn btn-primary" href="/register">
                Créer mon assistant maintenant
              </Link>
            </motion.p>
          </motion.div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

// ─── Pricing — three plans with stagger + featured highlight ────────────────
const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "Gratuit",
    period: "7 jours d'essai",
    desc: "Pour tester ProwasappAI sans engagement.",
    cta: "Commencer gratuitement",
    features: [
      "1 000 réponses IA par mois",
      "1 numéro WhatsApp connecté",
      "Base de connaissances illimitée",
      "Notes vocales comprises",
      "Tableau de bord et statistiques",
    ],
    accent: "from-slate-500 to-slate-700",
    featured: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "15 000",
    period: "FCFA / mois",
    desc: "Pour les commerces qui ont déjà des clients sur WhatsApp.",
    cta: "Choisir Pro",
    features: [
      "10 000 réponses IA par mois",
      "Jusqu'à 3 numéros WhatsApp",
      "Réponses vocales (TTS)",
      "Reprise humaine illimitée",
      "Support prioritaire WhatsApp",
    ],
    accent: "from-emerald-500 to-emerald-700",
    featured: true,
  },
  {
    id: "business",
    name: "Business",
    price: "50 000",
    period: "FCFA / mois",
    desc: "Pour les équipes et boutiques à fort volume.",
    cta: "Choisir Business",
    features: [
      "50 000 réponses IA par mois",
      "Numéros WhatsApp illimités",
      "API d'intégration",
      "Onboarding personnalisé",
      "Support dédié + SLA",
    ],
    accent: "from-amber-500 to-orange-600",
    featured: false,
  },
] as const;

function Pricing() {
  return (
    <section id="tarifs" style={{ background: "white", padding: "100px 0" }}>
      <div className="wrap">
        <Reveal>
          <p className="kicker" style={{ textAlign: "center" }}>
            Tarifs
          </p>
          <h2 className="title" style={{ textAlign: "center", margin: "12px auto 12px" }}>
            Un prix juste, pas de surprise.
          </h2>
          <p
            className="muted"
            style={{ textAlign: "center", maxWidth: 600, margin: "0 auto" }}
          >
            Mobile Money accepté (Flooz, T-Money, Orange Money, MTN MoMo). Annulez
            à tout moment depuis votre tableau de bord.
          </p>
        </Reveal>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          style={{
            marginTop: 56,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 22,
            alignItems: "stretch",
          }}
        >
          {PLANS.map((p) => (
            <motion.div
              key={p.id}
              variants={fadeUp}
              whileHover={{ y: -8, transition: { duration: 0.25 } }}
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                background: "white",
                borderRadius: 16,
                padding: "32px 26px",
                border: p.featured ? "2px solid #16a34a" : "1px solid #e2e8f0",
                boxShadow: p.featured
                  ? "0 30px 80px rgba(22,163,74,.18)"
                  : "0 8px 28px rgba(15,23,42,.05)",
                transform: p.featured ? "scale(1.02)" : undefined,
              }}
            >
              {p.featured && (
                <span
                  style={{
                    position: "absolute",
                    top: -12,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background:
                      "linear-gradient(90deg, #16a34a, #15803d)",
                    color: "white",
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                    padding: "5px 12px",
                    borderRadius: 999,
                    boxShadow: "0 10px 25px rgba(22,163,74,.35)",
                  }}
                >
                  Le plus choisi
                </span>
              )}

              <div
                className={`h-1.5 w-12 rounded-full bg-gradient-to-r ${p.accent}`}
                style={{ marginBottom: 18 }}
              />
              <h3 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a" }}>
                {p.name}
              </h3>
              <p
                style={{
                  marginTop: 4,
                  fontSize: 14,
                  color: "#64748b",
                  lineHeight: 1.5,
                }}
              >
                {p.desc}
              </p>

              <div style={{ marginTop: 18, display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 36, fontWeight: 800, color: "#0f172a" }}>
                  {p.price}
                </span>
                <span style={{ fontSize: 13, color: "#64748b" }}>{p.period}</span>
              </div>

              <ul
                style={{
                  marginTop: 22,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  flex: 1,
                  listStyle: "none",
                  padding: 0,
                }}
              >
                {p.features.map((f) => (
                  <li
                    key={f}
                    style={{
                      display: "flex",
                      gap: 10,
                      fontSize: 14,
                      color: "#334155",
                      lineHeight: 1.45,
                    }}
                  >
                    <span
                      style={{
                        flex: "0 0 18px",
                        height: 18,
                        borderRadius: 999,
                        background: p.featured ? "#dcfce7" : "#f1f5f9",
                        color: p.featured ? "#15803d" : "#475569",
                        display: "grid",
                        placeItems: "center",
                        fontSize: 11,
                        fontWeight: 800,
                        marginTop: 1,
                      }}
                    >
                      ✓
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/register"
                className={p.featured ? "btn btn-primary" : "btn btn-secondary"}
                style={{
                  marginTop: 26,
                  display: "inline-flex",
                  justifyContent: "center",
                  ...(p.featured
                    ? {}
                    : {
                        border: "1px solid #cbd5e1",
                        background: "white",
                        color: "#0f172a",
                      }),
                }}
              >
                {p.cta}
              </Link>
            </motion.div>
          ))}
        </motion.div>

        <p
          style={{
            marginTop: 32,
            textAlign: "center",
            fontSize: 13,
            color: "#64748b",
          }}
        >
          Vous avez plus de 50 000 messages par mois ?{" "}
          <Link href="/register" style={{ color: "#15803d", fontWeight: 600 }}>
            Parlons d&apos;une offre sur mesure →
          </Link>
        </p>
      </div>
    </section>
  );
}

// ─── Footer ─────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer
      style={{
        background: "#07140f",
        color: "rgba(255,255,255,.78)",
        padding: "56px 0 28px",
      }}
    >
      <div className="wrap">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 32,
          }}
        >
          <div style={{ maxWidth: 260 }}>
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                color: "white",
                fontWeight: 900,
                fontSize: 18,
              }}
            >
              <span
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "#34d399",
                  color: "#062016",
                }}
              >
                P
              </span>
              ProwasappAI
            </Link>
            <p style={{ marginTop: 14, fontSize: 13, lineHeight: 1.6 }}>
              L&apos;assistant WhatsApp pensé pour les entreprises africaines.
              Texte, vocal, reprise humaine — tout en une seule plateforme.
            </p>
          </div>

          <FooterCol
            title="Produit"
            links={[
              { label: "Fonctionnalités", href: "#" },
              { label: "Comment ça marche", href: "#" },
              { label: "Tarifs", href: "#tarifs" },
              { label: "Se connecter", href: "/login" },
            ]}
          />
          <FooterCol
            title="Entreprise"
            links={[
              { label: "À propos", href: "#" },
              { label: "Contact", href: "mailto:hello@prowasappai.com" },
              { label: "Conditions d'utilisation", href: "#" },
              { label: "Confidentialité", href: "#" },
            ]}
          />
          <FooterCol
            title="Support"
            links={[
              { label: "Centre d'aide", href: "#" },
              { label: "WhatsApp support", href: "https://wa.me/22890000000" },
              { label: "Statut", href: "#" },
            ]}
          />
        </div>

        <div
          style={{
            marginTop: 40,
            paddingTop: 24,
            borderTop: "1px solid rgba(255,255,255,.1)",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 12,
            fontSize: 12,
            color: "rgba(255,255,255,.5)",
          }}
        >
          <span>
            © {new Date().getFullYear()} ProwasappAI · Pensé en Afrique, pour
            l&apos;Afrique 🌍
          </span>
          <span>
            Mobile Money : Flooz · T-Money · Orange Money · MTN MoMo
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <p
        style={{
          color: "white",
          fontSize: 13,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: ".08em",
          marginBottom: 14,
        }}
      >
        {title}
      </p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 9 }}>
        {links.map((l) => (
          <li key={l.label}>
            <Link
              href={l.href}
              style={{ fontSize: 13, color: "rgba(255,255,255,.72)" }}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
