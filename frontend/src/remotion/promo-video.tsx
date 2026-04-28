import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const scenes = [
  { from: 0, duration: 165 },
  { from: 165, duration: 180 },
  { from: 345, duration: 195 },
  { from: 540, duration: 195 },
  { from: 735, duration: 195 },
  { from: 930, duration: 210 },
  { from: 1140, duration: 210 },
];

export const PromoVideo = () => {
  return (
    <AbsoluteFill className="promo">
      <Audio src={staticFile("/audio/prowasappai-background.wav")} volume={0.16} />
      <Audio src={staticFile("/audio/prowasappai-voiceover.mp3")} volume={1} startFrom={0} />
      <AnimatedBackdrop />
      <Sequence from={scenes[0].from} durationInFrames={scenes[0].duration}>
        <HeroScene />
      </Sequence>
      <Sequence from={scenes[1].from} durationInFrames={scenes[1].duration}>
        <ProblemScene />
      </Sequence>
      <Sequence from={scenes[2].from} durationInFrames={scenes[2].duration}>
        <AiReplyScene />
      </Sequence>
      <Sequence from={scenes[3].from} durationInFrames={scenes[3].duration}>
        <KnowledgeScene />
      </Sequence>
      <Sequence from={scenes[4].from} durationInFrames={scenes[4].duration}>
        <DashboardScene />
      </Sequence>
      <Sequence from={scenes[5].from} durationInFrames={scenes[5].duration}>
        <HumanScene />
      </Sequence>
      <Sequence from={scenes[6].from} durationInFrames={scenes[6].duration}>
        <FinalScene />
      </Sequence>
    </AbsoluteFill>
  );
};

function AnimatedBackdrop() {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 38) * 24;
  const driftSlow = Math.cos(frame / 54) * 30;

  return (
    <AbsoluteFill className="backdrop">
      <div className="grid-glow" />
      <div className="orb orb-a" style={{ transform: `translate(${drift}px, ${driftSlow}px)` }} />
      <div className="orb orb-b" style={{ transform: `translate(${-driftSlow}px, ${drift}px)` }} />
      <div className="scan" />
    </AbsoluteFill>
  );
}

function HeroScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 90 } });
  const phone = spring({ frame: frame - 28, fps, config: { damping: 16, stiffness: 70 } });

  return (
    <Scene>
      <div className="brand-row" style={fadeUp(enter, 0)}>
        <div className="brand-mark">P</div>
        <div>
          <p className="eyebrow">ProwasappAI</p>
          <p className="micro">WhatsApp + IA pour entreprises ambitieuses</p>
        </div>
      </div>
      <h1 className="headline" style={fadeUp(enter, 28)}>
        Transformez chaque message WhatsApp en opportunité commerciale.
      </h1>
      <p className="subline" style={fadeUp(enter, 54)}>
        Réponses instantanées, base de connaissances, supervision humaine et dashboard premium.
      </p>
      <div className="hero-media">
        <Portrait src="/images/african-business-hero.png" label="Équipe commerciale connectée" delay={18} />
        <div style={{ transform: `scale(${0.72 + phone * 0.28})`, opacity: phone }} className="phone-stage">
          <PhoneMockup />
        </div>
      </div>
    </Scene>
  );
}

function ProblemScene() {
  return (
    <Scene>
      <SceneTitle kicker="Le problème" title="Vos clients écrivent. Votre équipe court." />
      <div className="problem-stack">
        <PainPoint label="Messages oubliés après les heures de bureau" index={0} />
        <PainPoint label="Questions répétitives qui bloquent les ventes" index={1} />
        <PainPoint label="Prospects chauds perdus faute de réponse rapide" index={2} />
      </div>
      <Portrait src="/images/african-boutique-owner.png" label="Commerce local, demandes clients en continu" delay={22} compact />
    </Scene>
  );
}

function AiReplyScene() {
  return (
    <Scene>
      <SceneTitle kicker="La réponse" title="Une IA qui répond comme votre meilleur conseiller." />
      <div className="split-showcase">
        <PhoneMockup large />
        <div className="feature-list">
          <FeatureLine title="Comprend la demande" text="Prix, disponibilité, rendez-vous, support." delay={16} />
          <FeatureLine title="Répond en quelques secondes" text="Texte clair, ton professionnel, prochaine étape." delay={34} />
          <FeatureLine title="Passe la main si besoin" text="L'humain garde le controle des conversations sensibles." delay={52} />
        </div>
      </div>
    </Scene>
  );
}

function KnowledgeScene() {
  return (
    <Scene>
      <SceneTitle kicker="Votre savoir" title="L'IA apprend vos offres, vos tarifs et vos FAQ." />
      <div className="knowledge-board">
        <DocCard title="Catalogue produits.pdf" status="Analyse" delay={8} />
        <DocCard title="Tarifs & promotions.md" status="Prêt" delay={26} />
        <DocCard title="FAQ livraison.txt" status="Prêt" delay={44} />
      </div>
      <div className="answer-card">
        <p className="micro">Réponse générée</p>
        <p>
          Oui, la livraison est disponible aujourd'hui. Je peux réserver votre commande et vous envoyer les détails.
        </p>
      </div>
    </Scene>
  );
}

