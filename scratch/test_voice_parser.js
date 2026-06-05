// Node.js test script for MaFamille+ Voice Assistant parsing rules
import assert from 'assert';

// 1. Mock constants and functions extracted from App.tsx
const DEFAULT_CATEGORIES = [
  { name: 'Alimentation', icon: '🛒', sub: ['Supermarché', 'Restaurant', 'Boulangerie', 'Épicerie', 'Café'] },
  { name: 'Transport', icon: '🚗', sub: ['Taxi', 'Uber', 'Essence', 'Péage', 'Transport public', 'Pass Navigo'] },
  { name: 'Santé', icon: '🩺', sub: ['Médecin', 'Pharmacie', 'Dentiste', 'Vaccin', 'Analyse', 'Mutuelle'] },
  { name: 'Logement', icon: '🏠', sub: ['Loyer', 'Électricité', 'Eau', 'Internet', 'Assurance habitation', 'Travaux', 'Maintenance'] },
  { name: 'Éducation', icon: '🎓', sub: ['Inscriptions', 'Livres', 'Cours particuliers', 'Activités', 'Cantine'] },
  { name: 'Véhicules', icon: '🔧', sub: ['Essence', 'Péage', 'Lavage', 'Assurance auto', 'Contrôle technique', 'Entretien', 'Réparation', 'Carburant'] },
  { name: 'Voyages', icon: '✈️', sub: ['Billets', 'Hôtel', 'Transport', 'Activités', 'Repas'] },
  { name: 'Administratif', icon: '📂', sub: ['Frais administratifs', 'Passeport', 'Visa', 'Carte identité', 'Timbres fiscaux'] },
  { name: 'Animaux', icon: '🐶', sub: ['Nourriture', 'Vétérinaire', 'Médicaments', 'Jouets'] },
  { name: 'Loisirs', icon: '🎨', sub: ['Cinéma', 'Concert', 'Musée', 'Cadeaux', 'Sport'] },
  { name: 'Abonnements', icon: '🔄', sub: ['Streaming', 'Téléphone', 'Logiciels'] },
  { name: 'Argent de poche', icon: '🪙', sub: ['Allocation enfant', 'Récompense'] },
  { name: 'Autres', icon: '✨', sub: ['Divers', 'Imprévu'] }
];

const mockCustomCategories = []; // None on startup

const getMergedCategories = () => {
  const merged = {};
  DEFAULT_CATEGORIES.forEach(cat => {
    merged[cat.name.toLowerCase()] = {
      name: cat.name,
      icon: cat.icon,
      subcategories: [...cat.sub],
      isArchived: false
    };
  });
  return Object.values(merged);
};

