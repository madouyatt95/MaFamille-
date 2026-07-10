import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const appStoreIssuerId = Deno.env.get("APP_STORE_ISSUER_ID") || "";
const appStoreKeyId = Deno.env.get("APP_STORE_KEY_ID") || "";
const appStorePrivateKey = Deno.env.get("APP_STORE_PRIVATE_KEY") || "";
const appStoreBundleId = Deno.env.get("APP_STORE_BUNDLE_ID") || "";
const appStoreMonthlyProductId = Deno.env.get("APP_STORE_PRODUCT_ID_MONTHLY") || "fr.myfamilyplus.app.premium.monthly";
const appStoreYearlyProductId = Deno.env.get("APP_STORE_PRODUCT_ID_YEARLY") || "fr.myfamilyplus.app.premium.yearly";
const appStoreEnvironment = Deno.env.get("APP_STORE_ENVIRONMENT") || "auto";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

type AppStoreTransactionPayload = {
  transactionId?: string;
  originalTransactionId?: string;
  appAccountToken?: string;
  bundleId?: string;
  productId?: string;
  purchaseDate?: number;
  expiresDate?: number;
  revocationDate?: number;
  environment?: string;
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function base64UrlEncode(input: Uint8Array | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecodeJson<T>(value: string): T {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

function normalizePrivateKey(rawKey: string): string {
  return rawKey.replace(/\\n/g, "\n").trim();
}

async function importApplePrivateKey() {
  const pem = normalizePrivateKey(appStorePrivateKey);
  const base64 = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return await crypto.subtle.importKey(
    "pkcs8",
    bytes,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
}

async function createAppleJwt(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: "ES256",
    kid: appStoreKeyId,
    typ: "JWT",
  };
  const payload = {
    iss: appStoreIssuerId,
    iat: now,
    exp: now + 900,
    aud: "appstoreconnect-v1",
    bid: appStoreBundleId,
  };
  const unsigned = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
  const key = await importApplePrivateKey();
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsigned),
  );
  return `${unsigned}.${base64UrlEncode(new Uint8Array(signature))}`;
}

function appStoreHosts(): string[] {
  if (appStoreEnvironment === "production") return ["https://api.storekit.itunes.apple.com"];
  if (appStoreEnvironment === "sandbox") return ["https://api.storekit-sandbox.itunes.apple.com"];
  return [
    "https://api.storekit.itunes.apple.com",
    "https://api.storekit-sandbox.itunes.apple.com",
  ];
}

async function fetchAppleTransaction(transactionId: string): Promise<AppStoreTransactionPayload> {
  const jwt = await createAppleJwt();
  let lastError = "Apple transaction lookup failed";

  for (const host of appStoreHosts()) {
    const response = await fetch(`${host}/inApps/v1/transactions/${transactionId}`, {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    });

    const data = await response.json().catch(() => ({}));
    if (response.ok && data?.signedTransactionInfo) {
      return base64UrlDecodeJson<AppStoreTransactionPayload>(String(data.signedTransactionInfo).split(".")[1]);
    }
    lastError = data?.errorMessage || data?.message || `${response.status} ${response.statusText}`;
  }

  throw new Error(lastError);
}

function planFromProductId(productId?: string): "monthly" | "yearly" {
  return productId === appStoreMonthlyProductId ? "monthly" : "yearly";
}

function statusFromTransaction(payload: AppStoreTransactionPayload): "active" | "expired" | "canceled" {
  if (payload.revocationDate) return "canceled";
  if (payload.expiresDate && payload.expiresDate <= Date.now()) return "expired";
  return "active";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  try {
    if (!appStoreIssuerId || !appStoreKeyId || !appStorePrivateKey || !appStoreBundleId) {
      return jsonResponse({
        error: "app_store_not_configured",
        message: "La validation App Store n'est pas encore configurée côté Supabase.",
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
    const transactionId = String(body.transactionId || "");
    if (!foyerId || !transactionId) {
      return jsonResponse({ error: "missing_parameters" }, 400);
    }

    const { data: membership } = await supabaseAdmin
      .from("foyer_members")
      .select("id")
      .eq("foyer_id", foyerId)
      .eq("user_id", userData.user.id)
      .maybeSingle();

    const { data: foyer, error: foyerError } = await supabaseAdmin
      .from("foyers")
      .select("id, created_by")
      .eq("id", foyerId)
      .maybeSingle();

    if (foyerError || !foyer) {
      return jsonResponse({ error: "foyer_not_found" }, 404);
    }

    if (!membership && foyer.created_by !== userData.user.id) {
      return jsonResponse({ error: "forbidden" }, 403);
    }

    const transaction = await fetchAppleTransaction(transactionId);
    if (transaction.bundleId !== appStoreBundleId) {
      return jsonResponse({ error: "invalid_bundle" }, 400);
    }
    if (![appStoreMonthlyProductId, appStoreYearlyProductId].includes(String(transaction.productId || ""))) {
      return jsonResponse({ error: "invalid_product" }, 400);
    }
    if (transaction.appAccountToken && transaction.appAccountToken.toLowerCase() !== foyerId.toLowerCase()) {
      return jsonResponse({ error: "invalid_app_account_token" }, 403);
    }

    const originalTransactionId = transaction.originalTransactionId
      || transaction.transactionId
      || transactionId;
    const { data: linkedFoyer, error: linkedFoyerError } = await supabaseAdmin
      .from("foyers")
      .select("id")
      .eq("app_store_original_transaction_id", originalTransactionId)
      .neq("id", foyerId)
      .maybeSingle();

    if (linkedFoyerError) {
      throw linkedFoyerError;
    }
    if (linkedFoyer) {
      return jsonResponse({ error: "transaction_already_linked" }, 409);
    }

    const status = statusFromTransaction(transaction);
    const isPremium = status === "active";
    const expiresAt = transaction.expiresDate
      ? new Date(transaction.expiresDate).toISOString()
      : null;

    const payload = {
      is_premium: isPremium,
      max_members: isPremium ? 999 : 3,
      premium_source: isPremium ? "appstore" : null,
      premium_plan: isPremium ? planFromProductId(transaction.productId) : null,
      premium_status: status,
      premium_expires_at: expiresAt,
      app_store_original_transaction_id: originalTransactionId,
    };

    const { error: updateError } = await supabaseAdmin
      .from("foyers")
      .update(payload)
      .eq("id", foyerId);

    if (updateError) {
      throw updateError;
    }

    return jsonResponse({
      subscription: {
        isPremium,
        source: "appstore",
        plan: planFromProductId(transaction.productId),
        status,
        expiresAt,
        platform: "ios",
        appStoreOriginalTransactionId: payload.app_store_original_transaction_id,
      },
    });
  } catch (error) {
    console.error("[verify-app-store-purchase]", error);
    return jsonResponse({
      error: "app_store_validation_failed",
      message: error instanceof Error ? error.message : "Impossible de valider l'achat App Store.",
    }, 500);
  }
});
