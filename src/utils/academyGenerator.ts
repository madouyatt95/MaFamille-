import type { AcademyQuestion } from '../data/academyData';

// --- French Conjugation Helper ---
const verbsData: Record<string, {
  present: string[];
  imparfait: string[];
  futur: string[];
  passeCompose: string[];
}> = {
  aimer: {
    present: ["aime", "aimes", "aime", "aimons", "aimez", "aiment"],
    imparfait: ["aimais", "aimais", "aimait", "aimions", "aimiez", "aimaient"],
    futur: ["aimerai", "aimeras", "aimera", "aimerons", "aimerez", "aimeront"],
    passeCompose: ["ai aimé", "as aimé", "a aimé", "avons aimé", "avez aimé", "ont aimé"]
  },
  finir: {
    present: ["finis", "finis", "finit", "finissons", "finissez", "finissent"],
    imparfait: ["finissais", "finissais", "finissait", "finissions", "finissiez", "finissaient"],
    futur: ["finirai", "finiras", "finira", "finirons", "finirez", "finiront"],
    passeCompose: ["ai fini", "as fini", "a fini", "avons fini", "avez fini", "ont fini"]
  },
  aller: {
    present: ["vais", "vas", "va", "allons", "allez", "vont"],
    imparfait: ["allais", "allais", "allait", "allions", "alliez", "allaient"],
    futur: ["irai", "iras", "ira", "irons", "irez", "iront"],
    passeCompose: ["suis allé", "es allé", "est allé", "sommes allés", "avez allés", "sont allés"]
  },
  faire: {
    present: ["fais", "fais", "fait", "faisons", "faites", "font"],
    imparfait: ["faisais", "faisais", "faisait", "faisions", "faisiez", "faisaient"],
    futur: ["ferai", "feras", "fera", "ferons", "ferez", "feront"],
    passeCompose: ["ai fait", "as fait", "a fait", "avons fait", "avez fait", "ont fait"]
  },
  avoir: {
    present: ["ai", "as", "a", "avons", "avez", "ont"],
    imparfait: ["avais", "avais", "avait", "avions", "aviez", "avaient"],
    futur: ["aurai", "auras", "aura", "aurons", "aurez", "auront"],
    passeCompose: ["ai eu", "as eu", "a eu", "avons eu", "avez eu", "ont eu"]
  },
  être: {
    present: ["suis", "es", "est", "sommes", "êtes", "sont"],
    imparfait: ["étais", "étais", "était", "étions", "étiez", "étaient"],
    futur: ["serai", "seras", "sera", "serons", "serez", "seront"],
    passeCompose: ["ai été", "as été", "a été", "avons été", "avez été", "ont été"]
  }
};

const pronouns = ["Je / J'", "Tu", "Il / Elle", "Nous", "Vous", "Ils / Elles"];
const tenseNames = {
  present: "présent",
  imparfait: "imparfait",
  futur: "futur simple",
  passeCompose: "passé composé"
};

// --- Language Translation Dictionary ---
const vocabData: Record<string, Array<{ foreign: string; french: string }>> = {
  anglais: [
    { foreign: "Apple", french: "Pomme" },
    { foreign: "Water", french: "Eau" },
    { foreign: "Dog", french: "Chien" },
    { foreign: "Red", french: "Rouge" },
    { foreign: "Friend", french: "Ami" },
    { foreign: "House", french: "Maison" },
    { foreign: "School", french: "École" },
    { foreign: "Book", french: "Livre" },
    { foreign: "Bread", french: "Pain" },
    { foreign: "Sun", french: "Soleil" },
    { foreign: "Thank you", french: "Merci" }
  ],
  wolof: [
    { foreign: "Kër", french: "Maison" },
    { foreign: "Ndox", french: "Eau" },
    { foreign: "Ceeb", french: "Riz" },
    { foreign: "Jërëjëf", french: "Merci" },
    { foreign: "Waaw", french: "Oui" },
    { foreign: "Déedéet", french: "Non" },
    { foreign: "Sama xarit", french: "Mon ami" },
    { foreign: "Benn", french: "Un" },
    { foreign: "Ñaar", french: "Deux" },
    { foreign: "Nanu reer", french: "Mangeons le dîner" }
  ],
  espagnol: [
    { foreign: "Manzana", french: "Pomme" },
    { foreign: "Agua", french: "Eau" },
    { foreign: "Perro", french: "Chien" },
    { foreign: "Rojo", french: "Rouge" },
    { foreign: "Amigo", french: "Ami" },
    { foreign: "Casa", french: "Maison" },
    { foreign: "Escuela", french: "École" },
    { foreign: "Libro", french: "Livre" },
    { foreign: "Pan", french: "Pain" },
    { foreign: "Sol", french: "Soleil" },
    { foreign: "Gracias", french: "Merci" }
  ]
};

