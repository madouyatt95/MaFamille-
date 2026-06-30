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
const siteUrl = Deno.env.get("SITE_URL") || "https://myfamilyplus.fr";

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
    if (!stripeSecretKey) {
      return jsonResponse({
        error: "stripe_not_configured",
        message: "Le portail Stripe n'est pas encore configuré.",
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
      .select("id, created_by, stripe_customer_id")
      .eq("id", foyerId)
      .maybeSingle();

    if (foyerError || !foyer) {
      return jsonResponse({ error: "foyer_not_found" }, 404);
    }

    if (!membership && foyer.created_by !== userData.user.id) {
      return jsonResponse({ error: "forbidden" }, 403);
    }

    const customerId = foyer.stripe_customer_id as string | null;
    if (!customerId) {
      return jsonResponse({
        error: "stripe_customer_missing",
        message: "Aucun abonnement Stripe n'est associé à ce foyer.",
      }, 404);
    }

    const returnUrl = Deno.env.get("STRIPE_PORTAL_RETURN_URL") || `${siteUrl}/?premium=portal`;
    const params = new URLSearchParams();
    params.set("customer", customerId);
    params.set("return_url", returnUrl);
    params.set("locale", "fr");

    const session = await stripeRequest<{ id: string; url: string }>("billing_portal/sessions", params);
    return jsonResponse({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error("[create-stripe-portal]", error);
    return jsonResponse({
      error: "portal_failed",
      message: error instanceof Error ? error.message : "Impossible d'ouvrir la gestion de l'abonnement.",
    }, 500);
  }
});
