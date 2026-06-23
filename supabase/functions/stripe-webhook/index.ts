import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
const stripeSignatureToleranceSeconds = 300;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

type StripeMetadata = Record<string, string | undefined>;

type StripeSubscriptionLike = {
  id?: string;
  status?: string;
  current_period_end?: number;
  customer?: string | { id?: string } | null;
  metadata?: StripeMetadata;
};

type StripeCheckoutSessionLike = {
  subscription?: string | null;
  customer?: string | null;
  client_reference_id?: string | null;
  metadata?: StripeMetadata;
};

type SubscriptionSnapshotFallback = {
  status?: string;
  expiresAt?: string | null;
  metadata?: StripeMetadata;
  subscriptionId?: string | null;
  customerId?: string | null;
  foyerId?: string | null;
};

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
  if (!stripeWebhookSecret) {
    console.error("[stripe-webhook] Error: STRIPE_WEBHOOK_SECRET environment variable is not set!");
    return false;
  }
  if (!signatureHeader) {
    console.error("[stripe-webhook] Error: stripe-signature header is missing!");
    return false;
  }

  try {
    const signatureParts = signatureHeader.split(",").map((part) => {
      const separatorIndex = part.indexOf("=");
      return {
        key: part.slice(0, separatorIndex),
        value: part.slice(separatorIndex + 1),
      };
    });
    const timestamp = signatureParts.find((part) => part.key === "t")?.value;
    const receivedSignatures = signatureParts
      .filter((part) => part.key === "v1")
      .map((part) => part.value)
      .filter(Boolean);
    if (!timestamp || receivedSignatures.length === 0) {
      console.error("[stripe-webhook] Error: timestamp or v1 signature missing");
      return false;
    }

    const timestampSeconds = Number(timestamp);
    if (!Number.isFinite(timestampSeconds)) {
      console.error("[stripe-webhook] Error: invalid signature timestamp");
      return false;
    }
    const signatureAgeSeconds = Math.abs(Math.floor(Date.now() / 1000) - timestampSeconds);
    if (signatureAgeSeconds > stripeSignatureToleranceSeconds) {
      console.error("[stripe-webhook] Error: signature timestamp outside tolerance");
      return false;
    }

    const expected = await hmacSha256Hex(stripeWebhookSecret, `${timestamp}.${rawBody}`);
    const expectedBytes = hexToBytes(expected);
    const matches = receivedSignatures.some((receivedSignature) => {
      if (!/^[a-f0-9]{64}$/i.test(receivedSignature)) return false;
      return timingSafeEqual(expectedBytes, hexToBytes(receivedSignature));
    });
    if (!matches) {
      console.error("[stripe-webhook] Error: Signature mismatch!");
    }
    return matches;
  } catch (err) {
    console.error("[stripe-webhook] Exception during signature verification:", err);
    return false;
  }
}

async function fetchStripeSubscription(subscriptionId: string): Promise<StripeSubscriptionLike | null> {
  if (!stripeSecretKey || !subscriptionId) return null;
  const response = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
    headers: { Authorization: `Bearer ${stripeSecretKey}` },
  });
  if (!response.ok) {
    console.warn("[stripe-webhook] Unable to fetch subscription", subscriptionId, await response.text());
    return null;
  }
  return await response.json() as StripeSubscriptionLike;
}

function subscriptionSnapshot(
  subscription: StripeSubscriptionLike | null,
  fallback: SubscriptionSnapshotFallback = {},
) {
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
  console.log(`[stripe-webhook] Received request: ${req.method} ${req.url}`);
  if (req.method !== "POST") {
    console.warn(`[stripe-webhook] Method ${req.method} not allowed`);
    return new Response("Method not allowed", { status: 405 });
  }

  const rawBody = await req.text();
  const signatureHeader = req.headers.get("stripe-signature");

  const isValid = await verifyStripeSignature(rawBody, signatureHeader);
  if (!isValid) {
    console.error("[stripe-webhook] Signature verification failed, rejecting request with 400");
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    const event = JSON.parse(rawBody) as {
      id?: string;
      type?: string;
      data?: { object?: StripeSubscriptionLike | StripeCheckoutSessionLike };
    };
    console.log(`[stripe-webhook] Processing Stripe event: ${event.id} (type: ${event.type})`);
    const object = event?.data?.object || {};

    if (event.type === "checkout.session.completed") {
      const checkoutSession = object as StripeCheckoutSessionLike;
      console.log("[stripe-webhook] Handling checkout.session.completed event");
      const subscriptionId = typeof checkoutSession.subscription === "string" ? checkoutSession.subscription : "";
      console.log("[stripe-webhook] Fetching subscription details for:", subscriptionId);
      const subscription = await fetchStripeSubscription(subscriptionId);
      const snapshot = subscriptionSnapshot(subscription, {
        metadata: checkoutSession.metadata || {},
        subscriptionId,
        customerId: typeof checkoutSession.customer === "string" ? checkoutSession.customer : null,
        foyerId: checkoutSession.client_reference_id || checkoutSession.metadata?.foyer_id || null,
      });
      console.log("[stripe-webhook] Subscription snapshot computed:", JSON.stringify(snapshot));
      await updateFoyerFromSubscription(snapshot);
      console.log("[stripe-webhook] Foyer successfully updated for snapshot foyerId:", snapshot.foyerId);
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const subscription = object as StripeSubscriptionLike;
      console.log(`[stripe-webhook] Handling ${event.type} event`);
      const snapshot = subscriptionSnapshot(subscription);
      console.log("[stripe-webhook] Subscription snapshot computed:", JSON.stringify(snapshot));
      await updateFoyerFromSubscription(snapshot);
      console.log("[stripe-webhook] Foyer successfully updated for snapshot customerId:", snapshot.customerId);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[stripe-webhook] Webhook execution error:", error);
    return new Response("Webhook error", { status: 500 });
  }
});
