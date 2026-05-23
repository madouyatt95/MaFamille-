/**
 * Test de validation unitaire pour le formatage des notifications de l'Edge Function.
 * Ce script valide toutes les règles métier appliquées par la fonction send-push
 * sur les tables de l'application MaFamille+ face aux webhooks Supabase.
 */

const assert = require('assert').strict;

// Simulation de la fonction métier contenue dans l'Edge Function Deno
function formatNotification(payload) {
  const { table, type, record, old_record: oldRecord } = payload;

  if (type !== "INSERT" && type !== "UPDATE") {
    return { error: "Ignored non-INSERT/UPDATE events" };
  }

  let title = "";
  let body = "";
  let targetModule = "other";

  if (table === "chat_messages") {
    if (type !== "INSERT") {
      return { error: "Ignored UPDATE for chat_messages" };
    }
    title = `${record.sender_name || "Un membre"} dans le Chat`;
    if (record.type === "image") {
      body = "📷 Image partagée";
    } else if (record.type === "voice") {
      body = "🎤 Message vocal";
    } else {
      body = record.content || "";
    }
    targetModule = "messagerie";
  } else if (table === "alerts") {
    if (type !== "INSERT") {
      return { error: "Ignored UPDATE for alerts" };
    }
    title = record.title || "Alerte de Famille";
    body = record.description || "";
    targetModule = record.module || "other";
  } else if (table === "memories") {
    if (type !== "INSERT") {
      return { error: "Ignored UPDATE for memories" };
    }
    title = `✨ Nouveau souvenir de ${record.author_name || "la famille"}`;
    body = record.title || "";
    targetModule = "capsule";
  } else if (table === "events") {
    targetModule = "agenda";
    if (type === "INSERT") {
      title = `📅 Nouvel événement : ${record.title}`;
      body = `${record.date_time || ""} ${record.time || ""}`.trim();
      if (record.location) body += ` @ ${record.location}`;
    } else if (type === "UPDATE") {
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
        return { error: "No significant changes on event" };
      }
    }
  } else if (table === "chore_tasks") {
    targetModule = "taches";
    if (type === "INSERT") {
      title = `🧹 Nouvelle tâche : ${record.title}`;
      body = `Assignée à : ${record.assigned_member_name || "Tous"} (${record.reward_points || 0} pts)`;
    } else if (type === "UPDATE") {
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
        return { error: "No significant changes on chore task" };
      }
    }
  } else if (table === "votes") {
    if (type !== "INSERT") {
      return { error: "Ignored UPDATE for votes" };
    }
    title = `🗳️ Conseil de famille : Nouveau Vote !`;
    body = record.question || "";
    targetModule = "conseil";
  } else if (table === "groceries") {
    targetModule = "courses";
    if (type === "INSERT") {
      title = `🛒 Liste de courses : Nouvel article`;
      body = `"${record.name}" (${record.quantity || "1"}) a été ajouté par ${record.added_by || "un membre"}.`;
    } else if (type === "UPDATE") {
      const checkedChanged = oldRecord?.checked !== record.checked;
      if (checkedChanged && record.checked) {
        title = `🛒 Courses en cours`;
        body = `L'article "${record.name}" a été acheté !`;
      } else {
        return { error: "No significant changes on grocery item" };
      }
    }
  } else {
    return { error: "Table not supported for push" };
  }

  return { title, body, targetModule };
}

// Suite de Tests
console.log("🧪 Lancement des tests de formatage FCM...");

// 1. Messages du Chat
const chatMsgRes = formatNotification({
  table: "chat_messages",
  type: "INSERT",
  record: { sender_name: "Papa", type: "text", content: "Salut la famille !" }
});
assert.strictEqual(chatMsgRes.title, "Papa dans le Chat");
assert.strictEqual(chatMsgRes.body, "Salut la famille !");
assert.strictEqual(chatMsgRes.targetModule, "messagerie");

const chatMsgVoiceRes = formatNotification({
  table: "chat_messages",
  type: "INSERT",
  record: { sender_name: "Papa", type: "voice" }
});
assert.strictEqual(chatMsgVoiceRes.body, "🎤 Message vocal");

// 2. Souvenirs
const memoryRes = formatNotification({
  table: "memories",
  type: "INSERT",
  record: { author_name: "Amadou", title: "Anniversaire de maman 🎂" }
});
assert.strictEqual(memoryRes.title, "✨ Nouveau souvenir de Amadou");
assert.strictEqual(memoryRes.body, "Anniversaire de maman 🎂");
assert.strictEqual(memoryRes.targetModule, "capsule");

