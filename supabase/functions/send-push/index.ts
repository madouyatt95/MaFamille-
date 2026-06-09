import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const firebaseProject = "mafamilleplus";

// Initialisation du client admin de Supabase (pour bypasser les politiques RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

function getTargetUrl(targetModule: string, record: any): string {
  if (targetModule === "messagerie") {
    const groupId = record.group_id || "";
    return `/?tab=menu&module=messagerie${groupId ? `&groupId=${groupId}` : ""}`;
  }
  if (targetModule === "agenda") {
    return "/?tab=menu&module=agenda";
  }
  if (targetModule && targetModule !== "other") {
    return `/?tab=menu&module=${targetModule}`;
  }
  return "/";
}

function getNotificationDedupKey(table: string, targetModule: string, record: any): string {
  const recordId = record?.id || record?.group_id || Date.now();
  return `${table || "unknown"}-${targetModule || "other"}-${recordId}`;
}

async function sha256(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function getPushEventKey(payload: any): Promise<string> {
  const record = payload.record || {};
  const oldRecord = payload.old_record || {};
  const signature = {
    table: payload.table || "unknown",
    type: payload.type || "unknown",
    id: record.id || record.group_id || "",
    foyer_id: record.foyer_id || "",
    updated_at: record.updated_at || record.created_at || "",
    title: record.title || "",
    content: record.content || "",
    done: record.done ?? "",
    checked: record.checked ?? "",
    validated_by_parent: record.validated_by_parent ?? "",
    old_done: oldRecord.done ?? "",
    old_checked: oldRecord.checked ?? "",
    old_validated_by_parent: oldRecord.validated_by_parent ?? ""
  };

  return `${signature.table}:${signature.type}:${await sha256(JSON.stringify(signature))}`;
}

async function claimPushEvent(payload: any, foyerId: string): Promise<boolean> {
  const eventKey = await getPushEventKey(payload);
  const recordId = payload.record?.id || payload.record?.group_id || null;

  const { error } = await supabaseAdmin
    .from("push_delivery_log")
    .insert({
      event_key: eventKey,
      foyer_id: String(foyerId || ""),
      table_name: payload.table || "unknown",
      event_type: payload.type || "unknown",
      record_id: recordId ? String(recordId) : null
    });

  if (!error) {
    return true;
  }

  if (error.code === "23505") {
    console.log("[Send-Push] Événement déjà traité, push ignoré :", eventKey);
    return false;
  }

  if (error.code === "42P01") {
    console.warn("[Send-Push] Table push_delivery_log absente. Déployez la migration Supabase anti-doublons.");
    return true;
  }

  console.error("[Send-Push] Erreur anti-doublon, push ignoré par sécurité :", error.message);
  return false;
}

async function clearInvalidFcmToken(fcmToken: string) {
  const { error } = await supabaseAdmin
    .from("foyer_members")
    .update({ fcm_token: null })
    .eq("fcm_token", fcmToken);

  if (error) {
    console.error("[Send-Push] Impossible de nettoyer le token invalide :", error.message);
  }
}

function normalizeIdentity(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function getPreferenceKeyForModule(targetModule: string): string | null {
  const moduleName = normalizeIdentity(targetModule);

  if (["courses", "grocery", "groceries"].includes(moduleName)) return "groceries";
  if (["taches", "tasks", "chore_tasks"].includes(moduleName)) return "tasks";
  if (["agenda", "events", "calendar"].includes(moduleName)) return "agenda";
  if (["budget", "finances", "transactions", "saving_goals"].includes(moduleName)) return "finances";
  if (["messagerie", "chat", "messages"].includes(moduleName)) return "chat";
  if (["sante", "health", "vaccines"].includes(moduleName)) return "health";
  if (["vault", "documents", "demarches", "justificatif_packs"].includes(moduleName)) return "vault";

  return null;
}

function allowsModulePush(member: any, targetModule: string): boolean {
  const preferenceKey = getPreferenceKeyForModule(targetModule);
  if (!preferenceKey) return true;

  const prefs = member?.notification_prefs;
  if (!prefs || typeof prefs !== "object") return true;

  return prefs[preferenceKey] !== false;
}

// Encodage Base64URL conforme aux specs JWT
function base64UrlEncode(str: string): string {
  const binary = new TextEncoder().encode(str);
  let base64 = "";
  const bytes = new Uint8Array(binary);
  for (let i = 0; i < bytes.byteLength; i++) {
    base64 += String.fromCharCode(bytes[i]);
  }
  return btoa(base64).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlEncodeArrayBuffer(buffer: ArrayBuffer): string {
  let base64 = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    base64 += String.fromCharCode(bytes[i]);
  }
  return btoa(base64).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Fonction d'authentification Google OAuth2 native en Web Crypto
async function getGoogleAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const cleanKey = privateKey
    .replace(/\\n/g, '\n')
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');

  const binaryKey = Uint8Array.from(atob(cleanKey), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: { name: "SHA-256" },
    },
    false,
    ["sign"]
  );

  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64UrlEncode(JSON.stringify({
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  }));

  const message = new TextEncoder().encode(`${header}.${payload}`);
  const signatureBuffer = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    message
  );
  
  const base64UrlSignature = base64UrlEncodeArrayBuffer(signatureBuffer);
  const jwt = `${header}.${payload}.${base64UrlSignature}`;

  // Échange du JWT contre le Token d'accès
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${await response.text()}`);
  }

  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  try {
    const payload = await req.json();
    console.log("[Send-Push] Webhook reçu pour table :", payload.table, "| Type :", payload.type);

    if (payload.type !== "INSERT" && payload.type !== "UPDATE") {
      return new Response(JSON.stringify({ message: "Ignored non-INSERT/UPDATE events" }), { status: 200 });
    }

    const record = payload.record;
    const oldRecord = payload.old_record;
    const foyerId = record.foyer_id;
    if (!foyerId) {
      return new Response(JSON.stringify({ error: "No foyer_id found in record" }), { status: 400 });
    }

    const shouldSend = await claimPushEvent(payload, foyerId);
    if (!shouldSend) {
      return new Response(JSON.stringify({ message: "Duplicate push event ignored" }), { status: 200 });
    }

    supabaseAdmin
      .from("push_delivery_log")
      .delete()
      .lt("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .then(({ error }) => {
        if (error) console.warn("[Send-Push] Nettoyage push_delivery_log ignoré :", error.message);
      });

    // 1. Déterminer le titre et le corps de la notification
    let title = "";
    let body = "";
    let senderId = "";
    let senderName = "";
    let senderUserId = "";
    let targetModule = "other";

    if (payload.table === "chat_messages") {
      if (payload.type !== "INSERT") {
        return new Response(JSON.stringify({ message: "Ignored UPDATE for chat_messages" }), { status: 200 });
      }
      senderId = record.sender_id;
      senderUserId = record.sender_user_id || "";
      senderName = record.sender_name || "";
      title = `${record.sender_name || "Un membre"} dans le Chat`;
      if (record.type === "image") {
        body = "📷 Image partagée";
      } else if (record.type === "voice") {
        body = "🎤 Message vocal";
      } else {
        body = record.content || "";
      }
      targetModule = "messagerie";
    } else if (payload.table === "alerts") {
      if (payload.type !== "INSERT") {
        return new Response(JSON.stringify({ message: "Ignored UPDATE for alerts" }), { status: 200 });
      }
      const alertModule = String(record.module || "other").toLowerCase();
      const modulesWithDedicatedPush = new Set([
        "agenda",
        "capsule",
        "chat",
        "conseil",
        "courses",
        "grocery",
        "groceries",
        "messagerie",
        "memories",
        "taches",
        "tasks"
      ]);

      if (modulesWithDedicatedPush.has(alertModule)) {
        return new Response(
          JSON.stringify({ message: `Ignored alert push for module with dedicated trigger: ${alertModule}` }),
          { status: 200 }
        );
      }

      senderId = record.sender_member_id || "";
      senderUserId = record.sender_user_id || "";
      senderName = record.sender_name || "";
      title = record.title || "Alerte de Famille";
      body = record.description || "";
      targetModule = record.module || "other";
    } else if (payload.table === "memories") {
      if (payload.type !== "INSERT") {
        return new Response(JSON.stringify({ message: "Ignored UPDATE for memories" }), { status: 200 });
      }
      title = `✨ Nouveau souvenir de ${record.author_name || "la famille"}`;
      senderName = record.author_name || "";
      body = record.title || "";
      targetModule = "capsule";
    } else if (payload.table === "events") {
      targetModule = "agenda";
      if (payload.type === "INSERT") {
        title = `📅 Nouvel événement : ${record.title}`;
        body = `${record.date_time || ""} ${record.time || ""}`.trim();
        if (record.location) body += ` @ ${record.location}`;
      } else if (payload.type === "UPDATE") {
        const titleChanged = oldRecord?.title !== record.title;
        const dateTimeChanged = oldRecord?.date_time !== record.date_time || oldRecord?.time !== record.time;
        const locationChanged = oldRecord?.location !== record.location;
        const doneChanged = oldRecord?.done !== record.done;

        if (doneChanged && record.done) {
          title = `📅 Événement terminé`;
          body = `"${record.title}" a été marqué comme fait.`;
        } else if (titleChanged || dateTimeChanged || locationChanged) {
          title = `📅 Événement mis à jour : ${record.title}`;
          body = `${record.date_time || ""} ${record.time || ""}`.trim();
          if (record.location) body += ` @ ${record.location}`;
        } else {
          return new Response(JSON.stringify({ message: "No significant changes on event" }), { status: 200 });
        }
      }
    } else if (payload.table === "chore_tasks") {
      targetModule = "taches";
      if (payload.type === "INSERT") {
        title = `🧹 Nouvelle tâche : ${record.title}`;
        body = `Assignée à : ${record.assigned_member_name || "Tous"} (Récompense : ${record.reward_points || 0} pts)`;
      } else if (payload.type === "UPDATE") {
        const doneChanged = oldRecord?.done !== record.done;
        const validationChanged = oldRecord?.validated_by_parent !== record.validated_by_parent;

        if (doneChanged && record.done && !record.validated_by_parent) {
          title = `🧹 Tâche terminée : ${record.title}`;
          body = `Terminée par ${record.assigned_member_name || "un membre"}. En attente de validation parentale.`;
        } else if (validationChanged && record.validated_by_parent) {
          title = `🧹 Tâche validée ! 🎉`;
          body = `La tâche "${record.title}" a été validée par un parent. Les points de récompense ont été attribués !`;
        } else if (oldRecord?.title !== record.title || oldRecord?.assigned_member_id !== record.assigned_member_id) {
          title = `🧹 Tâche mise à jour : ${record.title}`;
          body = `Assignée à : ${record.assigned_member_name || "Tous"}`;
        } else {
          return new Response(JSON.stringify({ message: "No significant changes on chore task" }), { status: 200 });
        }
      }
    } else if (payload.table === "votes") {
      if (payload.type !== "INSERT") {
        return new Response(JSON.stringify({ message: "Ignored UPDATE for votes" }), { status: 200 });
      }
      title = `🗳️ Conseil de famille : Nouveau Vote !`;
      body = record.question || "";
      targetModule = "conseil";
    } else if (payload.table === "groceries") {
      targetModule = "courses";
      senderId = record.sender_member_id || "";
      senderUserId = record.sender_user_id || "";
      senderName = record.sender_name || record.added_by || "";
      if (payload.type === "INSERT") {
        title = `Article ajouté aux courses`;
        body = `"${record.name}" (${record.quantity || "1"}) a été ajouté par ${record.added_by || "un membre"}.`;
      } else if (payload.type === "UPDATE") {
        const checkedChanged = oldRecord?.checked !== record.checked;
        if (checkedChanged && record.checked) {
          title = `🛒 Courses en cours`;
          body = `L'article "${record.name}" a été acheté !`;
        } else {
          return new Response(JSON.stringify({ message: "No significant changes on grocery item" }), { status: 200 });
        }
      }
    } else if (payload.table === "malus_applied") {
      if (payload.type !== "INSERT") {
        return new Response(JSON.stringify({ message: "Ignored UPDATE for malus_applied" }), { status: 200 });
      }
      targetModule = "taches";
      
      let kidName = "Un enfant";
      try {
        const { data: memberData } = await supabaseAdmin
          .from("foyer_members")
          .select("display_name")
          .eq("id", record.member_id)
          .single();
        if (memberData?.display_name) {
          kidName = memberData.display_name;
        }
      } catch (err) {
        console.error("[Send-Push] Failed to fetch member display_name:", err);
      }

      if (record.shield_used) {
        title = `🛡️ Bouclier activé !`;
        body = `Le bouclier de ${kidName} a bloqué le malus "${record.title}". Ouf !`;
      } else {
        title = `⚠️ Malus appliqué`;
        body = `${record.emoji || "⚠️"} ${record.title} : -${record.stars_removed || 0} ⭐ et -${record.xp_removed || 0} XP pour ${kidName}.`;
        if (record.comment) {
          body += ` Commentaire : "${record.comment}"`;
        }
      }
    } else {
      return new Response(JSON.stringify({ message: "Table not supported for push" }), { status: 200 });
    }

    // 2. Récupérer les tokens FCM des autres membres du foyer
    const { data: members, error: membersError } = await supabaseAdmin
      .from("foyer_members")
      .select("id, display_name, user_id, fcm_token, notification_prefs")
      .eq("foyer_id", foyerId)
      .not("fcm_token", "is", null);

    if (membersError) {
      console.error("[Send-Push] Erreur lors de la récupération des membres :", membersError.message);
      return new Response(JSON.stringify({ error: membersError.message }), { status: 500 });
    }

    // Filtrer pour ne pas l'envoyer à l'expéditeur
    const rawTargetTokens = members
      .filter(m => {
        if (!m.fcm_token) return false;
        if (senderId && String(m.id) === String(senderId)) return false;
        if (senderUserId && String(m.user_id) === String(senderUserId)) return false;
        if (senderName && normalizeIdentity(m.display_name) === normalizeIdentity(senderName)) return false;
        if (!allowsModulePush(m, targetModule)) {
          console.log(`[Send-Push] Préférence utilisateur : module ${targetModule} désactivé pour ${m.display_name || m.id}.`);
          return false;
        }
        return true;
      })
      .filter(m => !String(m.fcm_token).startsWith("native-fallback-"))
      .map(m => String(m.fcm_token));
    const targetTokens = [...new Set(rawTargetTokens)];

    if (rawTargetTokens.length !== targetTokens.length) {
      console.log(
        `[Send-Push] Tokens dupliqués ignorés : ${rawTargetTokens.length} lignes -> ${targetTokens.length} token(s) unique(s).`
      );
    }

    if (targetTokens.length === 0) {
      console.log("[Send-Push] Aucun token destinataire actif trouvé.");
      return new Response(JSON.stringify({ message: "No recipients" }), { status: 200 });
    }

    // 3. Obtenir l'access token Google OAuth2 pour FCM v1
    const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
    if (!serviceAccountJson) {
      console.error("[Send-Push] Clé secrète FIREBASE_SERVICE_ACCOUNT_JSON manquante.");
      return new Response(JSON.stringify({ error: "Missing Firebase credentials env" }), { status: 500 });
    }

    const credentials = JSON.parse(serviceAccountJson);
    const token = await getGoogleAccessToken(credentials.client_email, credentials.private_key);
    const targetUrl = getTargetUrl(targetModule, record);
    const dedupKey = getNotificationDedupKey(payload.table, targetModule, record);

    // 4. Envoyer les requêtes HTTP vers FCM v1 pour chaque token
    const sendPromises = targetTokens.map(async (fcmToken) => {
      const fcmUrl = `https://fcm.googleapis.com/v1/projects/${firebaseProject}/messages:send`;
      
      const response = await fetch(fcmUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: {
            token: fcmToken,
            notification: { title, body },
            data: {
              click_action: targetUrl,
              module: targetModule,
              id: String(record.id || ""),
              groupId: String(record.group_id || ""),
              senderUserId: String(senderUserId || ""),
              senderMemberId: String(senderId || ""),
              senderName: String(senderName || ""),
              title,
              body
            },
            webpush: {
              headers: {
                Urgency: "high"
              },
              notification: {
                icon: "/icon-192x192.png",
                badge: "/favicon.svg",
                tag: dedupKey,
                renotify: true
              },
              fcm_options: {
                link: targetUrl
              }
            },
            apns: {
              headers: {
                "apns-priority": "10",
                "apns-push-type": "alert",
                "apns-collapse-id": dedupKey
              },
              payload: {
                aps: {
                  alert: { title, body },
                  sound: "default",
                  "thread-id": targetModule || "mafamille"
                }
              }
            },
            android: {
              priority: "high",
              notification: {
                sound: "default"
              }
            }
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Send-Push] Échec d'envoi pour token ${fcmToken.substring(0, 10)}... :`, errorText);
        if (
          errorText.includes("UNREGISTERED") ||
          errorText.includes("registration-token-not-registered") ||
          errorText.includes("Requested entity was not found")
        ) {
          await clearInvalidFcmToken(fcmToken);
        }
      } else {
        console.log(`[Send-Push] Push envoyé avec succès à ${fcmToken.substring(0, 10)}...`);
      }
    });

    await Promise.all(sendPromises);

    return new Response(JSON.stringify({ success: true, count: targetTokens.length }), { status: 200 });
  } catch (err) {
    console.error("[Send-Push] Erreur d'exécution :", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