// Helper: Shuffle Array
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Helper: Unique Random Numbers
function getRandomDistractors(correctVal: number, count = 3, range = 10): number[] {
  const result = new Set<number>();
  while (result.size < count) {
    const offset = Math.floor(Math.random() * range * 2) - range;
    const val = correctVal + offset;
    if (val !== correctVal && val >= 0) {
      result.add(val);
    }
  }
  return Array.from(result);
}

// --- MAIN QUESTION GENERATOR ---
export function generateProceduralQuestion(
  niveau: 'CP' | 'CE1' | 'CE2' | 'CM1' | 'CM2' | '6e' | '5e' | '4e' | '3e' | 'Lycée',
  matiere: 'Mathématiques' | 'Français' | 'Langues'
): AcademyQuestion {
  const id = `procedural_${niveau}_${matiere.substring(0, 3)}_${Math.floor(Math.random() * 100000)}`;
  
  if (matiere === 'Mathématiques') {
    return generateMathQuestion(niveau, id);
  } else if (matiere === 'Français') {
    return generateFrenchQuestion(niveau, id);
  } else {
    return generateLanguageQuestion(niveau, id);
  }
}

// 1. Math Questions Generator
function generateMathQuestion(
  niveau: 'CP' | 'CE1' | 'CE2' | 'CM1' | 'CM2' | '6e' | '5e' | '4e' | '3e' | 'Lycée',
  id: string
): AcademyQuestion {
  let question = '';
  let reponse = '';
  let options: string[] = [];
  let explication = '';
  let indice = '';
  let chapitre = '';
  let difficulte: 1 | 2 | 3 = 1;
  let xp = 10;
  let etoiles = 1;

  if (niveau === 'CP' || niveau === 'CE1') {
    chapitre = 'Additions simples';
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    const ans = a + b;
    question = `Combien font ${a} + ${b} ?`;
    reponse = String(ans);
    const distractors = getRandomDistractors(ans, 3, 5);
    options = shuffle([reponse, ...distractors.map(String)]);
    explication = `Pour calculer ${a} + ${b}, tu pars de ${a} et tu ajoutes ${b}. Cela fait ${ans}.`;
    indice = "Compte sur tes doigts si besoin !";
  } 
  else if (niveau === 'CE2') {
    chapitre = 'Tables de multiplication';
    const a = Math.floor(Math.random() * 8) + 2;
    const b = Math.floor(Math.random() * 8) + 2;
    const ans = a * b;
    question = `Combien font ${a} × ${b} ?`;
    reponse = String(ans);
    const distractors = getRandomDistractors(ans, 3, 8);
    options = shuffle([reponse, ...distractors.map(String)]);
    explication = `${a} groupes de ${b} font ${ans}.`;
    indice = `Révise ta table de ${a} ou de ${b}.`;
    difficulte = 2;
    xp = 12;
  }
  else if (niveau === 'CM1') {
    chapitre = 'Divisions entières';
    const quotient = Math.floor(Math.random() * 8) + 2;
    const diviseur = Math.floor(Math.random() * 8) + 2;
    const dividende = quotient * diviseur;
    question = `Quel est le résultat de ${dividende} ÷ ${diviseur} ?`;
    reponse = String(quotient);
    const distractors = getRandomDistractors(quotient, 3, 4);
    options = shuffle([reponse, ...distractors.map(String)]);
    explication = `Car ${quotient} × ${diviseur} = ${dividende}.`;
    indice = `Pense à la multiplication réciproque : ... × ${diviseur} = ${dividende}`;
    difficulte = 2;
    xp = 12;
  }
  else if (niveau === 'CM2') {
    chapitre = 'Fractions équivalentes';
    const list = [
      { q: "Quelle fraction est égale à 1/2 ?", ans: "2/4", options: ["2/4", "2/3", "1/3", "3/5"], exp: "Si on multiplie le haut et le bas de 1/2 par 2, on obtient 2/4." },
      { q: "Quelle fraction est égale à 3/4 ?", ans: "6/8", options: ["6/8", "3/8", "1/2", "5/6"], exp: "Si on multiplie le haut et le bas de 3/4 par 2, on obtient 6/8." },
      { q: "Simplifie la fraction 5/10.", ans: "1/2", options: ["1/2", "1/5", "2/5", "3/10"], exp: "En divisant 5 et 10 par leur plus grand diviseur commun (5), on obtient 1/2." }
    ];
    const item = list[Math.floor(Math.random() * list.length)];
    question = item.q;
    reponse = item.ans;
    options = shuffle(item.options);
    explication = item.exp;
    indice = "Divise ou multiplie le numérateur et le dénominateur par le même nombre !";
    difficulte = 2;
    xp = 15;
    etoiles = 2;
  }
  else if (niveau === '6e' || niveau === '5e') {
    chapitre = 'Équations simples';
    const x = Math.floor(Math.random() * 10) + 1;
    const a = Math.floor(Math.random() * 9) + 2;
    const b = x + a;
    question = `Résous l'équation : x + ${a} = ${b}. Quelle est la valeur de x ?`;
    reponse = String(x);
    const distractors = getRandomDistractors(x, 3, 5);
    options = shuffle([reponse, ...distractors.map(String)]);
    explication = `Pour trouver x, on soustrait ${a} de ${b} : x = ${b} - ${a} = ${x}.`;
    indice = "Soustrait le nombre connu du résultat total.";
    difficulte = 2;
    xp = 15;
  }
  else if (niveau === '4e' || niveau === '3e') {
    chapitre = 'Puissances de 10';
    const power = Math.floor(Math.random() * 4) + 2; // 10^2 to 10^5
    const ans = Math.pow(10, power);
    question = `Quelle est l'écriture décimale de 10 puissance ${power} (10^${power}) ?`;
    reponse = String(ans);
    const distractors = [ans * 10, ans / 10, ans + 10];
    options = shuffle([reponse, ...distractors.map(String)]);
    explication = `10^${power} correspond à un 1 suivi de ${power} zéros.`;
    indice = "Compte le nombre de zéros après le chiffre 1.";
    difficulte = 2;
    xp = 15;
  }
  else {
    // Lycée
    chapitre = 'Probabilités basiques';
    question = "On tire une carte dans un jeu de 32 cartes. Quelle est la probabilité d'obtenir un As ?";
    reponse = "1/8";
    options = ["1/8", "1/32", "4/32", "1/4"];
    explication = "Il y a 4 As dans un jeu de 32 cartes. La probabilité est de 4/32, ce qui se simplifie en 1/8.";
    indice = "Calcule le nombre de cas favorables sur le nombre de cas possibles.";
    difficulte = 2;
    xp = 18;
  }

  return {
    id,
    niveau,
    matiere: 'Mathématiques',
    competence: 'calcul',
    chapitre,
    question,
    options,
    reponse,
    explication,
    indice,
    difficulte,
    xp,
    etoiles
  };
}

