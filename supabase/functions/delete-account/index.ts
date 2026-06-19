import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.106.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function removeOwnedStorageObjects(userId: string) {
  const { data: objects, error } = await supabaseAdmin
    .schema("storage")
    .from("objects")
    .select("bucket_id, name")
    .eq("owner_id", userId);

  if (error) {
    console.warn("[delete-account] storage lookup skipped:", error.message);
    return;
  }

  const byBucket = new Map<string, string[]>();
  for (const object of objects || []) {
    const names = byBucket.get(object.bucket_id) || [];
    names.push(object.name);
    byBucket.set(object.bucket_id, names);
  }

  for (const [bucket, names] of byBucket.entries()) {
    for (let index = 0; index < names.length; index += 100) {
      const { error: removeError } = await supabaseAdmin.storage
        .from(bucket)
        .remove(names.slice(index, index + 100));
      if (removeError) {
        console.warn(`[delete-account] storage cleanup failed for ${bucket}:`, removeError.message);
      }
    }
  }
}

async function collectStoragePaths(bucket: string, prefix: string): Promise<string[]> {
  const paths: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .list(prefix, { limit: 100, offset, sortBy: { column: "name", order: "asc" } });
    if (error) {
      console.warn(`[delete-account] unable to list ${bucket}/${prefix}:`, error.message);
      break;
    }
    if (!data || data.length === 0) break;

    for (const item of data) {
      const itemPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id) {
        paths.push(itemPath);
      } else {
        paths.push(...await collectStoragePaths(bucket, itemPath));
      }
    }

    if (data.length < 100) break;
    offset += data.length;
  }

  return paths;
}

async function removeFoyerStorage(foyerId: string) {
  const buckets = ["documents", "receipts", "dishes", "avatars", "chat-media"];
  for (const bucket of buckets) {
    const paths = await collectStoragePaths(bucket, foyerId);
    for (let index = 0; index < paths.length; index += 100) {
      const { error } = await supabaseAdmin.storage
        .from(bucket)
        .remove(paths.slice(index, index + 100));
      if (error) {
        console.warn(`[delete-account] unable to remove ${bucket}/${foyerId}:`, error.message);
      }
    }
  }
}

async function deleteUserGeneratedContent(userId: string) {
  const targets = [
    { table: "chat_messages", column: "sender_user_id" },
    { table: "groceries", column: "sender_user_id" },
  ];

  for (const target of targets) {
    const { error } = await supabaseAdmin
      .from(target.table)
      .delete()
      .eq(target.column, userId);
    if (error && error.code !== "42P01" && error.code !== "42703") {
      console.warn(`[delete-account] ${target.table} cleanup failed:`, error.message);
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "server_not_configured" }, 503);
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return jsonResponse({ error: "unauthorized" }, 401);

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) {
      return jsonResponse({ error: "unauthorized" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    if (body.confirmation !== "DELETE_MY_ACCOUNT") {
      return jsonResponse({ error: "confirmation_required" }, 400);
    }

    const userId = userData.user.id;
    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from("foyer_members")
      .select("id, foyer_id, role")
      .eq("user_id", userId);
    if (membershipError) throw membershipError;

    let transferredFoyers = 0;
    let deletedFoyers = 0;

    for (const membership of memberships || []) {
      const { data: foyer } = await supabaseAdmin
        .from("foyers")
        .select("id, created_by")
        .eq("id", membership.foyer_id)
        .maybeSingle();

      if (foyer?.created_by !== userId) continue;

      const { data: successor } = await supabaseAdmin
        .from("foyer_members")
        .select("user_id")
        .eq("foyer_id", membership.foyer_id)
        .not("user_id", "is", null)
        .neq("user_id", userId)
        .in("role", ["admin", "parent", "Chef de famille", "Gestionnaire"])
        .limit(1)
        .maybeSingle();

      if (successor?.user_id) {
        const { error: transferError } = await supabaseAdmin
          .from("foyers")
          .update({ created_by: successor.user_id })
          .eq("id", membership.foyer_id)
          .eq("created_by", userId);
        if (transferError) throw transferError;
        transferredFoyers += 1;
      } else {
        await removeFoyerStorage(membership.foyer_id);
        const { error: deleteFoyerError } = await supabaseAdmin
          .from("foyers")
          .delete()
          .eq("id", membership.foyer_id)
          .eq("created_by", userId);
        if (deleteFoyerError) throw deleteFoyerError;
        deletedFoyers += 1;
      }
    }

    await removeOwnedStorageObjects(userId);
    await deleteUserGeneratedContent(userId);

    const { error: memberDeleteError } = await supabaseAdmin
      .from("foyer_members")
      .delete()
      .eq("user_id", userId);
    if (memberDeleteError) throw memberDeleteError;

    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authDeleteError) throw authDeleteError;

    return jsonResponse({
      deleted: true,
      transferredFoyers,
      deletedFoyers,
    });
  } catch (error) {
    console.error("[delete-account]", error);
    return jsonResponse({
      error: "account_deletion_failed",
      message: error instanceof Error ? error.message : "La suppression du compte a échoué.",
    }, 500);
  }
});
