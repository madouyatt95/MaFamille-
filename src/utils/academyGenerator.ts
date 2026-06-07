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

export function generateQuestionForLesson(
  lessonId: string,
  niveau: 'CP' | 'CE1' | 'CE2' | 'CM1' | 'CM2' | '6e' | '5e' | '4e' | '3e' | 'Lycée'
): AcademyQuestion {
  const id = `lesson_q_${lessonId}_${Math.floor(Math.random() * 100000)}`;

  if (lessonId === 'les_cp_mat_add') {
    const a = Math.floor(Math.random() * 6) + 1;
    const b = Math.floor(Math.random() * 4) + 1;
    const ans = a + b;
    return {
      id,
      niveau,
      matiere: 'Mathématiques',
      competence: 'calcul',
      chapitre: 'Additions simples',
      question: `Combien font ${a} + ${b} ?`,
      options: shuffle([String(ans), ...getRandomDistractors(ans, 3, 4).map(String)]),
      reponse: String(ans),
      explication: `On regroupe ${a} et ${b}, ce qui donne ${ans}.`,
      indice: "Compte 1 par 1 en partant du premier nombre !",
      difficulte: 1,
      xp: 10,
      etoiles: 1
    };
  }

  if (lessonId === 'les_ce2_mat_mult7') {
    const mult = Math.floor(Math.random() * 10) + 1;
    const ans = 7 * mult;
    return {
      id,
      niveau,
      matiere: 'Mathématiques',
      competence: 'calcul',
      chapitre: 'Table de 7',
      question: `Combien font 7 × ${mult} ?`,
      options: shuffle([String(ans), ...getRandomDistractors(ans, 3, 8).map(String)]),
      reponse: String(ans),
      explication: `7 fois ${mult} font ${ans}.`,
      indice: "Répète 7 plusieurs fois de suite !",
      difficulte: 2,
      xp: 12,
      etoiles: 1
    };
  }

  if (lessonId === 'les_cm1_mat_frac') {
    const list = [
      { q: "Si on coupe une tarte en 4 parts et qu'on en mange 3, quelle fraction reste-t-il ?", ans: "1/4", opt: ["1/4", "3/4", "2/4", "1/2"], exp: "Il reste 1 part sur les 4 d'origine, donc 1/4." },
      { q: "Dans la fraction 2/3, comment s'appelle le nombre 2 ?", ans: "Le numérateur", opt: ["Le numérateur", "Le dénominateur", "Le diviseur", "L'unité"], exp: "Le nombre du haut est le numérateur." },
      { q: "Quelle fraction représente la moitié d'un objet ?", ans: "1/2", opt: ["1/2", "1/3", "1/4", "2/3"], exp: "La moitié se note 1/2." }
    ];
    const item = list[Math.floor(Math.random() * list.length)];
    return {
      id,
      niveau,
      matiere: 'Mathématiques',
      competence: 'calcul',
      chapitre: 'Fractions',
      question: item.q,
      options: shuffle(item.opt),
      reponse: item.ans,
      explication: item.exp,
      indice: "Pense au numérateur en haut et au dénominateur en bas !",
      difficulte: 2,
      xp: 12,
      etoiles: 1
    };
  }

  if (lessonId === 'les_3e_mat_pyth') {
    const list = [
      { q: "Dans un triangle rectangle de côtés adjacents 6 cm et 8 cm, quelle est la longueur de l'hypoténuse ?", ans: "10 cm", opt: ["10 cm", "14 cm", "12 cm", "9 cm"], exp: "Hypoténuse² = 6² + 8² = 36 + 64 = 100. Racine de 100 = 10." },
      { q: "Comment s'appelle le côté le plus long opposé à l'angle droit ?", ans: "L'hypoténuse", opt: ["L'hypoténuse", "Le côté adjacent", "L'ordonnée", "L'abscisse"], exp: "C'est l'hypoténuse." },
      { q: "Si un triangle ABC est rectangle en A, d'après Pythagore :", ans: "BC² = AB² + AC²", opt: ["BC² = AB² + AC²", "AB² = BC² + AC²", "AC² = AB² + BC²", "AB = BC + AC"], exp: "Le carré de l'hypoténuse BC est égal à la somme des carrés des autres côtés." }
    ];
    const item = list[Math.floor(Math.random() * list.length)];
    return {
      id,
      niveau,
      matiere: 'Mathématiques',
      competence: 'calcul',
      chapitre: 'Théorème de Pythagore',
      question: item.q,
      options: shuffle(item.opt),
      reponse: item.ans,
      explication: item.exp,
      indice: "Applique la formule a² + b² = c².",
      difficulte: 2,
      xp: 15,
      etoiles: 2
    };
  }

  if (lessonId === 'les_lyc_mat_deriv') {
    const list = [
      { q: "Quelle est la dérivée de f(x) = 5x + 3 ?", ans: "5", opt: ["5", "3", "5x", "0"], exp: "La dérivée de ax + b est a, donc ici c'est 5." },
      { q: "Quelle est la dérivée de f(x) = 2x² ?", ans: "4x", opt: ["4x", "2x", "4", "x²"], exp: "La dérivée de x² est 2x, donc 2 * 2x = 4x." },
      { q: "Si f'(x) < 0 sur un intervalle, alors la fonction f est :", ans: "Décroissante", opt: ["Décroissante", "Croissante", "Constante", "Nulle"], exp: "Une dérivée strictement négative implique une fonction décroissante." }
    ];
    const item = list[Math.floor(Math.random() * list.length)];
    return {
      id,
      niveau,
      matiere: 'Mathématiques',
      competence: 'calcul',
      chapitre: 'Dérivées',
      question: item.q,
      options: shuffle(item.opt),
      reponse: item.ans,
      explication: item.exp,
      indice: "Pense au coefficient directeur de la tangente !",
      difficulte: 2,
      xp: 15,
      etoiles: 2
    };
  }

  if (lessonId === 'les_cp_fra_ou') {
    const list = [
      { q: "Quel mot s'écrit avec les lettres 'o' et 'u' pour faire [ou] ?", ans: "La poule", opt: ["La poule", "La tortue", "Le chat", "Le vélo"], exp: "Poule s'écrit p-o-u-l-e, et contient bien le son [ou]." },
      { q: "Quel mot contient le son [ou] ?", ans: "Un loup", opt: ["Un loup", "Une moto", "Un nid", "Un mur"], exp: "Loup se termine par o-u-p, formant le son [ou]." }
    ];
    const item = list[Math.floor(Math.random() * list.length)];
    return {
      id,
      niveau,
      matiere: 'Français',
      competence: 'orthographe',
      chapitre: 'Le son [ou]',
      question: item.q,
      options: shuffle(item.opt),
      reponse: item.ans,
      explication: item.exp,
      indice: "Prononce les mots à voix haute pour entendre 'ou' !",
      difficulte: 1,
      xp: 10,
      etoiles: 1
    };
  }

  if (lessonId === 'les_ce2_fra_sujver') {
    const list = [
      { q: "Dans 'Le chien cour___ après la balle', comment se termine le verbe ?", ans: "t", opt: ["t", "ent", "es", "ons"], exp: "Le sujet is 'Le chien' (il), la terminaison du verbe courir est donc 't' (court)." },
      { q: "Dans 'Les enfants jou___ dehors', comment se termine le verbe ?", ans: "ent", opt: ["ent", "e", "ons", "ez"], exp: "Le sujet est 'Les enfants' (ils), donc la terminaison au pluriel est '-ent' (jouent)." }
    ];
    const item = list[Math.floor(Math.random() * list.length)];
    return {
      id,
      niveau,
      matiere: 'Français',
      competence: 'conjugaison',
      chapitre: 'Accord sujet-verbe',
      question: item.q,
      options: shuffle(item.opt),
      reponse: item.ans,
      explication: item.exp,
      indice: "Trouve qui fait l'action pour accorder le verbe !",
      difficulte: 2,
      xp: 12,
      etoiles: 1
    };
  }

  if (lessonId === 'les_cm1_fra_al') {
    const list = [
      { q: "Quel est le pluriel de 'Un animal' ?", ans: "Des animaux", opt: ["Des animaux", "Des animals", "Des originale", "Des animalux"], exp: "Le pluriel des mots en -al se fait en -aux, sauf exceptions." },
      { q: "Quel est le pluriel de 'Un festival' (exception) ?", ans: "Des festivals", opt: ["Des festivals", "Des festivaux", "Des festivales", "Des festivalx"], exp: "Festival fait partie des exceptions et prend un simple 's' au pluriel." }
    ];
    const item = list[Math.floor(Math.random() * list.length)];
    return {
      id,
      niveau,
      matiere: 'Français',
      competence: 'orthographe',
      chapitre: 'Pluriel en -al',
      question: item.q,
      options: shuffle(item.opt),
      reponse: item.ans,
      explication: item.exp,
      indice: "Est-ce une exception de la liste (bal, carnaval, festival...) ?",
      difficulte: 2,
      xp: 12,
      etoiles: 1
    };
  }

  if (lessonId === 'les_3e_fra_cond') {
    const list = [
      { q: "Comment conjugue-t-on 'chanter' à la première personne du singulier au conditionnel présent ?", ans: "Je chanterais", opt: ["Je chanterais", "Je chanterai", "Je chantois", "Je chanteras"], exp: "Radical du futur (chanter-) + terminaison de l'imparfait (-ais) = chanterais." },
      { q: "Quelle forme correspond à 'Vous (finir)' au conditionnel présent ?", ans: "Vous finiriez", opt: ["Vous finiriez", "Vous finirez", "Vous finissiez", "Vous finiriezs"], exp: "Radical du futur (finir-) + terminaison de l'imparfait (-iez) = finiriez." }
    ];
    const item = list[Math.floor(Math.random() * list.length)];
    return {
      id,
      niveau,
      matiere: 'Français',
      competence: 'conjugaison',
      chapitre: 'Conditionnel présent',
      question: item.q,
      options: shuffle(item.opt),
      reponse: item.ans,
      explication: item.exp,
      indice: "Pense au radical du futur suivi des terminaisons de l'imparfait.",
      difficulte: 2,
      xp: 12,
      etoiles: 1
    };
  }

  if (lessonId === 'les_ce2_dec_eau') {
    const list = [
      { q: "Comment appelle-t-on l'eau sous forme de gaz ?", ans: "La vapeur d'eau", opt: ["La vapeur d'eau", "La glace", "La pluie", "La grêle"], exp: "L'eau gazeuse s'appelle la vapeur d'eau." },
      { q: "Quel changement d'état se produit quand la glace devient de l'eau liquide ?", ans: "La fusion", opt: ["La fusion", "La solidification", "L'évaporation", "La condensation"], exp: "Le passage solide ➔ liquide est la fusion." }
    ];
    const item = list[Math.floor(Math.random() * list.length)];
    return {
      id,
      niveau,
      matiere: 'Découverte',
      competence: 'sciences',
      chapitre: 'États de l\'eau',
      question: item.q,
      options: shuffle(item.opt),
      reponse: item.ans,
      explication: item.exp,
      indice: "Pense à la chaleur qui fait fondre la glace.",
      difficulte: 1,
      xp: 10,
      etoiles: 1
    };
  }

  if (lessonId === 'les_cm1_dec_pharaons') {
    const list = [
      { q: "Comment les Égyptiens de l'Antiquité conservaient-ils les corps des pharaons ?", ans: "Par la momification", opt: ["Par la momification", "Par enterrement direct", "Par congélation", "Par crémation"], exp: "Le corps était vidé, salé et enveloppé de bandelettes pour devenir une momie." },
      { q: "Quel fleuve vital coulait en Égypte ancienne ?", ans: "Le Nil", opt: ["Le Nil", "Le Danube", "L'Euphrate", "Le Gange"], exp: "Le Nil permettait l'agriculture grâce à ses crues fertiles." }
    ];
    const item = list[Math.floor(Math.random() * list.length)];
    return {
      id,
      niveau,
      matiere: 'Découverte',
      competence: 'culture',
      chapitre: 'Égypte ancienne',
      question: item.q,
      options: shuffle(item.opt),
      reponse: item.ans,
      explication: item.exp,
      indice: "On enroulait des bandelettes autour du corps.",
      difficulte: 1,
      xp: 12,
      etoiles: 1
    };
  }

  if (lessonId === 'les_6e_lan_irregular') {
    const list = [
      { q: "Quel est le prétérit du verbe irrégulier 'to see' (voir) ?", ans: "saw", opt: ["saw", "seed", "seen", "was"], exp: "La conjugaison de see est see ➔ saw ➔ seen." },
      { q: "Quel est le prétérit du verbe irrégulier 'to make' (faire) ?", ans: "made", opt: ["made", "maked", "make", "done"], exp: "La conjugaison de make est make ➔ made ➔ made." }
    ];
    const item = list[Math.floor(Math.random() * list.length)];
    return {
      id,
      niveau,
      matiere: 'Anglais',
      competence: 'anglais',
      chapitre: 'Verbes irréguliers',
      question: item.q,
      options: shuffle(item.opt),
      reponse: item.ans,
      explication: item.exp,
      indice: "C'est une forme courte.",
      difficulte: 2,
      xp: 12,
      etoiles: 1
    };
  }

  if (lessonId === 'les_cp_lan_colors') {
    const list = [
      { q: "Comment dit-on 'Rouge' en anglais ?", ans: "Red", opt: ["Red", "Blue", "Green", "Yellow"], exp: "Red est la traduction de rouge en anglais." },
      { q: "Quelle est la couleur 'Yellow' ?", ans: "Jaune", opt: ["Jaune", "Vert", "Bleu", "Blanc"], exp: "Yellow se traduit par jaune." }
    ];
    const item = list[Math.floor(Math.random() * list.length)];
    return {
      id,
      niveau,
      matiere: 'Langues',
      competence: 'anglais',
      chapitre: 'Colors',
      question: item.q,
      options: shuffle(item.opt),
      reponse: item.ans,
      explication: item.exp,
      indice: "Pense au soleil pour yellow, au feu pour red.",
      difficulte: 1,
      xp: 10,
      etoiles: 1
    };
  }

  if (lessonId === 'les_ce2_lan_wolof') {
    const list = [
      { q: "En Wolof, que signifie 'Na nga def ?' ?", ans: "Comment vas-tu ?", opt: ["Comment vas-tu ?", "Merci", "Au revoir", "S'il te plaît"], exp: "C'est la salutation habituelle en Wolof." },
      { q: "Comment dit-on 'Merci' en Wolof ?", ans: "Jërëjëf", opt: ["Jërëjëf", "Mangi fi", "Na nga def", "Waaw"], exp: "Jërëjëf signifie merci." }
    ];
    const item = list[Math.floor(Math.random() * list.length)];
    return {
      id,
      niveau,
      matiere: 'Langues',
      competence: 'culture',
      chapitre: 'Wolof de base',
      question: item.q,
      options: shuffle(item.opt),
      reponse: item.ans,
      explication: item.exp,
      indice: "Na nga def est une question, Jërëjëf est un remerciement.",
      difficulte: 1,
      xp: 10,
      etoiles: 1
    };
  }

  if (lessonId === 'les_geo_oceans') {
    const list = [
      { q: "Quel est le plus grand océan de la Terre ?", ans: "L'océan Pacifique", opt: ["L'océan Pacifique", "L'océan Atlantique", "L'océan Indien", "L'océan Arctique"], exp: "L'océan Pacifique couvre environ 30% de la surface de la Terre." },
      { q: "Combien y a-t-il de continents sur Terre ?", ans: "6", opt: ["6", "5", "7", "8"], exp: "Il y a 6 grands continents : Asie, Afrique, Amérique, Europe, Océanie, Antarctique." },
      { q: "Sur quel continent se trouve l'Égypte ?", ans: "L'Afrique", opt: ["L'Afrique", "L'Asie", "L'Europe", "L'Amérique"], exp: "L'Égypte est située dans le nord-est de l'Afrique." }
    ];
    const item = list[Math.floor(Math.random() * list.length)];
    return {
      id,
      niveau,
      matiere: 'Géographie',
      competence: 'culture',
      chapitre: 'Océans et Continents',
      question: item.q,
      options: shuffle(item.opt),
      reponse: item.ans,
      explication: item.exp,
      indice: "C'est une grande étendue d'eau ou de terre.",
      difficulte: 1,
      xp: 10,
      etoiles: 1
    };
  }

  if (lessonId === 'les_lecture_recit') {
    const list = [
      { q: "Comment s'appelle le personnage principal d'une histoire ?", ans: "Le héros ou l'héroïne", opt: ["Le héros ou l'héroïne", "L'opposant", "Le narrateur", "L'allié"], exp: "Le héros ou l'héroïne mène l'histoire et réalise la quête." },
      { q: "Quel personnage aide le héros dans sa mission ?", ans: "L'allié", opt: ["L'allié", "L'opposant", "L'antagoniste", "Le figurant"], exp: "Les alliés soutiennent le héros dans ses épreuves." }
    ];
    const item = list[Math.floor(Math.random() * list.length)];
    return {
      id,
      niveau,
      matiere: 'Lecture',
      competence: 'lecture',
      chapitre: 'Récits',
      question: item.q,
      options: shuffle(item.opt),
      reponse: item.ans,
      explication: item.exp,
      indice: "Pense au rôle qu'il joue pour ou contre le personnage principal.",
      difficulte: 1,
      xp: 10,
      etoiles: 1
    };
  }

  if (lessonId === 'les_culture_instruments') {
    const list = [
      { q: "À quelle famille appartient la guitare ?", ans: "Les cordes", opt: ["Les cordes", "Les vents", "Les percussions", "Les cuivres"], exp: "Le musicien pince les cordes de la guitare pour produire des notes." },
      { q: "Lequel de ces instruments fait partie des percussions ?", ans: "Le tambour", opt: ["Le tambour", "Le violon", "La flûte", "La trompette"], exp: "On tape sur le tambour pour faire résonner sa membrane." }
    ];
    const item = list[Math.floor(Math.random() * list.length)];
    return {
      id,
      niveau,
      matiere: 'Culture',
      competence: 'culture',
      chapitre: 'Musique',
      question: item.q,
      options: shuffle(item.opt),
      reponse: item.ans,
      explication: item.exp,
      indice: "Demande-toi si on souffle, si on gratte ou si on tape dessus !",
      difficulte: 1,
      xp: 10,
      etoiles: 1
    };
  }

  if (lessonId === 'les_6e_hist_moyenage') {
    const list = [
      { q: "Quel groupe de la société médiévale faisait la guerre ?", ans: "La Noblesse", opt: ["La Noblesse", "Le Clergé", "Les Paysans", "Les Serfs"], exp: "Les chevaliers et seigneurs faisaient partie de la Noblesse et devaient défendre le royaume." },
      { q: "Où vivait le seigneur pour se protéger des attaques ?", ans: "Dans un château fort", opt: ["Dans un château fort", "Dans un monastère", "Dans une chaumière", "Dans une villa"], exp: "Le château fort offrait une protection militaire grâce à ses remparts." }
    ];
    const item = list[Math.floor(Math.random() * list.length)];
    return {
      id,
      niveau,
      matiere: 'Histoire',
      competence: 'culture',
      chapitre: 'Le Moyen Âge',
      question: item.q,
      options: shuffle(item.opt),
      reponse: item.ans,
      explication: item.exp,
      indice: "Ils portaient des armures et des épées.",
      difficulte: 2,
      xp: 12,
      etoiles: 1
    };
  }

  if (lessonId === 'les_5e_sci_volcans') {
    const list = [
      { q: "Comment s'appelle la roche fondue qui sort d'un volcan en éruption ?", ans: "La lave", opt: ["La lave", "Le magma", "Le granite", "Le basalte"], exp: "Le magma devient de la lave lorsqu'il sort à la surface et perd ses gaz." },
      { q: "Quel volcan d'Italie a détruit la ville de Pompéi dans l'Antiquité ?", ans: "Le Vésuve", opt: ["Le Vésuve", "L'Etna", "Le Stromboli", "Le Piton de la Fournaise"], exp: "Le Vésuve a enseveli Pompéi sous les cendres en l'an 79." }
    ];
    const item = list[Math.floor(Math.random() * list.length)];
    return {
      id,
      niveau,
      matiere: 'Sciences',
      competence: 'sciences',
      chapitre: 'Les Volcans',
      question: item.q,
      options: shuffle(item.opt),
      reponse: item.ans,
      explication: item.exp,
      indice: "C'est un volcan européen très célèbre et explosif.",
      difficulte: 2,
      xp: 12,
      etoiles: 1
    };
  }

  // Fallback to general generator
  const mat: 'Mathématiques' | 'Français' | 'Langues' = 
    lessonId.includes('_mat_') ? 'Mathématiques' : 
    (lessonId.includes('_fra_') ? 'Français' : 'Langues');
  return generateProceduralQuestion(niveau, mat);
}

