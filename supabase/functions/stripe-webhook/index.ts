import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyStripeSignature(rawBody: string, signatureHeader: string | null): Promise<boolean> {
  if (!stripeWebhookSecret || !signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key, value];
    }),
  );
  const timestamp = parts.t;
  const receivedSignature = parts.v1;
  if (!timestamp || !receivedSignature) return false;

  const expected = await hmacSha256Hex(stripeWebhookSecret, `${timestamp}.${rawBody}`);
  return timingSafeEqual(hexToBytes(expected), hexToBytes(receivedSignature));
}

async function fetchStripeSubscription(subscriptionId: string): Promise<any | null> {
  if (!stripeSecretKey || !subscriptionId) return null;
  const response = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
    headers: { Authorization: `Bearer ${stripeSecretKey}` },
  });
  if (!response.ok) {
    console.warn("[stripe-webhook] Unable to fetch subscription", subscriptionId, await response.text());
    return null;
  }
  return await response.json();
}

function subscriptionSnapshot(subscription: any, fallback: any = {}) {
  const status = subscription?.status || fallback.status || "active";
  const isPremium = ["active", "trialing"].includes(status);
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : fallback.expiresAt || null;
  const metadata = subscription?.metadata || fallback.metadata || {};

  return {
    isPremium,
    plan: metadata.plan === "monthly" ? "monthly" : "yearly",
    status,
    expiresAt: periodEnd,
    subscriptionId: subscription?.id || fallback.subscriptionId || null,
    customerId: typeof subscription?.customer === "string" ? subscription.customer : fallback.customerId || null,
    foyerId: metadata.foyer_id || fallback.foyerId || null,
  };
}

async function updateFoyerFromSubscription(snapshot: ReturnType<typeof subscriptionSnapshot>) {
  if (!snapshot.foyerId && !snapshot.customerId) return;

  const payload = {
    is_premium: snapshot.isPremium,
    max_members: snapshot.isPremium ? 999 : 3,
    premium_source: snapshot.isPremium ? "stripe" : null,
    premium_plan: snapshot.isPremium ? snapshot.plan : null,
    premium_status: snapshot.status,
    premium_expires_at: snapshot.expiresAt,
    stripe_customer_id: snapshot.customerId,
    stripe_subscription_id: snapshot.subscriptionId,
  };

  let query = supabaseAdmin.from("foyers").update(payload);
  if (snapshot.foyerId) {
    query = query.eq("id", snapshot.foyerId);
  } else {
    query = query.eq("stripe_customer_id", snapshot.customerId);
  }

  const { error } = await query;
  if (error) {
    throw error;
  }
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const rawBody = await req.text();
  const isValid = await verifyStripeSignature(rawBody, req.headers.get("stripe-signature"));
  if (!isValid) {
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    const event = JSON.parse(rawBody);
    const object = event?.data?.object || {};

    if (event.type === "checkout.session.completed") {
      const subscriptionId = typeof object.subscription === "string" ? object.subscription : "";
      const subscription = await fetchStripeSubscription(subscriptionId);
      const snapshot = subscriptionSnapshot(subscription, {
        metadata: object.metadata || {},
        subscriptionId,
        customerId: typeof object.customer === "string" ? object.customer : null,
        foyerId: object.client_reference_id || object.metadata?.foyer_id || null,
      });
      await updateFoyerFromSubscription(snapshot);
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const snapshot = subscriptionSnapshot(object);
      await updateFoyerFromSubscription(snapshot);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[stripe-webhook]", error);
    return new Response("Webhook error", { status: 500 });
  }
});
