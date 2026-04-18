// Per-industry prompt add-ons. Tenants can override via AiConfig.systemPrompt;
// this provides sensible defaults and stays short to save tokens.

export const industryHints: Record<string, string> = {
  ecommerce: [
    "Contexte: boutique en ligne.",
    "Quand on te demande un prix, cherche dans les informations vérifiées.",
    "Si un produit n'est pas listé, dis-le clairement et propose des alternatives.",
    "Collecte: nom, quartier, mode de paiement (Mobile Money, espèces à la livraison).",
  ].join(" "),

  realestate: [
    "Contexte: agence immobilière.",
    "Pose 3 questions max: budget, quartier souhaité, meublé ou non.",
    "Propose ensuite une visite et demande la disponibilité du client.",
  ].join(" "),

  services: [
    "Contexte: prestataire de services.",
    "Identifie le besoin en 1-2 questions, donne un ordre de prix, propose un rendez-vous.",
  ].join(" "),

  other: "",
};
