import { createStripeCheckout } from "./api.js";
import { getRuntimeEnv } from "./env.js";
import { getActiveProfile, getAppSettings, saveSyncProfile } from "./storage.js";
import { sanitizeText } from "./utils.js";

let stripeLoader = null;

async function resolveStripeLoader() {
  if (stripeLoader) return stripeLoader;
  try {
    const sdk = await import("@stripe/stripe-js");
    stripeLoader = sdk.loadStripe;
    return stripeLoader;
  } catch {
    const sdk = await import("https://esm.sh/@stripe/stripe-js");
    stripeLoader = sdk.loadStripe;
    return stripeLoader;
  }
}

export function isSubscriptionAllowed(status) {
  const normalized = sanitizeText(status || "", 24).toLowerCase();
  return normalized === "active" || normalized === "trial";
}

export async function getBillingState() {
  const [settings, profile] = await Promise.all([getAppSettings(), getActiveProfile()]);
  const requireActive = settings.billing?.requireActiveSubscription === true;
  const status = sanitizeText(profile.subscriptionStatus || "trial", 24).toLowerCase() || "trial";
  return {
    settings,
    profile,
    status,
    requireActive,
    allowed: !requireActive || isSubscriptionAllowed(status)
  };
}

export async function startStripePlanCheckout(plan, email = "") {
  const [settings, profile] = await Promise.all([getAppSettings(), getActiveProfile()]);
  const env = getRuntimeEnv();
  const endpoint = sanitizeText(
    settings.billing?.stripeCheckoutEndpoint || env.stripeCheckoutEndpoint || profile.endpoint || settings.auth?.googleSheetsEndpoint || "",
    1400
  );
  if (!endpoint) {
    throw new Error("Stripe checkout endpoint is missing. Configure it in settings or VITE_STRIPE_CHECKOUT_ENDPOINT.");
  }

  const selectedPlan = sanitizeText(plan || settings.tenantPlans?.[profile.id] || profile.plan || "starter", 20).toLowerCase() || "starter";
  const priceId = sanitizeText(settings.billing?.stripePriceIds?.[selectedPlan] || "", 120);
  const result = await createStripeCheckout({ ...profile, endpoint }, {
    tenantId: profile.tenantId,
    plan: selectedPlan,
    email: sanitizeText(email || profile.gmail || "", 180),
    priceId
  });

  await saveSyncProfile({
    ...profile,
    subscriptionStatus: "pending",
    active: true
  });

  return {
    ...result,
    publishableKey: sanitizeText(settings.billing?.stripePublishableKey || env.stripePublishableKey || "", 300)
  };
}

export async function redirectToStripeCheckout(checkout) {
  const publishableKey = sanitizeText(checkout?.publishableKey || "", 300);
  const sessionId = sanitizeText(checkout?.sessionId || "", 180);
  if (!publishableKey || !sessionId) return false;
  const loadStripe = await resolveStripeLoader();
  const stripe = await loadStripe(publishableKey);
  if (!stripe) {
    throw new Error("Stripe.js could not initialize. Check publishable key.");
  }
  const result = await stripe.redirectToCheckout({ sessionId });
  if (result?.error) {
    throw new Error(result.error.message || "Stripe checkout redirect failed.");
  }
  return true;
}
