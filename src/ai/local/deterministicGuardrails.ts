import type { LocalAiCapabilityPack } from './capabilityCatalog.ts';

export type LocalAiGuardrailDecision = {
  reason: string;
  response: string;
};

type GuardrailRule = {
  modules: LocalAiCapabilityPack['module'][];
  pattern: RegExp;
  reason: string;
  response: string;
};

const GUARDRAIL_RULES: GuardrailRule[] = [
  {
    modules: ['peacemaker'],
    pattern: /\b(menac|frapp|viol|agress|arme|danger|tuer|securite|sécurité)\w*/i,
    reason: 'danger_physique',
    response: 'Ta sécurité passe avant toute médiation. Éloigne-toi si possible, contacte immédiatement une personne de confiance ou les services d’urgence de ton pays. Je ne proposerai pas de compromis dans une situation de menace ou de violence.'
  },
  {
    modules: ['sante'],
    pattern: /\b(dose|dosage|diagnostic|prescri|ordonnance|\d+\s*mg|quel medicament|quel médicament)\w*/i,
    reason: 'conseil_medical',
    response: 'Je ne peux pas établir de diagnostic, choisir un médicament ni indiquer un dosage. Contacte un professionnel de santé ou les urgences si la situation te paraît grave.'
  },
  {
    modules: ['animaux'],
    pattern: /\b(dose|dosage|diagnostic|medicament humain|médicament humain|\d+\s*mg)\w*/i,
    reason: 'conseil_veterinaire',
    response: 'Je ne peux pas diagnostiquer un animal ni indiquer un dosage. Contacte un vétérinaire, et un service d’urgence vétérinaire si son état est préoccupant.'
  },
  {
    modules: ['carte_familiale'],
    pattern: /\b(suis|suivre|localise|localiser|ou se trouve|où se trouve|position masquee|position masquée)\b/i,
    reason: 'localisation_privee',
    response: 'Je ne peux pas suivre une personne ni révéler une localisation masquée. La personne concernée doit choisir elle-même de partager sa position.'
  },
  {
    modules: ['ecole'],
    pattern: /\b(reponses finales|réponses finales|fais mon devoir|controle note|contrôle noté|triche)\b/i,
    reason: 'travail_scolaire_note',
    response: 'Je ne donne pas les réponses finales d’un travail noté. Je peux expliquer la méthode, proposer un premier indice, puis vérifier chaque étape avec l’élève.'
  },
  {
    modules: ['documents'],
    pattern: /\b(envoie|envoyer|partage|partager|televerse|téléverse|publie|publier)\b/i,
    reason: 'transmission_document',
    response: 'Je ne peux ni transmettre, ni publier, ni téléverser un document. Je peux seulement proposer localement une catégorie ou résumer les métadonnées fournies.'
  },
  {
    modules: ['budget'],
    pattern: /\b(fais|effectue|lance)\s+(un\s+)?(paiement|virement|achat)|\binvestis\b/i,
    reason: 'operation_financiere',
    response: 'Je ne peux pas effectuer un paiement, un virement ou un investissement. Je peux uniquement préparer une proposition à confirmer ou résumer des montants fournis.'
  },
  {
    modules: ['demarches'],
    pattern: /\b(soumets|soumettre|envoie le dossier|conseil juridique certain|garantis)\b/i,
    reason: 'demarche_externe',
    response: 'Je ne peux pas soumettre une démarche ni garantir un conseil juridique. Je peux préparer une checklist et indiquer les informations qui restent à vérifier.'
  },
  {
    modules: ['repertoire_important'],
    pattern: /\b(appelle|appeler|envoie un message|contacte automatiquement)\b/i,
    reason: 'communication_externe',
    response: 'Je ne peux pas appeler ni envoyer un message à ta place. Je peux seulement ouvrir le répertoire ou t’aider à retrouver le contact demandé.'
  }
];

const noneAction = (clarification: string) => JSON.stringify({
  actions: [{ type: 'none', payload: {}, requiresConfirmation: true }],
  clarification
});

export function evaluateDeterministicGuardrail(
  pack: LocalAiCapabilityPack,
  prompt: string,
  structured: boolean
): LocalAiGuardrailDecision | null {
  if (pack.mode === 'excluded') {
    const response = 'Ce module ne propose aucune assistance IA.';
    return {
      reason: 'module_exclu',
      response: structured ? noneAction(response) : response
    };
  }

  const rule = GUARDRAIL_RULES.find(candidate =>
    candidate.modules.includes(pack.module) && candidate.pattern.test(prompt)
  );
  if (!rule) return null;

  return {
    reason: rule.reason,
    response: structured ? noneAction(rule.response) : rule.response
  };
}