// 3. Événements Agenda (Insertion)
const eventInsertRes = formatNotification({
  table: "events",
  type: "INSERT",
  record: { title: "RDV Pédiatre", date_time: "2026-05-24", time: "10:30", location: "Cabinet Médical" }
});
assert.strictEqual(eventInsertRes.title, "📅 Nouvel événement : RDV Pédiatre");
assert.strictEqual(eventInsertRes.body, "2026-05-24 10:30 @ Cabinet Médical");
assert.strictEqual(eventInsertRes.targetModule, "agenda");

// Événements Agenda (Terminé)
const eventUpdateDoneRes = formatNotification({
  table: "events",
  type: "UPDATE",
  record: { title: "RDV Pédiatre", done: true },
  old_record: { title: "RDV Pédiatre", done: false }
});
assert.strictEqual(eventUpdateDoneRes.title, "📅 Événement terminé");
assert.strictEqual(eventUpdateDoneRes.body, '"RDV Pédiatre" a été marqué comme fait.');

// 4. Tâches Ménagères (Attribution)
const taskInsertRes = formatNotification({
  table: "chore_tasks",
  type: "INSERT",
  record: { title: "Vider le lave-vaisselle", assigned_member_name: "Awa", reward_points: 50 }
});
assert.strictEqual(taskInsertRes.title, "🧹 Nouvelle tâche : Vider le lave-vaisselle");
assert.strictEqual(taskInsertRes.body, "Assignée à : Awa (50 pts)");

// Tâches Ménagères (Terminée par l'enfant)
const taskUpdateDoneRes = formatNotification({
  table: "chore_tasks",
  type: "UPDATE",
  record: { title: "Vider le lave-vaisselle", assigned_member_name: "Awa", done: true, validated_by_parent: false },
  old_record: { title: "Vider le lave-vaisselle", assigned_member_name: "Awa", done: false, validated_by_parent: false }
});
assert.strictEqual(taskUpdateDoneRes.title, "🧹 Tâche terminée : Vider le lave-vaisselle");
assert.strictEqual(taskUpdateDoneRes.body, "Terminée par Awa. En attente de validation parentale.");

// Tâches Ménagères (Validée par le parent)
const taskUpdateValidatedRes = formatNotification({
  table: "chore_tasks",
  type: "UPDATE",
  record: { title: "Vider le lave-vaisselle", done: true, validated_by_parent: true },
  old_record: { title: "Vider le lave-vaisselle", done: true, validated_by_parent: false }
});
assert.strictEqual(taskUpdateValidatedRes.title, "🧹 Tâche validée ! 🎉");
assert.strictEqual(taskUpdateValidatedRes.body, 'La tâche "Vider le lave-vaisselle" a été validée par un parent. Les points de récompense ont été attribués !');

// 5. Votes
const voteRes = formatNotification({
  table: "votes",
  type: "INSERT",
  record: { question: "Où va-t-on pour les vacances d'été ?" }
});
assert.strictEqual(voteRes.title, "🗳️ Conseil de famille : Nouveau Vote !");
assert.strictEqual(voteRes.body, "Où va-t-on pour les vacances d'été ?");
assert.strictEqual(voteRes.targetModule, "conseil");

// 6. Courses (Ajout)
const groceryInsertRes = formatNotification({
  table: "groceries",
  type: "INSERT",
  record: { name: "Lait", quantity: "2 packs", added_by: "Maman" }
});
assert.strictEqual(groceryInsertRes.title, "🛒 Liste de courses : Nouvel article");
assert.strictEqual(groceryInsertRes.body, '"Lait" (2 packs) a été ajouté par Maman.');

// Courses (Achat)
const groceryUpdateRes = formatNotification({
  table: "groceries",
  type: "UPDATE",
  record: { name: "Lait", checked: true },
  old_record: { name: "Lait", checked: false }
});
assert.strictEqual(groceryUpdateRes.title, "🛒 Courses en cours");
assert.strictEqual(groceryUpdateRes.body, "L'article \"Lait\" a été acheté !");

console.log("✅ TOUS LES TESTS DE VALIDATION ONT RÉUSSI AVEC SUCCÈS ! 💯");
