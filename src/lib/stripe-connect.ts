import Stripe from "stripe";

if (!process.env.STRIPE_CONNECT_SECRET_KEY) {
  throw new Error("Missing STRIPE_CONNECT_SECRET_KEY");
}

export const stripeConnect = new Stripe(process.env.STRIPE_CONNECT_SECRET_KEY, {
  apiVersion: "2026-01-28.clover",
});