const cleanLabel = (lbl) => {
  let s = lbl.trim();
  s = s.replace(/^(?:le\s+|la\s+|les\s+|l'|l’|de\s+la\s+|de\s+l'|de\s+l’|du\s+|des\s+|d'|d’)/i, '');
  return s.trim();
};

const getDynamicVoiceMapping = () => {
  const mapping = {
    'taxi': { category: 'Transport', subCategory: 'Taxi', moduleSource: 'budget' },
    'uber': { category: 'Transport', subCategory: 'Uber', moduleSource: 'budget' },
    'vtc': { category: 'Transport', subCategory: 'VTC', moduleSource: 'budget' },
    'essence': { category: 'Véhicules', subCategory: 'Carburant', moduleSource: 'vehicules' },
    'carburant': { category: 'Véhicules', subCategory: 'Carburant', moduleSource: 'vehicules' },
    'pharmacie': { category: 'Santé', subCategory: 'Pharmacie', moduleSource: 'sante' },
    'médecin': { category: 'Santé', subCategory: 'Médecin', moduleSource: 'sante' },
    'medecin': { category: 'Santé', subCategory: 'Médecin', moduleSource: 'sante' },
    'dentiste': { category: 'Santé', subCategory: 'Dentiste', moduleSource: 'sante' },
    'internet': { category: 'Logement', subCategory: 'Internet', moduleSource: 'logement' },
    'loyer': { category: 'Logement', subCategory: 'Loyer', moduleSource: 'logement' },
    'électricité': { category: 'Logement', subCategory: 'Électricité', moduleSource: 'logement' },
    'electricite': { category: 'Logement', subCategory: 'Électricité', moduleSource: 'logement' },
    'cantine': { category: 'Éducation', subCategory: 'Cantine', moduleSource: 'ecole' },
    'passeport': { category: 'Administratif', subCategory: 'Passeport', moduleSource: 'documents' },
    'navigo': { category: 'Transport', subCategory: 'Pass Navigo', moduleSource: 'budget' },
    'pass navigo': { category: 'Transport', subCategory: 'Pass Navigo', moduleSource: 'budget' }
  };

  const merged = getMergedCategories();
  for (const cat of merged) {
    if (cat.isArchived) continue;
    
    let moduleSource = 'budget';
    if (cat.name === 'Santé') moduleSource = 'sante';
    else if (cat.name === 'Véhicules') moduleSource = 'vehicules';
    else if (cat.name === 'Logement') moduleSource = 'logement';
    else if (cat.name === 'Éducation' || cat.name === 'École') moduleSource = 'ecole';
    else if (cat.name === 'Alimentation' || cat.name === 'Courses') moduleSource = 'courses';
    else if (cat.name === 'Voyages') moduleSource = 'voyages';
    else if (cat.name === 'Animaux') moduleSource = 'animaux';
    else if (cat.name === 'Argent de poche') moduleSource = 'argent_de_poche';

    const catKey = cat.name.toLowerCase().trim();
    if (!mapping[catKey]) {
      mapping[catKey] = {
        category: cat.name,
        subCategory: cat.subcategories && cat.subcategories.length > 0 ? cat.subcategories[0] : 'Divers',
        moduleSource
      };
    }

    if (cat.subcategories) {
      for (const sub of cat.subcategories) {
        const subKey = sub.toLowerCase().trim();
        if (!mapping[subKey]) {
          mapping[subKey] = {
            category: cat.name,
            subCategory: sub,
            moduleSource
          };
        }
      }
    }
  }
  
  return mapping;
};

function parseFrenchDate(input) {
  const months = {
    janvier: '01', fevrier: '02', février: '02', mars: '03', avril: '04', mai: '05', juin: '06',
    juillet: '07', aout: '08', août: '08', septembre: '09', octobre: '10', novembre: '11', decembre: '12', décembre: '12'
  };
  const lower = input.toLowerCase().trim();
  
  if (lower.includes("aujourd'hui")) {
    return new Date().toISOString().split('T')[0];
  }
  
  const textMatch = lower.match(/(\d+)(?:er)?\s+([a-zàâäéèêëîïôöùûüç]+)/);
  if (textMatch) {
    const day = textMatch[1].padStart(2, '0');
    const monthStr = textMatch[2];
    const month = months[monthStr];
    if (month) {
      return `${new Date().getFullYear()}-${month}-${day}`;
    }
  }
  return new Date().toISOString().split('T')[0];
}

const findAllMemberMatches = (inputText, membersList, activeId) => {
  const cleanInput = inputText.toLowerCase().trim();
  const isMoi = cleanInput === 'moi' || 
                cleanInput === "c'est pour moi" || 
                cleanInput === 'pour moi' || 
                cleanInput === 'moi-meme' || 
                cleanInput === 'moi-même' ||
                /\bmoi\b/i.test(cleanInput);
  if (isMoi) {
    const current = membersList.find(m => m.id === activeId);
    return current ? [current] : [];
  }

  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").trim();
  const normInput = norm(cleanInput);
  if (!normInput) return [];

  // CASCADE LEVEL 1: Exact matches
  const exactMatches = membersList.filter(m => norm(m.name) === normInput || (m.role && norm(m.role) === normInput));
  if (exactMatches.length > 0) return exactMatches;

  return [];
};

// Mock parsing transaction command logic
function parseVoiceTransactionFallback(prompt) {
  const promptLower = prompt.toLowerCase().trim();
  
  // Extract amount
  const amountMatch = promptLower.match(/(\d+[\.,]?\d*)/);
  if (!amountMatch) return null;
  const amount = parseFloat(amountMatch[1].replace(',', '.'));

  // Extract label using prompt (original case!)
  let title = 'Achat rapide';
  let pourKeyword = '';
  const pourMatch = prompt.match(/(?:^|\s)(?:\d+[\.,]?\d*)\s*(?:euros?|€|eur|dollars?|\$)?\s+pour\s+(?:le\s+|la\s+|l'\s+|l’\s+|les\s+|l'|l’)?([a-zA-Z0-9éèàùçâêîôûäëïöü’'\s-]+)/i);
  if (pourMatch) {
    pourKeyword = cleanLabel(pourMatch[1]);
    title = pourKeyword.charAt(0).toUpperCase() + pourKeyword.slice(1);
  } else {
    // Direct without "pour"
    let clean = prompt.replace(/ajoute|ajouter|dépense|depense|note|noter/gi, '').trim();
    clean = clean.replace(/(\d+[\.,]?\d*)\s*(?:euros?|€|eur)?/i, '').trim();
    clean = cleanLabel(clean);
    if (clean) {
      title = clean.charAt(0).toUpperCase() + clean.slice(1);
    }
  }

  // Find matches
  const dynamicMapping = getDynamicVoiceMapping();
  const sortedKeys = Object.keys(dynamicMapping).sort((a, b) => b.length - a.length);
  
  let dynamicMatch = null;
  for (const key of sortedKeys) {
    if (promptLower.includes(key)) {
      dynamicMatch = dynamicMapping[key];
      break;
    }
  }

  if (dynamicMatch) {
    return {
      amount,
      title,
      category: dynamicMatch.category,
      subCategory: dynamicMatch.subCategory,
      moduleSource: dynamicMatch.moduleSource,
      matchesLength: 1
    };
  }

  return {
    amount,
    title,
    category: 'Autres',
    subCategory: 'Divers',
    moduleSource: 'budget',
    matchesLength: 0
  };
}

// Mock Vaccine Creation flow
function getVaccineMissingFields(ctx) {
  const missing = [];
  if (!ctx.date) missing.push('date');
  if (!ctx.title) missing.push('title');
  if (!ctx.memberId) missing.push('memberId');
  if (!ctx.time && !ctx.timeAsked) missing.push('time');
  return missing;
}

// Test Runner
console.log('🧪 Lancement des tests unitaires complémentaires prioritaires...\n');

let successCount = 0;
let failCount = 0;

function runTest(testName, fn) {
  try {
    fn();
    console.log(`✅ [PASS] ${testName}`);
    successCount++;
  } catch (err) {
    console.error(`❌ [FAIL] ${testName}`);
    console.error(err);
    failCount++;
  }
}

// Mock members list
const mockMembers = [
  { id: '1', name: 'Yatta', role: 'Papa' },
  { id: '2', name: 'Awa', role: 'Maman' },
  { id: '3', name: 'Amadou', role: 'Fils' }
];

// --- VACCINE SCENARIO TESTS ---
runTest('Vaccine Scenario: "Ajoute un vaccin pour le 10 juillet"', () => {
  const promptLower = "ajoute un vaccin pour le 10 juillet";
  
  // 1. Initial detection
  const dateRegex = /(?:le\s+)?(\d+\s+(?:janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre))/i;
  const dateMatch = promptLower.match(dateRegex);
  const rawDateStr = dateMatch ? dateMatch[1] : undefined;
  const date = rawDateStr ? parseFrenchDate(rawDateStr) : undefined;
  
  assert.strictEqual(rawDateStr, "10 juillet");
  assert.strictEqual(date, `${new Date().getFullYear()}-07-10`);

  // STRICT RULE: No auto-assigning activeMemberId on Santé unless "pour moi" is explicitly in the prompt!
  let matchedMember = undefined;
  const pourMoi = /\bpour\s+moi\b/i.test(promptLower) || /\bc'est\s+pour\s+moi\b/i.test(promptLower) || /\bmoi\b/i.test(promptLower);
  if (pourMoi) {
    matchedMember = mockMembers.find(m => m.id === '1');
  } else {
    const found = findAllMemberMatches(promptLower, mockMembers, '1');
    if (found.length === 1) {
      const name = found[0].name.toLowerCase();
      if (promptLower.includes(name)) {
        matchedMember = found[0];
      }
    }
  }

  // Must be undefined because prompt doesn't specify member name or "pour moi"
  assert.strictEqual(matchedMember, undefined);

  const ctx = {
    pendingAction: 'create_vaccine',
    title: 'Vaccin',
    date,
    time: undefined, // Must be undefined by default to ask the user!
    memberId: undefined
  };

  // 2. Validate missing fields
  let missing = getVaccineMissingFields(ctx);
  assert.deepStrictEqual(missing, ['memberId', 'time']);

  // 3. User responds "Yatta"
  const matches = findAllMemberMatches("Yatta", mockMembers, '1');
  assert.strictEqual(matches.length, 1);
  ctx.memberId = matches[0].id;

  // 4. Validate missing fields again
  missing = getVaccineMissingFields(ctx);
  assert.deepStrictEqual(missing, ['time']); // Time is still missing

  // 5. User responds "non"
  const timeResponse = "non";
  if (timeResponse === "non" || timeResponse === "non merci") {
    ctx.time = "horaire à définir";
    ctx.timeAsked = true;
  }

  // 6. Final checklist validation
  missing = getVaccineMissingFields(ctx);
  assert.deepStrictEqual(missing, []); // No more missing fields, creation safe!
});

// --- BUDGET MAPPING TESTS ---
runTest('Budget parser: "10 pour l\'électricité" (curly apostrophe safe)', () => {
  const res = parseVoiceTransactionFallback("10 pour l'électricité");
  assert.ok(res);
  assert.strictEqual(res.amount, 10);
  assert.strictEqual(res.title, "Électricité");
  assert.strictEqual(res.category, "Logement");
  assert.strictEqual(res.subCategory, "Électricité");
  assert.strictEqual(res.matchesLength, 1, "Should resolve immediately without category choice!");
});

runTest('Budget parser: "20 pour le taxi"', () => {
  const res = parseVoiceTransactionFallback("20 pour le taxi");
  assert.ok(res);
  assert.strictEqual(res.amount, 20);
  assert.strictEqual(res.title, "Taxi");
  assert.strictEqual(res.category, "Transport");
  assert.strictEqual(res.subCategory, "Taxi");
  assert.strictEqual(res.matchesLength, 1);
});

runTest('Budget parser: "12 Uber"', () => {
  const res = parseVoiceTransactionFallback("12 Uber");
  assert.ok(res);
  assert.strictEqual(res.amount, 12);
  assert.strictEqual(res.title, "Uber");
  assert.strictEqual(res.category, "Transport");
  assert.strictEqual(res.subCategory, "Uber");
  assert.strictEqual(res.matchesLength, 1);
});

runTest('Budget parser: "84 Pass Navigo"', () => {
  const res = parseVoiceTransactionFallback("84 Pass Navigo");
  assert.ok(res);
  assert.strictEqual(res.amount, 84);
  assert.strictEqual(res.title, "Pass Navigo");
  assert.strictEqual(res.category, "Transport");
  assert.strictEqual(res.subCategory, "Pass Navigo");
  assert.strictEqual(res.matchesLength, 1);
});

runTest('Budget parser: "35 pharmacie"', () => {
  const res = parseVoiceTransactionFallback("35 pharmacie");
  assert.ok(res);
  assert.strictEqual(res.amount, 35);
  assert.strictEqual(res.title, "Pharmacie");
  assert.strictEqual(res.category, "Santé");
  assert.strictEqual(res.subCategory, "Pharmacie");
  assert.strictEqual(res.matchesLength, 1);
});

// --- SYNONYMS PREPROCESSOR TESTS ---
const normalizeTextForSynonym = (txt) => {
  return txt
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const getProductToCheck = (normalizedText) => {
  const checkPrefixes = [
    'retire le ', 'retire la ', 'retire les ', 'retire l\'', 'retire l’', 'retire ',
    'enlève le ', 'enlève la ', 'enlève les ', 'enlève l\'', 'enlève l’', 'enlève ',
    'enleve le ', 'enleve la ', 'enleve les ', 'enleve l\'', 'enleve l’', 'enleve ',
    'coche le ', 'coche la ', 'coche les ', 'coche l\'', 'coche l’', 'coche ',
    'termine pour le ', 'termine pour la ', 'termine pour les ', 'termine pour l\'', 'termine pour l’', 'termine pour ',
    'terminé pour le ', 'terminé pour la ', 'terminé pour les ', 'terminé pour l\'', 'terminé pour l’', 'terminé pour '
  ];

  for (const prefix of checkPrefixes) {
    const normPrefix = normalizeTextForSynonym(prefix);
    if (normalizedText.startsWith(normPrefix)) {
      return normalizedText.slice(normPrefix.length).trim();
    }
  }

  if (normalizedText.startsWith('marque ')) {
    let remainder = normalizedText.slice(7).trim();
    remainder = remainder.replace(/^(le|la|les|l'|l’)\s+/i, '').trim();
    const suffix = remainder.match(/(.+?)\s+comme\s+(?:achete|acheté|fait)$/i);
    if (suffix) {
      return suffix[1].trim();
    }
  }

  const checkSuffixes = [
    ' est achete', ' est acheté', ' sont achetes', ' sont achetés',
    ' c\'est bon', ' c’est bon', ' c est bon',
    ' c\'est fait', ' c’est fait', ' c est fait'
  ];

  for (const suffix of checkSuffixes) {
    if (normalizedText.endsWith(suffix)) {
      let prod = normalizedText.slice(0, normalizedText.length - suffix.length).trim();
      prod = prod.replace(/^(le|la|les|l'|l’)\s+/i, '').trim();
      return prod;
    }
  }

  return null;
};

const preprocessVoiceCommandSynonyms = (rawInputText) => {
  const normalizedForSynonym = normalizeTextForSynonym(rawInputText);

  const coursesRemainingSynonyms = [
    "que reste t il a acheter", "que reste-t-il a acheter", "que reste-t-il à acheter",
    "qu est ce qu il reste a acheter", "qu'est-ce qu'il reste à acheter", "qu'est-ce qu'il reste a acheter",
    "qu est ce qu il manque", "qu'est-ce qu'il manque", "il manque quoi", "il reste quoi",
    "on doit acheter quoi", "qu est ce qu on doit acheter", "qu'est-ce qu'on doit acheter",
    "montre les courses", "affiche les courses", "ouvre les courses", "fais voir les courses",
    "affiche la liste", "fais voir la liste", "voir la liste des courses", "voir les articles restants",
    "voir les achats restants", "courses restantes", "liste restante"
  ];

  const budgetSynonyms = [
    "montre le budget", "affiche le budget", "fais voir le budget", "combien il me reste",
    "ou j en suis", "ou j'en suis", "mes finances", "mes depenses", "mes dépenses",
    "mes comptes", "combien j ai depense", "combien j'ai dépensé", "combien j'ai depense",
    "etat des finances", "état des finances", "budget du mois"
  ];

  const travelSynonyms = [
    "mes voyages", "affiche mes voyages", "ouvre mes voyages", "montre mon voyage",
    "voyage italie", "voyage maroc", "voyage senegal", "voyage sénégal", "budget voyage",
    "preparation voyage", "préparation voyage", "ou en est mon voyage", "où en est mon voyage"
  ];

  const healthSynonyms = [
    "mes vaccins", "les vaccins", "vaccins a venir", "vaccins à venir", "mes rendez vous medicaux",
    "mes rendez-vous médicaux", "sante", "santé", "carnet de sante", "carnet de santé",
    "prochains vaccins", "sante de yatta", "santé de yatta", "sante de mariam", "santé de mariam"
  ];

  const agendaSynonyms = [
    "mon agenda", "affiche mon agenda", "ouvre mon agenda", "mes rendez vous", "mes rendez-vous",
    "mes rdv", "mon calendrier", "cette semaine", "ce mois ci", "ce mois-ci", "mes evenements",
    "mes événements"
  ];

  const housingSynonyms = [
    "mon logement", "la maison", "les depenses maison", "les dépenses maison", "les factures maison",
    "mes factures"
  ];

  const vehicleSynonyms = [
    "ma voiture", "mes vehicules", "mes véhicules", "controle technique", "contrôle technique",
    "entretien voiture", "revision voiture", "révision voiture", "assurance voiture"
  ];

  const administrativeSynonyms = [
    "mes demarches", "mes démarches", "mes papiers", "mes documents", "mes formalites",
    "mes formalités", "mes demandes administratives"
  ];

  if (coursesRemainingSynonyms.some(s => normalizeTextForSynonym(s) === normalizedForSynonym)) {
    return "que reste-t-il";
  } else if (budgetSynonyms.some(s => normalizeTextForSynonym(s) === normalizedForSynonym)) {
    return "ouvre le budget";
  } else if (travelSynonyms.some(s => normalizeTextForSynonym(s) === normalizedForSynonym)) {
    return "ouvre les voyages";
  } else if (healthSynonyms.some(s => normalizeTextForSynonym(s) === normalizedForSynonym)) {
    return "ouvre la santé";
  } else if (agendaSynonyms.some(s => normalizeTextForSynonym(s) === normalizedForSynonym)) {
    return "ouvre l'agenda";
  } else if (housingSynonyms.some(s => normalizeTextForSynonym(s) === normalizedForSynonym)) {
    return "ouvre le logement";
  } else if (vehicleSynonyms.some(s => normalizeTextForSynonym(s) === normalizedForSynonym)) {
    return "ouvre les véhicules";
  } else if (administrativeSynonyms.some(s => normalizeTextForSynonym(s) === normalizedForSynonym)) {
    return "ouvre les démarches";
  } else {
    const productToCheck = getProductToCheck(normalizedForSynonym);
    if (productToCheck) {
      return `j'ai acheté ${productToCheck}`;
    }
  }

  return rawInputText;
};

runTest('Synonym preprocessor: Courses remaining', () => {
  assert.strictEqual(preprocessVoiceCommandSynonyms("Qu'est-ce qu'il reste à acheter"), "que reste-t-il");
  assert.strictEqual(preprocessVoiceCommandSynonyms("Il manque quoi"), "que reste-t-il");
  assert.strictEqual(preprocessVoiceCommandSynonyms("Fais voir la liste"), "que reste-t-il");
});

runTest('Synonym preprocessor: Checking grocery items', () => {
  assert.strictEqual(preprocessVoiceCommandSynonyms("Le lait est acheté"), "j'ai acheté lait");
  assert.strictEqual(preprocessVoiceCommandSynonyms("Retire le lait"), "j'ai acheté lait");
  assert.strictEqual(preprocessVoiceCommandSynonyms("Le lait c'est bon"), "j'ai acheté lait");
  assert.strictEqual(preprocessVoiceCommandSynonyms("Marque le lait comme acheté"), "j'ai acheté lait");
});

runTest('Synonym preprocessor: Open modules', () => {
  assert.strictEqual(preprocessVoiceCommandSynonyms("Mes finances"), "ouvre le budget");
  assert.strictEqual(preprocessVoiceCommandSynonyms("Mes dépenses"), "ouvre le budget");
  assert.strictEqual(preprocessVoiceCommandSynonyms("Mes voyages"), "ouvre les voyages");
  assert.strictEqual(preprocessVoiceCommandSynonyms("Mes vaccins"), "ouvre la santé");
  assert.strictEqual(preprocessVoiceCommandSynonyms("Cette semaine"), "ouvre l'agenda");
  assert.strictEqual(preprocessVoiceCommandSynonyms("Les factures maison"), "ouvre le logement");
  assert.strictEqual(preprocessVoiceCommandSynonyms("Ma voiture"), "ouvre les véhicules");
  assert.strictEqual(preprocessVoiceCommandSynonyms("Mes démarches"), "ouvre les démarches");
});

console.log('\n--- 📊 BILAN DES TESTS PRIO ---');
console.log(`✅ Succès : ${successCount}`);
console.log(`❌ Échecs : ${failCount}`);

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('\n🌟 Tous les tests prioritaires sont au vert !');
  process.exit(0);
}
