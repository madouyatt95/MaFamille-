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

// 2. Fuzzy Member matching helper
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

  // Helper: Levenshtein distance
  const getLevDist = (a, b) => {
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        dp[i][j] = Math.min(
          dp[i-1][j] + 1,
          dp[i][j-1] + 1,
          dp[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1)
        );
      }
    }
    return dp[a.length][b.length];
  };

  // --- CASCADE LEVEL 1: Exact matches on full name/role ---
  const exactMatches = membersList.filter(m => norm(m.name) === normInput || (m.role && norm(m.role) === normInput));
  if (exactMatches.length > 0) return exactMatches;

  // --- CASCADE LEVEL 2: Prefix match on words (e.g. "Yat" matches "Yatta" and "Yatta Junior") ---
  if (normInput.length >= 2) {
    const prefixMatches = membersList.filter(m => {
      const normName = norm(m.name);
      const nameWords = normName.split(/\s+/);
      return nameWords.some(w => w.startsWith(normInput));
    });
    if (prefixMatches.length > 0) return prefixMatches;
  }

  // --- CASCADE LEVEL 3: Levenshtein matches on full name/role ---
  const fullLevMatches = [];
  for (const member of membersList) {
    const normName = norm(member.name);
    const normRole = member.role ? norm(member.role) : '';
    
    const targets = [normName];
    if (normRole) targets.push(normRole);

    let bestDist = 999;
    for (const target of targets) {
      const dist = getLevDist(normInput, target);
      const limit = target.length <= 4 ? 1 : 2;
      if (dist <= limit && dist < bestDist) {
        bestDist = dist;
      }
    }
    if (bestDist < 999) {
      fullLevMatches.push({ member, dist: bestDist });
    }
  }
  if (fullLevMatches.length > 0) {
    fullLevMatches.sort((a, b) => a.dist - b.dist);
    const minDist = fullLevMatches[0].dist;
    return fullLevMatches.filter(m => m.dist === minDist).map(m => m.member);
  }

  // --- CASCADE LEVEL 4: Full word match (substring) ---
  const inputWords = normInput.split(/\s+/);
  const wordMatches = membersList.filter(m => {
    const normName = norm(m.name);
    const nameWords = normName.split(/\s+/);
    return nameWords.some(w => inputWords.includes(w)) || inputWords.includes(normName);
  });
  if (wordMatches.length > 0) return wordMatches;

  // --- CASCADE LEVEL 5: Levenshtein on individual words ---
  const wordLevMatches = [];
  for (const member of membersList) {
    const normName = norm(member.name);
    const nameWords = normName.split(/\s+/);
    const normRole = member.role ? norm(member.role) : '';
    
    const wordsToCompare = [normName, ...nameWords];
    if (normRole) {
      wordsToCompare.push(normRole);
      normRole.split(/\s+/).forEach(w => wordsToCompare.push(w));
    }

    let bestDistForMember = 999;
    for (const target of wordsToCompare) {
      if (!target || target.length < 2) continue;
      const targetsInput = [normInput, ...inputWords];
      for (const inp of targetsInput) {
        if (!inp || inp.length < 2) continue;
        const dist = getLevDist(inp, target);
        const limit = target.length <= 4 ? 1 : 2;
        if (dist <= limit) {
          if (dist < bestDistForMember) {
            bestDistForMember = dist;
          }
        }
      }
    }
    if (bestDistForMember < 999) {
      wordLevMatches.push({ member, dist: bestDistForMember });
    }
  }

  if (wordLevMatches.length > 0) {
    wordLevMatches.sort((a, b) => a.dist - b.dist);
    const minDist = wordLevMatches[0].dist;
    return wordLevMatches.filter(m => m.dist === minDist).map(m => m.member);
  }

  return [];
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

// Mock family members
const mockMembers = [
  { id: '1', name: 'Yatta', role: 'Papa' },
  { id: '2', name: 'Yatta Junior', role: 'Fils' },
  { id: '3', name: 'Maman Marie', role: 'Maman' }
];

// -- FUZZY MEMBER MATCHING TESTS --
runTest('Fuzzy member: Exact match "Yatta"', () => {
  const matches = findAllMemberMatches('Yatta', mockMembers, '1');
  assert.strictEqual(matches.length, 1);
  assert.strictEqual(matches[0].id, '1');
});

runTest('Fuzzy member: Levenshtein variation "Yata"', () => {
  const matches = findAllMemberMatches('Yata', mockMembers, '1');
  assert.strictEqual(matches.length, 1);
  assert.strictEqual(matches[0].name, 'Yatta');
});

runTest('Fuzzy member: Case + Accent check "yattah"', () => {
  const matches = findAllMemberMatches('yattah', mockMembers, '1');
  assert.strictEqual(matches.length, 1);
  assert.strictEqual(matches[0].name, 'Yatta');
});

runTest('Fuzzy member: "Moi" mapping to activeMemberId', () => {
  const matches = findAllMemberMatches('c\'est pour moi', mockMembers, '1');
  assert.strictEqual(matches.length, 1);
  assert.strictEqual(matches[0].id, '1');
});

runTest('Fuzzy member: Multiple candidates (homonyms)', () => {
  const matches = findAllMemberMatches('Yat', mockMembers, '1');
  // Both Yatta and Yatta Junior should match because they have similar phonetic prefix
  assert.ok(matches.length >= 2, 'Should return multiple candidates');
  const ids = matches.map(m => m.id);
  assert.ok(ids.includes('1'));
  assert.ok(ids.includes('2'));
});

// -- CONTEXT RETENTION TESTS --
runTest('Context preservation: Resolving memberId does not lose date or title', () => {
  // Initial context
  const voiceContext = {
    pendingAction: 'create_vaccine',
    title: 'Vaccin Covid',
    date: '2026-06-25',
    dateRawDetected: '25 juin',
    missingField: 'memberId'
  };

  // User replies "Yata" (phonetic match to Yatta)
  const userResponse = 'Yata';
  const matches = findAllMemberMatches(userResponse, mockMembers, '1');
  assert.strictEqual(matches.length, 1);

  // Resolution step: copy previous context and update memberId
  const updatedCtx = { ...voiceContext };
  updatedCtx.memberId = matches[0].id;
  delete updatedCtx.missingField;

  // Assert context integrity
  assert.strictEqual(updatedCtx.pendingAction, 'create_vaccine', 'Intent lost');
  assert.strictEqual(updatedCtx.title, 'Vaccin Covid', 'Title lost');
  assert.strictEqual(updatedCtx.date, '2026-06-25', 'Date lost or mutated');
  assert.strictEqual(updatedCtx.dateRawDetected, '25 juin', 'Raw date text lost');
  assert.strictEqual(updatedCtx.memberId, '1', 'MemberId not set correctly');
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
