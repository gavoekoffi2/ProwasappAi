import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { requireAuth, signToken } from "../../middleware/auth";
import { asyncHandler, conflict, unauthorized } from "../../utils/errors";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  businessName: z.string().min(1),
  industry: z.enum(["ecommerce", "realestate", "services", "other"]).default("other"),
  locale: z.string().default("fr"),
});

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const body = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) throw conflict("Email already in use");

    const hash = await bcrypt.hash(body.password, 10);

    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const tenant = await prisma.tenant.create({
      data: {
        name: body.businessName,
        industry: body.industry,
        locale: body.locale,
        users: {
          create: {
            email: body.email,
            password: hash,
            name: body.name,
            role: "owner",
          },
        },
        subscription: {
          create: {
            plan: "starter",
            status: "trialing",
            trialEndsAt,
            provider: env.BILLING_PROVIDER,
          },
        },
        aiConfig: {
          create: {
            systemPrompt: defaultPromptFor(body.industry, body.businessName, body.locale),
            language: body.locale,
          },
        },
      },
      include: { users: true },
    });

    const user = tenant.users[0];
    const token = signToken({ sub: user.id, tenantId: tenant.id, role: user.role });
    res.json({ token, user: publicUser(user), tenant: { id: tenant.id, name: tenant.name } });
  }),
);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw unauthorized("Invalid credentials");
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw unauthorized("Invalid credentials");

    const token = signToken({ sub: user.id, tenantId: user.tenantId, role: user.role });
    res.json({ token, user: publicUser(user) });
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.sub },
      include: { tenant: { include: { subscription: true } } },
    });
    if (!user) throw unauthorized();
    res.json({
      user: publicUser(user),
      tenant: user.tenant,
    });
  }),
);

function publicUser(u: { id: string; email: string; name: string; role: string; tenantId: string }) {
  return { id: u.id, email: u.email, name: u.name, role: u.role, tenantId: u.tenantId };
}

function defaultPromptFor(industry: string, name: string, locale: string) {
  const base: Record<string, string> = {
    ecommerce: `Tu es l'assistant WhatsApp de la boutique "${name}". Tu aides les clients à trouver des produits, donner les prix, vérifier la disponibilité et organiser la livraison.`,
    realestate: `Tu es l'assistant WhatsApp de l'agence immobilière "${name}". Tu réponds aux questions sur les biens, organise des visites et collecte les coordonnées.`,
    services: `Tu es l'assistant WhatsApp de "${name}". Tu présentes les services, donnes les tarifs et prends des rendez-vous.`,
    other: `Tu es l'assistant WhatsApp de "${name}". Tu réponds aux questions des clients de manière professionnelle.`,
  };
  const en: Record<string, string> = {
    ecommerce: `You are the WhatsApp assistant for the online shop "${name}". Help customers find products, give prices, check stock, and organise delivery.`,
    realestate: `You are the WhatsApp assistant for the real-estate agency "${name}". Answer questions about listings, schedule viewings, collect contact info.`,
    services: `You are the WhatsApp assistant for "${name}". Describe services, quote prices, book appointments.`,
    other: `You are the WhatsApp assistant for "${name}". Answer customer questions professionally.`,
  };
  const prompt = (locale.startsWith("en") ? en : base)[industry] ?? base.other;
  return `${prompt}\n\nRéponds toujours de manière courte, polie et claire. Utilise la langue du client.`;
}