// 2. French Conjugation Generator
function generateFrenchQuestion(
  niveau: 'CP' | 'CE1' | 'CE2' | 'CM1' | 'CM2' | '6e' | '5e' | '4e' | '3e' | 'Lycée',
  id: string
): AcademyQuestion {
  const verbList = Object.keys(verbsData);
  const selectedVerb = verbList[Math.floor(Math.random() * verbList.length)];
  
  // Decide tense based on level
  let tense: 'present' | 'imparfait' | 'futur' | 'passeCompose' = 'present';
  if (niveau !== 'CP' && niveau !== 'CE1') {
    const tenses: Array<'present' | 'imparfait' | 'futur' | 'passeCompose'> = ['present', 'imparfait', 'futur'];
    if (niveau !== 'CE2') tenses.push('passeCompose');
    tense = tenses[Math.floor(Math.random() * tenses.length)];
  }

  const pronounIdx = Math.floor(Math.random() * 6);
  const correctConjugation = verbsData[selectedVerb][tense][pronounIdx];

  // Get wrong answers
  const correctVal = correctConjugation;
  const distractorsSet = new Set<string>();
  
  // Add other persons of the same tense
  verbsData[selectedVerb][tense].forEach(form => {
    if (form !== correctVal) distractorsSet.add(form);
  });
  // Add same person of another tense
  Object.keys(verbsData[selectedVerb]).forEach(t => {
    const form = verbsData[selectedVerb][t as keyof typeof verbsData[string]][pronounIdx];
    if (form !== correctVal) distractorsSet.add(form);
  });

  const distractorsList = Array.from(distractorsSet).filter(f => f !== correctVal);
  const selectedDistractors = shuffle(distractorsList).slice(0, 3);
  
  // Ensure we have exactly 3 distractors
  while (selectedDistractors.length < 3) {
    selectedDistractors.push(correctVal + "es"); // dummy error fallback
  }

  const pronoun = pronouns[pronounIdx];
  const tenseName = tenseNames[tense];

  return {
    id,
    niveau,
    matiere: 'Français',
    competence: 'conjugaison',
    chapitre: 'Conjugaison des verbes',
    question: `Comment conjugue-t-on le verbe "${selectedVerb}" au ${tenseName} avec le pronom "${pronoun}" ?`,
    options: shuffle([correctVal, ...selectedDistractors]),
    reponse: correctVal,
    explication: `Avec "${pronoun}", le verbe "${selectedVerb}" au ${tenseName} s'écrit : "${correctVal}".`,
    indice: `Pense aux terminaisons régulières du ${tenseName} pour les verbes en -er ou -ir.`,
    difficulte: 2,
    xp: 12,
    etoiles: 1
  };
}

