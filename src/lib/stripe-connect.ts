import Stripe from "stripe";

const connectSecretKey =
  process.env.STRIPE_CONNECT_SECRET_KEY ?? process.env.STRIPE_SECRET_KEY;

if (!connectSecretKey) {
  throw new Error("Missing STRIPE_CONNECT_SECRET_KEY (or STRIPE_SECRET_KEY fallback)");
}

export const stripeConnect = new Stripe(connectSecretKey, {
  apiVersion: "2026-01-28.clover",
});
