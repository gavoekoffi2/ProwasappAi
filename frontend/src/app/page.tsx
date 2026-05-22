import Link from "next/link";
import "./landing.css";

export const metadata = {
  title: "ProwasappAI - Assistant IA WhatsApp pour entreprises africaines",
  description:
    "Automatisez vos conversations WhatsApp avec une IA formée sur vos documents, vos prix et votre façon de vendre.",
};

export default function HomePage() {
  return (
    <div className="landing">
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
              <div>
                <span className="eyebrow">
                  Pour les entreprises africaines qui vendent déjà sur WhatsApp
                </span>
                <h1>
                  Votre meilleur commercial répond sur WhatsApp, même quand vous
                  dormez.
                </h1>
                <p className="lead">
                  ProwasappAI transforme vos conversations WhatsApp en ventes :
                  réponses rapides, qualification, FAQ, notes vocales et
                  transfert humain quand le sujet devient délicat.
                </p>
                <div className="actions">
                  <Link className="btn btn-primary" href="/register">
                    Lancer mon assistant IA
                  </Link>
                  <Link className="btn btn-secondary" href="/login">
                    Voir le tableau de bord
                  </Link>
                </div>
                <div className="proofs">
                  <div className="proof">
                    <strong>24/7</strong>
                    <span>réponses clients</span>
                  </div>
                  <div className="proof">
                    <strong>&lt; 1 min</strong>
                    <span>prise en main</span>
                  </div>
                  <div className="proof">
                    <strong>FR + vocal</strong>
                    <span>conçu terrain</span>
                  </div>
                </div>
              </div>
              <div className="phone-area">
                <div className="floating float-a hide-sm">
                  <small>Client qualifié</small>
                  <strong style={{ display: "block", fontSize: 30 }}>+38%</strong>
                </div>
                <div className="phone">
                  <div className="screen">
                    <div className="topbar">
                      <span className="dot" />
                      <strong>ProwasappAI</strong>
                    </div>
                    <div className="chats">
                      <div className="chat left">
                        Bonjour, le modèle bleu est disponible ?
                      </div>
                      <div className="chat right">
                        Oui, disponible. Livraison possible aujourd&apos;hui à
                        Cotonou.
                      </div>
                      <div className="chat left">Combien avec livraison ?</div>
                      <div className="chat right">
                        Total 18 500 FCFA. Voulez-vous confirmer la commande ?
                      </div>
                    </div>
                    <div className="ai-card">
                      <strong>IA active</strong>
                      <div className="bar">
                        <i />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="floating float-b">
                  <small>Handoff humain</small>
                  <strong style={{ display: "block" }}>
                    Le vendeur prend le relais
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="wrap cards">
            <div className="card">
              <div className="line" />
              <h2>Réponses instantanées</h2>
              <p>
                Chaque message WhatsApp reçoit une réponse claire,
                contextualisée et alignée avec votre façon de vendre.
              </p>
            </div>
            <div className="card">
              <div className="line" />
              <h2>IA formée sur vos documents</h2>
              <p>
                Importez tarifs, FAQ, catalogues ou procédures. L&apos;assistant
                répond avec vos vraies informations.
              </p>
            </div>
            <div className="card">
              <div className="line" />
              <h2>Notes vocales comprises</h2>
              <p>
                Les clients envoient des audios. L&apos;IA transcrit, comprend
                et peut répondre en texte ou en vocal.
              </p>
            </div>
            <div className="card">
              <div className="line" />
              <h2>Reprise humaine</h2>
              <p>
                Quand la conversation devient sensible, l&apos;IA passe la main
                à votre équipe sans perdre le contexte.
              </p>
            </div>
          </div>
        </section>

        <section style={{ background: "white" }}>
          <div className="wrap split">
            <div>
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
            </div>
            <div className="steps">
              <div className="step">
                <span className="num">1</span>
                <div>
                  <h3>Connectez WhatsApp</h3>
                  <p className="muted">
                    Scannez un QR code et reliez votre numéro principal ou vos
                    numéros d&apos;équipe.
                  </p>
                </div>
              </div>
              <div className="step">
                <span className="num">2</span>
                <div>
                  <h3>Ajoutez vos connaissances</h3>
                  <p className="muted">
                    Chargez vos PDF, prix, conditions, FAQ et réponses
                    fréquentes.
                  </p>
                </div>
              </div>
              <div className="step">
                <span className="num">3</span>
                <div>
                  <h3>Laissez l&apos;IA qualifier</h3>
                  <p className="muted">
                    Elle répond, collecte les infos utiles et vous alerte quand
                    un humain doit intervenir.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="wrap grid2">
            <div className="dark" style={{ borderRadius: 12, padding: 36 }}>
              <p className="kicker" style={{ color: "#facc15" }}>
                Ce que l&apos;IA sait faire
              </p>
              <h2 className="title">
                Elle vend avec vos mots, pas avec des réponses génériques.
              </h2>
              <p style={{ color: "rgba(255,255,255,.74)", lineHeight: 1.7 }}>
                Prompts par métier, mémoire de conversation, documents importés,
                quotas, tableau de bord et contrôle humain : tout est pensé pour
                une vraie exploitation.
              </p>
              <div className="grid2" style={{ marginTop: 24 }}>
                <div className="cardish">Boutiques et e-commerce</div>
                <div className="cardish">Agences immobilières</div>
                <div className="cardish">Services et rendez-vous</div>
                <div className="cardish">Écoles et formations</div>
              </div>
            </div>
            <div className="steps">
              <div
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
              </div>
              <div className="card">
                <h3>Moins de messages perdus</h3>
                <p>
                  Les demandes simples sont traitées immédiatement, même
                  pendant les heures de pointe.
                </p>
              </div>
              <div className="card">
                <h3>Plus de conversations utiles</h3>
                <p>
                  L&apos;IA demande les informations qui comptent : besoin,
                  budget, délai, localisation.
                </p>
              </div>
              <div className="card">
                <h3>Une équipe plus légère</h3>
                <p>
                  Vos agents se concentrent sur les ventes chaudes et les sujets
                  importants.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="voice">
          <div className="wrap grid2">
            <div>
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
            </div>
            <div className="steps">
              <div className="bubble">
                <small>CLIENT</small>
                <p>Bonjour, vous livrez à Lomé ce soir ?</p>
              </div>
              <div className="bubble active">
                <small>IA</small>
                <p>
                  Oui. Dites-moi le quartier et le produit souhaité, je vérifie
                  la disponibilité.
                </p>
              </div>
              <div className="bubble">
                <small>CLIENT</small>
                <p>J&apos;envoie une note vocale avec la commande.</p>
              </div>
              <div className="wave">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        </section>

        <section className="cta">
          <div className="wrap center">
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
            <p style={{ marginTop: 30 }}>
              <Link className="btn btn-primary" href="/register">
                Créer mon assistant maintenant
              </Link>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