// 3. Translation/Language Questions Generator
function generateLanguageQuestion(
  niveau: 'CP' | 'CE1' | 'CE2' | 'CM1' | 'CM2' | '6e' | '5e' | '4e' | '3e' | 'Lycée',
  id: string
): AcademyQuestion {
  // Select dynamic language (Wolof or Anglais or Espagnol)
  const languages = ['anglais', 'wolof', 'espagnol'];
  const lang = languages[Math.floor(Math.random() * languages.length)];
  const vocabList = vocabData[lang];
  const index = Math.floor(Math.random() * vocabList.length);
  const item = vocabList[index];

  // Random translation direction
  const toFrench = Math.random() > 0.5;
  let question = '';
  let reponse = '';
  let options: string[] = [];

  // Get wrong answers from other words of the same dictionary
  const correctVal = toFrench ? item.french : item.foreign;
  const distractorsSet = new Set<string>();
  
  while (distractorsSet.size < 3) {
    const randItem = vocabList[Math.floor(Math.random() * vocabList.length)];
    const val = toFrench ? randItem.french : randItem.foreign;
    if (val !== correctVal) {
      distractorsSet.add(val);
    }
  }

  reponse = correctVal;
  options = shuffle([reponse, ...Array.from(distractorsSet)]);

  const displayLangName = lang.charAt(0).toUpperCase() + lang.slice(1);

  if (toFrench) {
    question = `En ${displayLangName}, comment se traduit le mot "${item.foreign}" ?`;
  } else {
    question = `Comment dit-on "${item.french}" en ${displayLangName} ?`;
  }

  return {
    id,
    niveau,
    matiere: 'Langues',
    competence: lang === 'anglais' ? 'anglais' : 'culture',
    chapitre: `Vocabulaire ${displayLangName}`,
    question,
    options,
    reponse,
    explication: `En ${displayLangName}, "${item.foreign}" correspond à "${item.french}" en français.`,
    indice: `C'est un mot de la vie de tous les jours.`,
    difficulte: 1,
    xp: 12,
    etoiles: 1
  };
}
