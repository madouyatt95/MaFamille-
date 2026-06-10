import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
const stripeWebMonthlyPriceId = Deno.env.get("STRIPE_PRICE_WEB_MONTHLY") || "";
const stripeWebYearlyPriceId = Deno.env.get("STRIPE_PRICE_WEB_YEARLY") || "";
const siteUrl = Deno.env.get("SITE_URL") || "https://ma-famille-nu.vercel.app";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function stripeRequest<T>(path: string, params: URLSearchParams): Promise<T> {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "Stripe request failed");
  }
  return data as T;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    if (!stripeSecretKey || !stripeWebMonthlyPriceId || !stripeWebYearlyPriceId) {
      return jsonResponse({
        error: "stripe_not_configured",
        message: "Le paiement Stripe n'est pas encore configuré.",
      }, 503);
    }

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return jsonResponse({ error: "unauthorized" }, 401);
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) {
      return jsonResponse({ error: "unauthorized" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const foyerId = String(body.foyerId || "");
    const plan = body.plan === "monthly" ? "monthly" : "yearly";
    const priceId = plan === "monthly" ? stripeWebMonthlyPriceId : stripeWebYearlyPriceId;

    if (!foyerId) {
      return jsonResponse({ error: "missing_foyer_id" }, 400);
    }

    const { data: membership } = await supabaseAdmin
      .from("foyer_members")
      .select("id")
      .eq("foyer_id", foyerId)
      .eq("user_id", userData.user.id)
      .maybeSingle();

    const { data: foyer, error: foyerError } = await supabaseAdmin
      .from("foyers")
      .select("id, name, created_by, stripe_customer_id")
      .eq("id", foyerId)
      .maybeSingle();

    if (foyerError || !foyer) {
      return jsonResponse({ error: "foyer_not_found" }, 404);
    }

    if (!membership && foyer.created_by !== userData.user.id) {
      return jsonResponse({ error: "forbidden" }, 403);
    }

    let customerId = foyer.stripe_customer_id as string | null;
    if (!customerId) {
      const customerParams = new URLSearchParams();
      customerParams.set("email", userData.user.email || "");
      customerParams.set("name", foyer.name || "MyFamily+");
      customerParams.set("metadata[foyer_id]", foyerId);
      customerParams.set("metadata[user_id]", userData.user.id);

      const customer = await stripeRequest<{ id: string }>("customers", customerParams);
      customerId = customer.id;

      await supabaseAdmin
        .from("foyers")
        .update({ stripe_customer_id: customerId })
        .eq("id", foyerId);
    }

    const successUrl = Deno.env.get("STRIPE_SUCCESS_URL") || `${siteUrl}/?premium=success`;
    const cancelUrl = Deno.env.get("STRIPE_CANCEL_URL") || `${siteUrl}/?premium=cancel`;

    const params = new URLSearchParams();
    params.set("mode", "subscription");
    params.set("customer", customerId);
    params.set("client_reference_id", foyerId);
    params.set("success_url", successUrl);
    params.set("cancel_url", cancelUrl);
    params.set("allow_promotion_codes", "true");
    params.set("line_items[0][price]", priceId);
    params.set("line_items[0][quantity]", "1");
    params.set("metadata[foyer_id]", foyerId);
    params.set("metadata[user_id]", userData.user.id);
    params.set("metadata[plan]", plan);
    params.set("metadata[platform]", "web");
    params.set("subscription_data[metadata][foyer_id]", foyerId);
    params.set("subscription_data[metadata][user_id]", userData.user.id);
    params.set("subscription_data[metadata][plan]", plan);
    params.set("subscription_data[metadata][platform]", "web");

    const session = await stripeRequest<{ id: string; url: string }>("checkout/sessions", params);
    return jsonResponse({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error("[create-stripe-checkout]", error);
    return jsonResponse({
      error: "checkout_failed",
      message: error instanceof Error ? error.message : "Impossible de démarrer le paiement.",
    }, 500);
  }
});
