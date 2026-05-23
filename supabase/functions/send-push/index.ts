import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { GoogleAuth } from "https://deno.land/x/google_deno_auth@v0.1.1/mod.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const firebaseProject = "mafamilleplus";

// Initialisation du client admin de Supabase (pour bypasser les politiques RLS lors de la récupération des tokens)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  try {
    const payload = await req.json();
    console.log("[Send-Push] Webhook reçu pour table :", payload.table, "| Type :", payload.type);

    if (payload.type !== "INSERT") {
      return new Response(JSON.stringify({ message: "Ignored non-INSERT events" }), { status: 200 });
    }

    const record = payload.record;
    const foyerId = record.foyer_id;
    if (!foyerId) {
      return new Response(JSON.stringify({ error: "No foyer_id found in record" }), { status: 400 });
    }

    // 1. Déterminer le titre et le corps de la notification
    let title = "Nouveau message";
    let body = "";
    let senderId = "";

    if (payload.table === "chat_messages") {
      senderId = record.sender_id;
      title = `${record.sender_name || "Un membre"} dans le Chat`;
      body = record.text || (record.type === "image" ? "📷 Image partagée" : "Message vocal 🎙️");
    } else if (payload.table === "alerts") {
      title = record.title || "Alerte de Famille";
      body = record.description || "";
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
    const auth = new GoogleAuth({
      scope: ["https://www.googleapis.com/auth/firebase.messaging"],
      credentials
    });
    
    const token = await auth.getAccessToken();

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
              module: payload.table === "chat_messages" ? "chat" : record.module || "other",
              id: record.id
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
