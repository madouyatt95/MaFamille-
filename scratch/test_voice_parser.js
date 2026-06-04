// Node.js test script for MaFamille+ Voice Assistant parsing rules
import assert from 'assert';

// 1. Mock constants and functions extracted from App.tsx
const DESTINATION_DICTIONARY = {
  'itlie': 'Italie',
  'italie': 'Italie',
  'espange': 'Espagne',
  'espagne': 'Espagne',
  'marroc': 'Maroc',
  'maroc': 'Maroc',
  'france': 'France',
  'sénégal': 'Sénégal',
  'senegal': 'Sénégal',
  'mali': 'Mali',
  "côte d'ivoire": "Côte d'Ivoire",
  "cote d'ivoire": "Côte d'Ivoire",
  "côte d’ivoire": "Côte d'Ivoire",
  'comores': 'Comores',
  'algérie': 'Algérie',
  'algerie': 'Algérie',
  'tunisie': 'Tunisie',
  'égypte': 'Égypte',
  'egypte': 'Égypte',
  'turquie': 'Turquie',
  'arabie saoudite': 'Arabie Saoudite',
  'émirats arabes unis': 'Émirats Arabes Unis',
  'emirats arabes unis': 'Émirats Arabes Unis',
  'portugal': 'Portugal',
  'allemagne': 'Allemagne',
  'belgique': 'Belgique',
  'suisse': 'Suisse',
  'canada': 'Canada',
  'états-unis': 'États-Unis',
  'etats-unis': 'États-Unis',
  'usa': 'États-Unis',
  'paris': 'Paris',
  'dakar': 'Dakar',
  'rose': 'Rome',
  'rome': 'Rome',
  'milan': 'Milan',
  'madrid': 'Madrid',
  'barcelone': 'Barcelone',
  'casablanca': 'Casablanca',
  'marrakech': 'Marrakech',
  'bamako': 'Bamako',
  'abidjan': 'Abidjan',
  'moroni': 'Moroni'
};

