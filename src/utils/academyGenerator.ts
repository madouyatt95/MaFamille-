import type { AcademyQuestion, AcademySubject } from '../data/academyData';
import { staticAcademyQuestions, staticAcademyLessons } from '../data/academyData';

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
  matiere: AcademySubject
): AcademyQuestion {
  const id = `procedural_${niveau}_${matiere.substring(0, 3)}_${Math.floor(Math.random() * 100000)}`;
  
  if (matiere === 'Mathématiques') {
    return generateMathQuestion(niveau, id);
  } else if (matiere === 'Français') {
    return generateFrenchQuestion(niveau, id);
  } else if (matiere === 'Langues' || matiere === 'Anglais') {
    return generateLanguageQuestion(niveau, id, matiere);
  } else {
    // Pour toutes les autres matières (Histoire, Géo, Sciences, Logique, etc.)
    // On essaye de récupérer une question statique
    const matches = staticAcademyQuestions.filter(q => q.matiere === matiere);
    if (matches.length > 0) {
      const levelMatches = matches.filter(q => q.niveau === niveau);
      const chosen = levelMatches.length > 0 
        ? levelMatches[Math.floor(Math.random() * levelMatches.length)]
        : matches[Math.floor(Math.random() * matches.length)];
      return {
        ...chosen,
        id: `${chosen.id}_${Math.floor(Math.random() * 100000)}`,
        niveau
      };
    }
    
    // Générateur par défaut de secours ultime pour éviter les crashs
    return {
      id,
      niveau,
      matiere,
      competence: 'culture',
      chapitre: 'Général',
      question: `Parmi ces propositions, laquelle est correcte concernant le cours de ${matiere} ?`,
      options: ["La proposition A (correcte)", "La proposition B", "La proposition C", "La proposition D"],
      reponse: "La proposition A (correcte)",
      explication: `Ceci est une question de révision générale pour la matière ${matiere}.`,
      indice: "Choisis la première option.",
      difficulte: 1,
      xp: 10,
      etoiles: 1
    };
  }
}

// 1. Math Questions Generator
function generateMathQuestion(
  niveau: 'CP' | 'CE1' | 'CE2' | 'CM1' | 'CM2' | '6e' | '5e' | '4e' | '3e' | 'Lycée',
  id: string
): AcademyQuestion {
  let question: string;
  let reponse: string;
  let options: string[];
  let explication: string;
  let indice: string;
  let chapitre: string;
  let difficulte: 1 | 2 | 3 = 1;
  let xp = 10;
  let etoiles = 1;

  if (niveau === 'CP' || niveau === 'CE1') {
    chapitre = 'Additions';
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
    chapitre = 'Multiplications';
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
    chapitre = 'Divisions';
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
    chapitre = 'Fractions';
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
    chapitre = 'Équations';
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
    chapitre = 'Géométrie';
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
    chapitre = 'Probabilités';
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
    selectedDistractors.push(correctVal + "es");
  }

  const pronoun = pronouns[pronounIdx];
  const tenseName = tenseNames[tense];

  return {
    id,
    niveau,
    matiere: 'Français',
    competence: 'conjugaison',
    chapitre: 'Conjugaison',
    question: `Comment conjugue-t-on le verbe "${selectedVerb}" au ${tenseName} avec le pronom "${pronoun}" ?`,
    options: shuffle([correctVal, ...selectedDistractors]),
    reponse: correctVal,
    explication: `Avec "${pronoun}", le verbe "${selectedVerb}" au ${tenseName} s'écrit : "${correctVal}".`,
    indice: `Pense aux terminaisons du ${tenseName} pour ce pronom.`,
    difficulte: 2,
    xp: 12,
    etoiles: 1
  };
}

// 3. Translation/Language Questions Generator
function generateLanguageQuestion(
  niveau: 'CP' | 'CE1' | 'CE2' | 'CM1' | 'CM2' | '6e' | '5e' | '4e' | '3e' | 'Lycée',
  id: string,
  matiere: AcademySubject
): AcademyQuestion {
  // Select language based on subject
  let lang = 'anglais';
  if (matiere === 'Langues') {
    const langs = ['wolof', 'espagnol'];
    lang = langs[Math.floor(Math.random() * langs.length)];
  }

  const vocabList = vocabData[lang];
  const index = Math.floor(Math.random() * vocabList.length);
  const item = vocabList[index];

  // Random translation direction
  const toFrench = Math.random() > 0.5;
  let question: string;

  // Get wrong answers
  const correctVal = toFrench ? item.french : item.foreign;
  const distractorsSet = new Set<string>();
  
  while (distractorsSet.size < 3) {
    const randItem = vocabList[Math.floor(Math.random() * vocabList.length)];
    const val = toFrench ? randItem.french : randItem.foreign;
    if (val !== correctVal) {
      distractorsSet.add(val);
    }
  }

  const reponse = correctVal;
  const options = shuffle([reponse, ...Array.from(distractorsSet)]);

  const displayLangName = lang.charAt(0).toUpperCase() + lang.slice(1);

  if (toFrench) {
    question = `En ${displayLangName}, comment se traduit le mot "${item.foreign}" ?`;
  } else {
    question = `Comment dit-on "${item.french}" en ${displayLangName} ?`;
  }

  return {
    id,
    niveau,
    matiere,
    competence: lang === 'anglais' ? 'anglais' : 'culture',
    chapitre: `Vocabulaire ${displayLangName}`,
    question,
    options,
    reponse,
    explication: `En ${displayLangName}, "${item.foreign}" correspond à "${item.french}" en français.`,
    indice: `C'est un mot de la vie courante.`,
    difficulte: 1,
    xp: 12,
    etoiles: 1
  };
}

