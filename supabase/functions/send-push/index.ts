import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const firebaseProject = "mafamilleplus";

// Initialisation du client admin de Supabase (pour bypasser les politiques RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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

    // 1. Déterminer le titre et le corps de la notification
    let title = "";
    let body = "";
    let senderId = "";
    let targetModule = "other";

    if (payload.table === "chat_messages") {
      if (payload.type !== "INSERT") {
        return new Response(JSON.stringify({ message: "Ignored UPDATE for chat_messages" }), { status: 200 });
      }
      senderId = record.sender_id;
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
      title = record.title || "Alerte de Famille";
      body = record.description || "";
      targetModule = record.module || "other";
    } else if (payload.table === "memories") {
      if (payload.type !== "INSERT") {
        return new Response(JSON.stringify({ message: "Ignored UPDATE for memories" }), { status: 200 });
      }
      title = `✨ Nouveau souvenir de ${record.author_name || "la famille"}`;
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
      if (payload.type === "INSERT") {
        title = `🛒 Liste de courses : Nouvel article`;
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
    } else {
      return new Response(JSON.stringify({ message: "Table not supported for push" }), { status: 200 });
    }

    // 2. Récupérer les tokens FCM des autres membres du foyer
    const { data: members, error: membersError } = await supabaseAdmin
      .from("foyer_members")
      .select("id, fcm_token")
      .eq("foyer_id", foyerId)
      .not("fcm_token", "is", null);

    if (membersError) {
      console.error("[Send-Push] Erreur lors de la récupération des membres :", membersError.message);
      return new Response(JSON.stringify({ error: membersError.message }), { status: 500 });
    }

    // Filtrer pour ne pas l'envoyer à l'expéditeur
    const targetTokens = members
      .filter(m => m.id !== senderId && m.fcm_token)
      .map(m => m.fcm_token);

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
              click_action: "/",
              module: targetModule,
              id: record.id,
              groupId: record.group_id || ""
            }
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Send-Push] Échec d'envoi pour token ${fcmToken.substring(0, 10)}... :`, errorText);
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