function normalizeDestination(dest) {
  let d = dest.trim();
  d = d.replace(/^(?:pour\s+l'|pour\s+la|pour\s+le|pour\s+les|pour\s+|dans\s+le|dans\s+la|dans\s+l'|dans\s+|au\s+|en\s+|à\s+|a\s+|vers\s+|le\s+|la\s+|les\s+|l')/i, '');
  d = d.replace(/^l'/i, '');
  return d.trim();
}

function correctSpelling(dest) {
  const normalized = dest.toLowerCase().trim();
  if (DESTINATION_DICTIONARY[normalized]) {
    return DESTINATION_DICTIONARY[normalized];
  }
  return dest.charAt(0).toUpperCase() + dest.slice(1);
}

function parseFrenchDate(input) {
  const months = {
    janvier: '01', fevrier: '02', février: '02', mars: '03', avril: '04', mai: '05', juin: '06',
    juillet: '07', aout: '08', août: '08', septembre: '09', octobre: '10', novembre: '11', decembre: '12', décembre: '12'
  };
  const lower = input.toLowerCase().trim();
  
  if (lower.includes("aujourd'hui")) {
    return new Date().toISOString().split('T')[0];
  }
  if (lower.includes("demain")) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }
  if (lower.includes("après-demain") || lower.includes("apres demain")) {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
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
  
  const numMatch = lower.match(/(\d+)[-/.](\d+)([-/.](\d+))?/);
  if (numMatch) {
    const day = numMatch[1].padStart(2, '0');
    const month = numMatch[2].padStart(2, '0');
    const year = numMatch[4] || String(new Date().getFullYear());
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month}-${day}`;
  }
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(lower)) {
    return lower;
  }
  
  const parsed = new Date(lower);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  
  return new Date().toISOString().split('T')[0];
}

const EXACT_VOICE_MAPPING = {
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

function parseBudgetTransaction(promptLower) {
  // Regex to extract amount and word after 'pour'
  const pourMatch = promptLower.match(/(?:^|\s)(\d+[\.,]?\d*)\s*(?:euros?|€|eur|dollars?|\$)?\s+pour\s+(?:le\s+|la\s+|l'\s+|les\s+)?([a-z0-9éèàùçâêîôûäëïöü\s-]+)/i);
  if (!pourMatch) return null;

  const amount = parseFloat(pourMatch[1].replace(',', '.'));
  const pourKeyword = pourMatch[2].trim();
  const cleanKwd = pourKeyword.toLowerCase().trim();
  const title = pourKeyword.charAt(0).toUpperCase() + pourKeyword.slice(1);

  let category = 'Autres';
  let subCategory = 'Divers';
  let moduleSource = 'budget';

  if (EXACT_VOICE_MAPPING[cleanKwd]) {
    const map = EXACT_VOICE_MAPPING[cleanKwd];
    category = map.category;
    subCategory = map.subCategory;
    moduleSource = map.moduleSource;
  }

  return {
    amount,
    title,
    category,
    subCategory,
    moduleSource
  };
}

// Mock sequential Trip creation missing fields checklist
function getTripMissingFields(ctx) {
  const missing = [];
  if (!ctx.destination) missing.push('destination');
  if (!ctx.startDate) missing.push('startDate');
  if (ctx.destination && ctx.startDate) {
    if (!ctx.endDate && !ctx.endDateAsked) missing.push('endDate');
    else if (!ctx.budget && !ctx.budgetAsked) missing.push('budget');
  }
  return missing;
}

const isSkipAnswer = (val) => {
  const norm = val.toLowerCase().trim();
  return norm === 'non' || 
         norm === 'non merci' || 
         norm === 'pas encore' || 
         norm === 'je ne sais pas' || 
         norm === 'plus tard' || 
         norm === 'sans' || 
         norm === 'aucune' || 
         norm === 'aucun';
};

// Test Runner
console.log('🧪 Lancement des tests unitaires complémentaires du parseur vocal...\n');

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

// -- BUDGET TESTS (POUR TRANSAC) --
const budgetTestCases = [
  { input: '20 pour le taxi', expected: { amount: 20, title: 'Taxi', category: 'Transport', subCategory: 'Taxi' } },
  { input: '12 pour Uber', expected: { amount: 12, title: 'Uber', category: 'Transport', subCategory: 'Uber' } },
  { input: '35 pour pharmacie', expected: { amount: 35, title: 'Pharmacie', category: 'Santé', subCategory: 'Pharmacie' } },
  { input: '40 pour internet', expected: { amount: 40, title: 'Internet', category: 'Logement', subCategory: 'Internet' } },
  { input: '84 pour Pass Navigo', expected: { amount: 84, title: 'Pass Navigo', category: 'Transport', subCategory: 'Pass Navigo' } },
  { input: '60 pour essence', expected: { amount: 60, title: 'Essence', category: 'Véhicules', subCategory: 'Carburant' } }
];

budgetTestCases.forEach(({ input, expected }) => {
  runTest(`Budget parser: "${input}"`, () => {
    const res = parseBudgetTransaction(input);
    assert.ok(res, 'Parser should find a transaction mapping');
    assert.strictEqual(res.amount, expected.amount, 'Amount mismatch');
    assert.strictEqual(res.title, expected.title, 'Title mismatch');
    assert.strictEqual(res.category, expected.category, 'Category mismatch');
    assert.strictEqual(res.subCategory, expected.subCategory, 'SubCategory mismatch');
  });
});

// -- TRIP CONTEXT FLOW TESTS --
runTest('Trip context: Init with "Créer un voyage en Italie"', () => {
  const ctx = { pendingAction: 'create_trip', destination: 'Italie' };
  const missing = getTripMissingFields(ctx);
  // startDate should be missing, destination is populated
  assert.deepStrictEqual(missing, ['startDate']);
});

runTest('Trip context: Fill startDate "15 juillet"', () => {
  const ctx = { pendingAction: 'create_trip', destination: 'Italie', startDate: parseFrenchDate('15 juillet') };
  const missing = getTripMissingFields(ctx);
  // endDate is now missing (since endDateAsked is not set)
  assert.deepStrictEqual(missing, ['endDate']);
});

runTest('Trip context: Skip endDate via "non"', () => {
  const ctx = { 
    pendingAction: 'create_trip', 
    destination: 'Italie', 
    startDate: parseFrenchDate('15 juillet'),
    endDate: 'Non planifié',
    endDateAsked: true
  };
  const missing = getTripMissingFields(ctx);
  // budget is now missing
  assert.deepStrictEqual(missing, ['budget']);
});

runTest('Trip context: Fill budget "2000€"', () => {
  const ctx = { 
    pendingAction: 'create_trip', 
    destination: 'Italie', 
    startDate: parseFrenchDate('15 juillet'),
    endDate: 'Non planifié',
    endDateAsked: true,
    budget: 2000,
    budgetAsked: true
  };
  const missing = getTripMissingFields(ctx);
  // No more missing fields, creation allowed!
  assert.deepStrictEqual(missing, []);
});

runTest('Trip context: Skip budget via "non"', () => {
  const ctx = { 
    pendingAction: 'create_trip', 
    destination: 'Italie', 
    startDate: parseFrenchDate('15 juillet'),
    endDate: 'Non planifié',
    endDateAsked: true,
    budget: 0,
    budgetAsked: true
  };
  const missing = getTripMissingFields(ctx);
  // No more missing fields, creation allowed!
  assert.deepStrictEqual(missing, []);
});

console.log('\n--- 📊 BILAN DES TESTS COMPLÉMENTAIRES ---');
console.log(`✅ Succès : ${successCount}`);
console.log(`❌ Échecs : ${failCount}`);

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('\n🌟 Tous les nouveaux tests sont au vert !');
  process.exit(0);
}
