// Billing provider abstraction — manual (mobile money) and Stripe stubs.
// Both return the same shape so controllers stay identical.

import { env } from "../../config/env";

export interface CheckoutSession {
  url: string | null;     // null = manual flow
  reference: string;
  provider: "manual" | "stripe";
}

export interface IBillingProvider {
  createCheckout(tenantId: string, plan: "starter" | "pro" | "business"): Promise<CheckoutSession>;
  cancel(tenantId: string): Promise<void>;
}

class ManualProvider implements IBillingProvider {
  async createCheckout(tenantId: string, plan: "starter" | "pro" | "business") {
    return {
      url: null,
      reference: `manual-${tenantId}-${plan}-${Date.now()}`,
      provider: "manual" as const,
    };
  }
  async cancel(_tenantId: string) {
    // no-op
  }
}

class StripeProvider implements IBillingProvider {
  async createCheckout(_tenantId: string, plan: "starter" | "pro" | "business") {
    // TODO: integrate @stripe/stripe when STRIPE_SECRET_KEY is set.
    return {
      url: "https://example.stripe.test/checkout",
      reference: `stripe-stub-${plan}-${Date.now()}`,
      provider: "stripe" as const,
    };
  }
  async cancel(_tenantId: string) {
    // TODO
  }
}

export const billing: IBillingProvider =
  env.BILLING_PROVIDER === "stripe" ? new StripeProvider() : new ManualProvider();