export function generateQuestionForLesson(
  lessonId: string,
  niveau: 'CP' | 'CE1' | 'CE2' | 'CM1' | 'CM2' | '6e' | '5e' | '4e' | '3e' | 'Lycée'
): AcademyQuestion {
  const id = `lesson_q_${lessonId}_${Math.floor(Math.random() * 100000)}`;

  // 1. Try to find static questions matching the lessonId first
  const matches = staticAcademyQuestions.filter((q) => q.lessonId === lessonId);
  if (matches.length > 0) {
    const chosen = matches[Math.floor(Math.random() * matches.length)];
    return {
      ...chosen,
      id: `${chosen.id}_${Math.floor(Math.random() * 100000)}`,
      niveau
    };
  }

  // 2. Procedural Multiplication Table Generator
  if (lessonId.startsWith('les_mat_mult') || lessonId === 'les_ce2_mat_mult7') {
    let tableNum = 7;
    if (lessonId === 'les_ce2_mat_mult7') {
      tableNum = 7;
    } else {
      const numStr = lessonId.replace('les_mat_mult', '');
      const num = parseInt(numStr, 10);
      if (!isNaN(num)) tableNum = num;
    }

    const mult = Math.floor(Math.random() * 10) + 1;
    const ans = tableNum * mult;
    const distractors = getRandomDistractors(ans, 3, 8);
    return {
      id,
      niveau,
      matiere: 'Mathématiques',
      competence: 'calcul',
      chapitre: `Table de ${tableNum}`,
      question: `Combien font ${tableNum} × ${mult} ?`,
      options: shuffle([String(ans), ...distractors.map(String)]),
      reponse: String(ans),
      explication: `Car ${tableNum} fois ${mult} font ${ans}.`,
      indice: `Tu peux faire l'addition de ${tableNum} plusieurs fois de suite.`,
      difficulte: 2,
      xp: 10,
      etoiles: 1,
      lessonId
    };
  }

  // 3. Procedural Additions
  if (lessonId === 'les_cp_mat_add') {
    const a = Math.floor(Math.random() * 6) + 1;
    const b = Math.floor(Math.random() * 4) + 1;
    const ans = a + b;
    return {
      id,
      niveau,
      matiere: 'Mathématiques',
      competence: 'calcul',
      chapitre: 'Additions',
      question: `Combien font ${a} + ${b} ?`,
      options: shuffle([String(ans), ...getRandomDistractors(ans, 3, 4).map(String)]),
      reponse: String(ans),
      explication: `On regroupe ${a} et ${b}, ce qui donne ${ans}.`,
      indice: "Compte 1 par 1 en partant du premier nombre !",
      difficulte: 1,
      xp: 10,
      etoiles: 1,
      lessonId
    };
  }

  // 4. Procedural Soustractions
  if (lessonId === 'les_cp_mat_sub') {
    const a = Math.floor(Math.random() * 6) + 5; // 5 to 10
    const b = Math.floor(Math.random() * 4) + 1; // 1 to 4
    const ans = a - b;
    return {
      id,
      niveau,
      matiere: 'Mathématiques',
      competence: 'calcul',
      chapitre: 'Soustractions',
      question: `Combien font ${a} - ${b} ?`,
      options: shuffle([String(ans), ...getRandomDistractors(ans, 3, 4).map(String)]),
      reponse: String(ans),
      explication: `On retire ${b} à ${a}, ce qui donne ${ans}.`,
      indice: "Recule sur la file numérique.",
      difficulte: 1,
      xp: 10,
      etoiles: 1,
      lessonId
    };
  }

  // 5. Procedural Conjugation
  if (lessonId.startsWith('les_fra_conj_')) {
    let tense: 'present' | 'imparfait' | 'futur' | 'passeCompose' = 'present';
    if (lessonId.includes('_pres')) tense = 'present';
    else if (lessonId.includes('_fut')) tense = 'futur';
    else if (lessonId.includes('_imp')) tense = 'imparfait';
    else if (lessonId.includes('_pc')) tense = 'passeCompose';

    const verbList = Object.keys(verbsData);
    const verb = verbList[Math.floor(Math.random() * verbList.length)];
    const pronounIdx = Math.floor(Math.random() * 6);
    const correctVal = verbsData[verb][tense][pronounIdx];
    const pronoun = pronouns[pronounIdx];
    const tenseName = tenseNames[tense];

    const distractorsSet = new Set<string>();
    verbsData[verb][tense].forEach(form => {
      if (form !== correctVal) distractorsSet.add(form);
    });
    const selectedDistractors = shuffle(Array.from(distractorsSet)).slice(0, 3);
    while (selectedDistractors.length < 3) {
      selectedDistractors.push(correctVal + "es");
    }

    return {
      id,
      niveau,
      matiere: 'Français',
      competence: 'conjugaison',
      chapitre: 'Conjugaison',
      question: `Conjugue le verbe "${verb}" au ${tenseName} avec le pronom "${pronoun}" :`,
      options: shuffle([correctVal, ...selectedDistractors]),
      reponse: correctVal,
      explication: `Avec "${pronoun}", la forme correcte est "${correctVal}".`,
      indice: `Pense aux terminaisons régulières du ${tenseName}.`,
      difficulte: 2,
      xp: 12,
      etoiles: 1,
      lessonId
    };
  }

  // 6. Fallback to general generator
  const lesson = staticAcademyLessons.find(l => l.id === lessonId);
  const mat = lesson ? lesson.matiere : 'Mathématiques';
  return generateProceduralQuestion(niveau, mat);
}