function DashboardScene() {
  return (
    <Scene>
      <SceneTitle kicker="Pilotage" title="Un dashboard premium pour suivre toute l'activité." />
      <div className="dashboard-card">
        <div className="dash-top">
          <span>Centre de pilotage live</span>
          <strong>Online</strong>
        </div>
        <div className="metrics">
          <Metric value="1 248" label="messages entrants" delay={5} />
          <Metric value="932" label="réponses IA" delay={20} />
          <Metric value="4/4" label="plateforme prête" delay={35} />
        </div>
        <div className="usage-track">
          <div className="usage-fill" />
        </div>
      </div>
      <Portrait src="/images/african-sales-team.png" label="Équipe de vente, supervision en temps réel" delay={34} compact />
    </Scene>
  );
}

function HumanScene() {
  return (
    <Scene>
      <SceneTitle kicker="Client d'abord" title="Texte, vocal, suivi humain : l'expérience reste naturelle." />
      <div className="voice-panel">
        <Portrait src="/images/african-voice-support.png" label="Support client vocal" delay={4} compact />
        <div className="wave-box">
          <div className="wave-title">Note vocale IA</div>
          <div className="wave">
            {Array.from({ length: 18 }).map((_, index) => (
              <span key={index} style={{ animationDelay: `${index * 70}ms` }} />
            ))}
          </div>
          <p>Des réponses rapides, humaines et utiles sur le canal que vos clients utilisent déjà.</p>
        </div>
      </div>
    </Scene>
  );
}

function FinalScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - 25, fps, config: { damping: 14, stiffness: 95 } });

  return (
    <Scene center>
      <div className="final-card" style={{ transform: `scale(${0.86 + pop * 0.14})`, opacity: pop }}>
        <div className="brand-mark final">P</div>
        <p className="eyebrow">ProwasappAI</p>
        <h2>Lancez votre assistant WhatsApp intelligent.</h2>
        <p>
          Capturez plus de prospects. Répondez plus vite. Donnez à votre équipe une plateforme qui travaille avec elle.
        </p>
        <div className="cta">prowasappai.netlify.app</div>
      </div>
    </Scene>
  );
}

function Scene({ children, center = false }: { children: React.ReactNode; center?: boolean }) {
  return <AbsoluteFill className={center ? "scene scene-center" : "scene"}>{children}</AbsoluteFill>;
}

function SceneTitle({ kicker, title }: { kicker: string; title: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame, fps, config: { damping: 18, stiffness: 84 } });
  return (
    <div className="scene-title" style={fadeUp(progress, 0)}>
      <p className="eyebrow">{kicker}</p>
      <h2>{title}</h2>
    </div>
  );
}

function Portrait({
  src,
  label,
  delay,
  compact = false,
}: {
  src: string;
  label: string;
  delay: number;
  compact?: boolean;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - delay, fps, config: { damping: 20, stiffness: 72 } });

  return (
    <div className={compact ? "portrait portrait-compact" : "portrait"} style={fadeUp(progress, 0)}>
      <Img src={staticFile(src)} />
      <div className="portrait-label">{label}</div>
    </div>
  );
}

function PhoneMockup({ large = false }: { large?: boolean }) {
  const frame = useCurrentFrame();
  const y = Math.sin(frame / 26) * 9;
  const msg1 = interpolate(frame % 120, [0, 28, 80, 120], [0.2, 1, 1, 0.2]);
  const msg2 = interpolate((frame + 70) % 140, [0, 30, 100, 140], [0.2, 1, 1, 0.2]);

  return (
    <div className={large ? "phone phone-large" : "phone"} style={{ transform: `translateY(${y}px) rotateY(-12deg) rotateX(5deg)` }}>
      <div className="phone-notch" />
      <div className="phone-appbar">
        <span />
        <div>
          <strong>ProwasappAI</strong>
          <small>En ligne</small>
        </div>
      </div>
      <div className="chat-area">
        <div className="bubble client" style={{ opacity: msg1 }}>
          Bonjour, le sac Akwaba est disponible aujourd'hui ?
        </div>
        <div className="bubble ai" style={{ opacity: msg2 }}>
          Oui. Il reste 3 pièces. Je peux vous le réserver maintenant.
        </div>
        <div className="typing">
          <i />
          <i />
          <i />
        </div>
      </div>
    </div>
  );
}

function PainPoint({ label, index }: { label: string; index: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - index * 18, fps, config: { damping: 16, stiffness: 82 } });
  return (
    <div className="pain" style={fadeUp(progress, index * 10)}>
      <span>0{index + 1}</span>
      <p>{label}</p>
    </div>
  );
}

function FeatureLine({ title, text, delay }: { title: string; text: string; delay: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 78 } });
  return (
    <div className="feature-line" style={fadeUp(progress, 0)}>
      <span />
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}

function DocCard({ title, status, delay }: { title: string; status: string; delay: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - delay, fps, config: { damping: 15, stiffness: 75 } });
  return (
    <div className="doc-card" style={fadeUp(progress, 0)}>
      <div className="doc-icon" />
      <div>
        <strong>{title}</strong>
        <p>{status}</p>
      </div>
    </div>
  );
}

function Metric({ value, label, delay }: { value: string; label: string; delay: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 85 } });
  return (
    <div className="metric" style={fadeUp(progress, 0)}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function fadeUp(progress: number, offset: number): React.CSSProperties {
  return {
    opacity: interpolate(progress, [0, 1], [0, 1]),
    transform: `translateY(${interpolate(progress, [0, 1], [36 + offset, 0])}px)`,
  };
}
