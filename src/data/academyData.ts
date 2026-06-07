export interface AcademyQuestion {
  id: string | number;
  niveau: 'CP' | 'CE1' | 'CE2' | 'CM1' | 'CM2' | '6e' | '5e' | '4e' | '3e' | 'Lycée';
  matiere: 'Mathématiques' | 'Français' | 'Découverte' | 'Langues' | 'Histoire' | 'Géographie' | 'Sciences' | 'Lecture' | 'Culture' | 'Anglais' | 'Culture G';
  competence: 'lecture' | 'orthographe' | 'calcul' | 'conjugaison' | 'culture' | 'anglais' | 'sciences';
  chapitre: string;
  question: string;
  options: string[]; // Options for multiple choice
  reponse: string; // The correct option
  explication: string;
  indice: string;
  difficulte: 1 | 2 | 3; // 1: Easy, 2: Medium, 3: Hard (Challenge)
  xp: number;
  etoiles: number;
}

export interface Lesson {
  id: string;
  niveau: 'CP' | 'CE1' | 'CE2' | 'CM1' | 'CM2' | '6e' | '5e' | '4e' | '3e' | 'Lycée';
  matiere: 'Mathématiques' | 'Français' | 'Découverte' | 'Langues' | 'Histoire' | 'Géographie' | 'Sciences' | 'Lecture' | 'Culture' | 'Anglais' | 'Culture G';
  category: string; // e.g. "Tables de multiplication", "Additions"
  title: string;
  explication: string;
  astuce: string;
  memo: string; // Bullet points separated by newlines
  exemple: string;
  pieges?: string; // Common traps or pitfalls
  schemas?: string[]; // Small text-based schemas
}export const staticAcademyLessons: Lesson[] = [
  // === MATHÉMATIQUES ===
  {
    id: "les_cp_mat_add",
    niveau: "CP",
    matiere: "Mathématiques",
    category: "Additions",
    title: "L'addition simple (1 à 10) ➕",
    explication: "L'addition consiste à assembler deux nombres pour en trouver le total. C'est comme regrouper des bonbons dans un seul panier.",
    astuce: "Pour ajouter, tu peux démarrer du plus grand nombre et avancer en comptant sur tes doigts !",
    memo: "- Le signe '+' se lit 'plus'.\n- Le résultat s'appelle la somme.\n- Ajouter 1, c'est trouver le nombre juste après.",
    exemple: "Si tu as 3 pommes et qu'on t'en donne 2 de plus, tu calcules 3 + 2. Tu pars de 3 et tu ajoutes 2 doigts : 4, 5. Tu as 5 pommes en tout !",
    pieges: "Attention à ne pas recompter le premier groupe. Si tu fais 3 + 2, compte : 4 (1er) puis 5 (2e).",
    schemas: ["🍎🍎🍎 + 🍎🍎 = 🍎🍎🍎🍎🍎", "3 + 2 = 5"]
  },
  {
    id: "les_ce2_mat_mult7",
    niveau: "CE2",
    matiere: "Mathématiques",
    category: "Tables de multiplication",
    title: "La table de multiplication par 7 🧮",
    explication: "Multiplier par 7, c'est ajouter le nombre 7 plusieurs fois à lui-même.",
    astuce: "Apprends à repérer le rythme de la table : 7, 14, 21, 28, 35, 42, 49, 56, 63, 70.",
    memo: "- 7 × 1 = 7\n- 7 × 2 = 14 (le double)\n- 7 × 5 = 35 (la moitié de 70)\n- 7 × 10 = 70\n- 7 × 7 = 49 (le carré magique !)",
    exemple: "Pour calculer 7 × 3, on additionne 7 trois fois : 7 + 7 + 7 = 21.",
    pieges: "Ne pas confondre 7 × 8 (56) et 7 × 9 (63) ! C'est le piège le plus classique de cette table.",
    schemas: ["7 × 3 = 21", "📈 7 -> 14 -> 21 -> 28"]
  },
  {
    id: "les_cm1_mat_frac",
    niveau: "CM1",
    matiere: "Mathématiques",
    category: "Fractions",
    title: "Les fractions simples 🍰",
    explication: "Une fraction représente le partage d'une unité en parts égales. Le numérateur (haut) indique le nombre de parts que l'on prend. Le dénominateur (bas) indique en combien de parts égales l'unité a été coupée.",
    astuce: "Pense à une pizza : si tu la coupes en 4 parts, le bas de la fraction est 4. Si tu manges 1 part, le haut est 1.",
    memo: "- Numérateur : chiffre du haut (parts prises).\n- Dénominateur : chiffre du bas (parts coupées).\n- 1/2 se lit 'un demi'.\n- 1/4 se lit 'un quart'.\n- 3/4 se lit 'trois quarts'.",
    exemple: "Si tu manges la moitié d'un gâteau coupé en 2, tu as mangé 1/2 du gâteau.",
    pieges: "Plus le dénominateur (bas) est grand, plus la part est PETITE ! 1/8 est beaucoup plus petit que 1/2.",
    schemas: ["🍰 Coupé en 2 parts = 1/2", "🍕 Coupé en 4 parts = 1/4"]
  },
  {
    id: "les_3e_mat_pyth",
    niveau: "3e",
    matiere: "Mathématiques",
    category: "Géométrie",
    title: "Théorème de Pythagore 🔺",
    explication: "Dans un triangle rectangle, le carré de la longueur de l'hypoténuse (le plus grand côté opposé à l'angle droit) est égal à la somme des carrés des longueurs des deux autres côtés.",
    astuce: "Ce théorème sert à calculer une longueur manquante dans un triangle qui possède un angle droit !",
    memo: "- S'applique uniquement aux triangles rectangles.\n- Formule : BC² = AB² + AC² (si A est l'angle droit).\n- L'hypoténuse est toujours le côté le plus long.",
    exemple: "Soit un triangle rectangle en A avec AB = 3 cm et AC = 4 cm. BC² = 3² + 4² = 9 + 16 = 25. BC = racine carrée de 25, donc BC = 5 cm.",
    pieges: "Vérifie bien que le triangle a un angle droit avant d'écrire la formule !",
    schemas: ["  /| \n / | hypoténuse (c)\n/__| \n  a   b", "Formule: a² + b² = c²"]
  },

  // === FRANÇAIS ===
  {
    id: "les_cp_fra_ou",
    niveau: "CP",
    matiere: "Français",
    category: "Lecture",
    title: "Le son [ou] 🗣️",
    explication: "Le son [ou] s'écrit en associant les lettres 'o' et 'u' ensemble dans le même mot.",
    astuce: "Quand tu prononces 'ou', ta bouche forme un petit cercle tout rond !",
    memo: "- Lettres complices : o + u = ou.\n- Se trouve dans loup, roue, poule, genou.\n- Ne pas confondre avec le son [u] (comme dans tortue).",
    exemple: "Dans le mot 'loup', on voit 'ou'. Le 'p' à la fin ne se prononce pas. Ça fait le son [ou] !",
    pieges: "Attention à ne pas inverser l'ordre : 'uo' ne fait pas le son [ou] !",
    schemas: ["o + u = [ou]", "🐺 l-ou-p, 🚗 r-ou-e"]
  },
  {
    id: "les_ce2_fra_sujver",
    niveau: "CE2",
    matiere: "Français",
    category: "Conjugaison",
    title: "L'accord Sujet-Verbe ✍️",
    explication: "Le verbe s'accorde toujours en nombre (singulier ou pluriel) et en personne (je, tu, il...) avec son sujet. Si le sujet change, la terminaison du verbe change.",
    astuce: "Pour trouver le sujet, pose la question : 'Qui est-ce qui + verbe ?' !",
    memo: "- Sujet singulier -> Verbe singulier (ex. -e, -t).\n- Sujet pluriel -> Verbe pluriel (ex. -ent).\n- Le pronom 'Tu' commande toujours un 's' à la fin du verbe.",
    exemple: "Le chat mange (singulier). Les chats mangent (pluriel).",
    pieges: "Les verbes au pluriel se terminent souvent par '-ent' (ex: ils mangent), tandis que les noms au pluriel prennent un '-s' (ex: les chats). Ne confonds pas !",
    schemas: ["Le chat (il) -> mange", "Les chats (ils) -> mangent"]
  },
  {
    id: "les_cm1_fra_al",
    niveau: "CM1",
    matiere: "Français",
    category: "Orthographe",
    title: "Le pluriel des noms en -al ✍️",
    explication: "Les noms masculins qui se terminent par '-al' font généralement leur pluriel en '-aux'.",
    astuce: "Retiens bien la liste des 7 exceptions courantes qui prennent simplement un 's' au pluriel : bal, cal, carnaval, chacal, festival, régal, récital.",
    memo: "- Règle générale : -al devient -aux.\n- Un journal -> des journaux.\n- Exception : un festival -> des festivals.\n- Exception : un bal -> des bals.",
    exemple: "On écrit 'un cheval' au singulier, mais 'des chevaux' au pluriel. Par contre, pour la fête, on écrit 'des carnavals'.",
    pieges: "Attention : l'erreur classique est de mettre 'des journals' ou 'des carnavaux'. Apprends les exceptions par cœur !",
    schemas: ["-al ➔ -aux (général)", "-al ➔ -als (exceptions : bal, festival...)"]
  },

  // === DÉCOUVERTE / SCIENCES / HISTOIRE / GÉOGRAPHIE ===
  {
    id: "les_ce2_dec_eau",
    niveau: "CE2",
    matiere: "Sciences",
    category: "Sciences",
    title: "Les trois états de l'eau 💧❄️💨",
    explication: "Sur la Terre, l'eau existe sous trois formes différentes : liquide, solide, ou gaz.",
    astuce: "L'eau change d'état à cause de la température. Le froid la durcit, la chaleur la fait s'évaporer !",
    memo: "- État liquide : eau du robinet, pluie, mer.\n- État solide (froid < 0°C) : glace, neige, givre.\n- État gazeux (chaleur) : vapeur d'eau (invisible).\n- La glace fond à 0°C.",
    exemple: "Quand tu mets de l'eau au congélateur, elle devient solide (glaçon). Quand tu fais bouillir de l'eau dans une casserole, elle s'échappe sous forme de vapeur (gaz).",
    pieges: "La vapeur d'eau est un gaz invisible ! Le petit nuage blanc au-dessus de la bouilloire est en fait de l'eau déjà refroidie en micro-gouttelettes liquides.",
    schemas: ["💧 Liquide (Pluie)", "❄️ Solide (Glaçon < 0°C)", "💨 Gazeux (Vapeur > 100°C)"]
  },
  {
    id: "les_cm1_dec_pharaons",
    niveau: "CM1",
    matiere: "Histoire",
    category: "Histoire",
    title: "L'Égypte des pharaons 🏺",
    explication: "Dans l'Égypte antique, le pharaon était le roi absolu. Il était considéré comme un dieu vivant et régnait sur tout le peuple le long du fleuve Nil.",
    astuce: "Les pharaons construisaient des pyramides géantes pour servir de tombeaux et protéger leur momie !",
    memo: "- Pharaon : souverain d'Égypte antique.\n- Les pyramides : tombeaux géants en pierre.\n- La momification : méthode pour conserver les corps.\n- Toutânkhamon et Ramsès II sont très célèbres.",
    exemple: "Toutânkhamon est devenu célèbre car son tombeau a été retrouvé en 1922 rempli d'or, de bijoux et de masques royaux intacts.",
    pieges: "Les pyramides n'étaient pas des palais pour habiter, mais des tombeaux funéraires sacrés.",
    schemas: ["▲ Pyramide (Tombeau)", "𓀾 Pharaon (Dieu-Roi)"]
  },
  {
    id: "les_geo_oceans",
    niveau: "CE2",
    matiere: "Géographie",
    category: "Géographie",
    title: "Océans et Continents 🌎",
    explication: "Notre planète Terre possède 5 grands océans d'eau salée et 6 grands continents de terre ferme.",
    astuce: "L'océan Pacifique est le plus grand et couvre à lui seul un tiers de la surface terrestre !",
    memo: "- Les 5 Océans : Pacifique, Atlantique, Indien, Arctique, Antarctique.\n- Les 6 Continents : Asie, Afrique, Amérique, Europe, Océanie, Antarctique.\n- L'Asie est le plus grand continent.",
    exemple: "La France est située sur le continent européen, et elle est bordée par l'océan Atlantique.",
    pieges: "Ne pas confondre l'Arctique (au pôle Nord, sans terre ferme sous la glace) et l'Antarctique (au pôle Sud, qui est un vrai continent rocheux sous la glace).",
    schemas: ["🌎 Océan Pacifique (Le plus grand)", "🗺️ Continent Asiatique (Le plus peuplé)"]
  },
  {
    id: "les_lecture_recit",
    niveau: "CE1",
    matiere: "Lecture",
    category: "Lecture",
    title: "Comprendre les personnages d'un récit 📖",
    explication: "Dans une histoire, le personnage principal (le héros) a toujours un but (une quête) et rencontre des obstacles (des épreuves).",
    astuce: "Repère les alliés du héros (les amis qui l'aident) et les opposants (les ennemis qui lui barrent le passage) !",
    memo: "- Héros/Héroïne : personnage central.\n- Quête : l'objectif ou la mission du héros.\n- Schéma narratif : Début -> Élément perturbateur -> Aventures -> Résolution -> Fin.",
    exemple: "Dans le Petit Chaperon Rouge, le Chaperon est l'héroïne, sa quête est d'apporter des galettes à sa grand-mère, et le loup est l'opposant.",
    pieges: "Parfois, le personnage principal n'est pas humain, il peut s'agir d'un animal (comme dans les Fables de La Fontaine) ou d'un objet magique.",
    schemas: ["📖 Récit : Début ➔ Problème ➔ Aventures ➔ Fin", "🦸‍♂️ Héros / 🤝 Alliés / 🦹‍♂️ Opposants"]
  },
  {
    id: "les_culture_instruments",
    niveau: "CE2",
    matiere: "Culture",
    category: "Culture",
    title: "Les familles d'instruments de musique 🎵",
    explication: "Les instruments de musique sont regroupés en 3 grandes familles selon la manière dont ils fabriquent le son : les cordes, les vents et les percussions.",
    astuce: "Pour savoir à quelle famille appartient un instrument, demande-toi : que fait le musicien pour en jouer ? Frotter, souffler ou taper ?",
    memo: "- Les cordes : frottées (violon), pincées (guitare, harpe) ou frappées (piano).\n- Les vents : les bois (flûte, clarinette) et les cuivres (trompette, trombone).\n- Les percussions : frappées (tambour, xylophone).",
    exemple: "Bien qu'il ait des touches, le piano est un instrument à cordes frappées : appuyer sur une touche actionne un petit marteau qui frappe une corde cachée.",
    pieges: "La flûte traversière est dans la famille des bois, même si elle est fabriquée en métal aujourd'hui !",
    schemas: ["🎻 Cordes (Violon, Harpe)", "🎺 Vents (Flûte, Trompette)", "🥁 Percussions (Tambour, Triangle)"]
  },

  // === LANGUES ===
  {
    id: "les_cp_lan_colors",
    niveau: "CP",
    matiere: "Langues",
    category: "Anglais",
    title: "Les couleurs en anglais 🎨",
    explication: "Les couleurs s'écrivent et se prononcent différemment en anglais. C'est utile pour décrire les objets autour de toi !",
    astuce: "Amuse-toi à nommer la couleur des jouets dans ta chambre en anglais !",
    memo: "- Red = Rouge\n- Blue = Bleu\n- Yellow = Jaune\n- Green = Vert\n- Black = Noir\n- White = Blanc",
    exemple: "Une pomme rouge se dit 'A red apple'. Remarque que la couleur se place avant l'objet en anglais !",
    pieges: "Attention : l'adjectif de couleur s'écrit TOUJOURS avant le nom en anglais, et il ne prend jamais de 's' au pluriel (ex: 'green apples').",
    schemas: ["🔴 Red", "🔵 Blue", "🟡 Yellow", "🟢 Green"]
  },
  {
    id: "les_ce2_lan_wolof",
    niveau: "CE2",
    matiere: "Langues",
    category: "Wolof",
    title: "Saluer en Wolof 🇸🇳",
    explication: "Le Wolof est la langue nationale du Sénégal. Saluer chaleureusement est une coutume essentielle appelée la Téranga.",
    astuce: "Demander comment va la personne et sa famille fait partie intégrante de la politesse en Wolof !",
    memo: "- Na nga def ? : Comment vas-tu ?\n- Mangi fi rekk : Je vais bien seulement.\n- Jërëjëf : Merci.\n- Naka sa wa kër ? : Comment va ta famille ?",
    exemple: "Quand tu rencontres un ami, tu lui dis 'Na nga def ?'. Il te répond poliment 'Mangi fi rekk, jërëjëf !'.",
    pieges: "L'intonation est importante pour bien se faire comprendre. La politesse exige de saluer d'abord les aînés.",
    schemas: ["🇸🇳 Wolof Salutations", "🗣️ Na nga def ? ➔ Mangi fi rekk"]
  },
  {
    id: "les_6e_lan_irregular",
    niveau: "6e",
    matiere: "Anglais",
    category: "Anglais",
    title: "Verbes irréguliers essentiels 🇬🇧",
    explication: "En anglais, beaucoup de verbes courants ne prennent pas '-ed' au prétérit (le passé). Leurs formes passées doivent être apprises par cœur.",
    astuce: "Apprends-les par groupes de sonorités pour t'en souvenir plus facilement (ex. sing-sang-sung, ring-rang-rung) !",
    memo: "- to be : was/were, been (être)\n- to have : had, had (avoir)\n- to do : did, done (faire)\n- to go : went, gone (aller)\n- to see : saw, seen (voir)",
    exemple: "Pour dire 'Je suis allé à l'école hier', tu n'écris pas 'I goed', mais 'I went to school yesterday' car 'go' est irrégulier.",
    pieges: "N'ajoute jamais de '-ed' aux verbes irréguliers au passé ! C'est une faute très courante.",
    schemas: ["Base verbale ➔ Prétérit ➔ Participe Passé", "Go ➔ Went ➔ Gone"]
  }
];

export const staticAcademyQuestions: AcademyQuestion[] = [
  // ================= CP =================
  {
    id: "cp_dec_1",
    niveau: "CP",
    matiere: "Découverte",
    competence: "sciences",
    chapitre: "Les animaux",
    question: "Lequel de ces animaux vit dans l'eau ?",
    options: ["Le chat", "Le poisson", "Le chien", "Le lapin"],
    reponse: "Le poisson",
    explication: "Le poisson a des branchies pour respirer sous l'eau et des nageoires pour se déplacer.",
    indice: "Il a des écailles et des nageoires.",
    difficulte: 1,
    xp: 10,
    etoiles: 1
  },
  {
    id: "cp_dec_2",
    niveau: "CP",
    matiere: "Découverte",
    competence: "sciences",
    chapitre: "Le corps humain",
    question: "Avec quelle partie du corps écoutes-tu de la musique ?",
    options: ["Les yeux", "Le nez", "Les oreilles", "La bouche"],
    reponse: "Les oreilles",
    explication: "Les oreilles sont les organes de l'ouïe, elles permettent de capter les sons.",
    indice: "Elles sont situées de chaque côté de ta tête.",
    difficulte: 1,
    xp: 10,
    etoiles: 1
  },
  {
    id: "cp_fra_1",
    niveau: "CP",
    matiere: "Français",
    competence: "orthographe",
    chapitre: "Les sons de base",
    question: "Quel mot contient le son [ou] ?",
    options: ["Maman", "Loup", "Bébé", "Chat"],
    reponse: "Loup",
    explication: "Le mot 'Loup' s'écrit avec 'ou' qui donne le son [ou].",
    indice: "C'est un animal sauvage des forêts.",
    difficulte: 1,
    xp: 10,
    etoiles: 1
  },
  {
    id: "cp_lan_1",
    niveau: "CP",
    matiere: "Langues",
    competence: "anglais",
    chapitre: "Les couleurs",
    question: "Que signifie 'Blue' en anglais ?",
    options: ["Rouge", "Bleu", "Jaune", "Vert"],
    reponse: "Bleu",
    explication: "Le mot 'Blue' se traduit par 'Bleu' en français.",
    indice: "C'est la couleur du ciel dégagé.",
    difficulte: 1,
    xp: 10,
    etoiles: 1
  },
  {
    id: "cp_lan_2",
    niveau: "CP",
    matiere: "Langues",
    competence: "anglais",
    chapitre: "Les animaux",
    question: "Quel animal est un 'Cat' ?",
    options: ["Un chat", "Un chien", "Un oiseau", "Un lion"],
    reponse: "Un chat",
    explication: "Un 'Cat' est un chat en anglais.",
    indice: "Il fait 'miaou'.",
    difficulte: 1,
    xp: 10,
    etoiles: 1
  },

  // ================= CE1 =================
  {
    id: "ce1_dec_1",
    niveau: "CE1",
    matiere: "Découverte",
    competence: "sciences",
    chapitre: "Le système solaire",
    question: "Quelle planète est appelée la 'Planète rouge' ?",
    options: ["La Terre", "Mars", "Jupiter", "Vénus"],
    reponse: "Mars",
    explication: "Mars a une couleur rougeâtre due à l'abondance d'oxyde de fer (rouille) sur sa surface.",
    indice: "C'est la quatrième planète à partir du Soleil.",
    difficulte: 1,
    xp: 12,
    etoiles: 1
  },
  {
    id: "ce1_dec_2",
    niveau: "CE1",
    matiere: "Découverte",
    competence: "culture",
    chapitre: "Histoire de France",
    question: "Quel château célèbre a été construit par le Roi Soleil (Louis XIV) ?",
    options: ["Le château de Versailles", "Le château de Chambord", "Le Louvre", "Le château d'If"],
    reponse: "Le château de Versailles",
    explication: "Louis XIV a transformé un pavillon de chasse en un magnifique et immense palais royal à Versailles.",
    indice: "Il est célèbre pour sa galerie des Glaces et ses grands jardins.",
    difficulte: 2,
    xp: 15,
    etoiles: 2
  },
  {
    id: "ce1_fra_1",
    niveau: "CE1",
    matiere: "Français",
    competence: "orthographe",
    chapitre: "Pluriel des noms",
    question: "Quel est le pluriel du mot 'cheval' ?",
    options: ["Chevals", "Chevales", "Chevaux", "Chevalx"],
    reponse: "Chevaux",
    explication: "Les noms se terminant par '-al' font généralement leur pluriel en '-aux'.",
    indice: "La terminaison change complètement.",
    difficulte: 2,
    xp: 12,
    etoiles: 1
  },
  {
    id: "ce1_lan_1",
    niveau: "CE1",
    matiere: "Langues",
    competence: "anglais",
    chapitre: "Les nombres",
    question: "Combien fait 'Three' + 'Four' ?",
    options: ["Five", "Six", "Seven", "Eight"],
    reponse: "Seven",
    explication: "Three (3) plus Four (4) fait Seven (7).",
    indice: "3 + 4 = 7",
    difficulte: 1,
    xp: 12,
    etoiles: 1
  },
  {
    id: "ce1_lan_2",
    niveau: "CE1",
    matiere: "Langues",
    competence: "anglais",
    chapitre: "Salutations",
    question: "Comment dit-on 'Bonjour' le matin en anglais ?",
    options: ["Good afternoon", "Good morning", "Good night", "Goodbye"],
    reponse: "Good morning",
    explication: "On dit 'Good morning' le matin, 'Good afternoon' l'après-midi, et 'Good night' pour souhaiter une bonne nuit.",
    indice: "Morning signifie matin.",
    difficulte: 1,
    xp: 10,
    etoiles: 1
  },

  // ================= CE2 =================
  {
    id: "ce2_dec_1",
    niveau: "CE2",
    matiere: "Découverte",
    competence: "sciences",
    chapitre: "Les états de l'eau",
    question: "À quelle température l'eau pure se transforme-t-elle en glace ?",
    options: ["10°C", "0°C", "50°C", "100°C"],
    reponse: "0°C",
    explication: "Le point de congélation de l'eau pure sous pression atmosphérique standard est de 0°C.",
    indice: "C'est la température minimale pour la neige.",
    difficulte: 1,
    xp: 12,
    etoiles: 1
  },
  {
    id: "ce2_dec_2",
    niveau: "CE2",
    matiere: "Découverte",
    competence: "culture",
    chapitre: "Géographie",
    question: "Quel océan se situe entre l'Europe et l'Amérique ?",
    options: ["L'océan Pacifique", "L'océan Atlantique", "L'océan Indien", "L'océan Arctique"],
    reponse: "L'océan Atlantique",
    explication: "L'océan Atlantique sépare l'ancien monde (Europe, Afrique) du nouveau monde (les Amériques).",
    indice: "C'est le deuxième plus grand océan du monde.",
    difficulte: 2,
    xp: 15,
    etoiles: 2
  },
  {
    id: "ce2_fra_1",
    niveau: "CE2",
    matiere: "Français",
    competence: "conjugaison",
    chapitre: "Les accords",
    question: "Dans 'Les oiseaux (chanter) le matin', comment conjugue-t-on le verbe au présent ?",
    options: ["chante", "chantes", "chantent", "chantons"],
    reponse: "chantent",
    explication: "Le sujet est 'Les oiseaux' (pluriel, 3ème personne du pluriel 'ils'), la terminaison est donc '-ent'.",
    indice: "Qui fait l'action ? Les oiseaux.",
    difficulte: 1,
    xp: 12,
    etoiles: 1
  },
  {
    id: "ce2_lan_wol_1",
    niveau: "CE2",
    matiere: "Langues",
    competence: "culture",
    chapitre: "Wolof de base",
    question: "Que signifie 'Na nga def' en Wolof ?",
    options: ["Comment vas-tu ?", "Merci beaucoup", "Au revoir", "Bon appétit"],
    reponse: "Comment vas-tu ?",
    explication: "'Na nga def' est la formule de salutation standard en wolof pour demander comment va une personne.",
    indice: "C'est la première chose que l'on dit pour saluer quelqu'un.",
    difficulte: 1,
    xp: 15,
    etoiles: 1
  },
  {
    id: "ce2_lan_wol_2",
    niveau: "CE2",
    matiere: "Langues",
    competence: "culture",
    chapitre: "Wolof de base",
    question: "Comment dit-on 'Merci' en Wolof ?",
    options: ["Jërëjëf", "Waaw", "Déedéet", "Amul solo"],
    reponse: "Jërëjëf",
    explication: "'Jërëjëf' signifie 'Merci' en wolof.",
    indice: "Commence par un J.",
    difficulte: 2,
    xp: 15,
    etoiles: 2
  },

  // ================= CM1 =================
  {
    id: "cm1_dec_1",
    niveau: "CM1",
    matiere: "Découverte",
    competence: "culture",
    chapitre: "Histoire ancienne",
    question: "Quel peuple de l'Antiquité a bâti le Colisée et le Panthéon ?",
    options: ["Les Égyptiens", "Les Grecs", "Les Romains", "Les Gaulois"],
    reponse: "Les Romains",
    explication: "Les Romains étaient de grands constructeurs et ont érigé le Colisée et le Panthéon à Rome.",
    indice: "Leur capitale était Rome.",
    difficulte: 1,
    xp: 12,
    etoiles: 1
  },
  {
    id: "cm1_dec_2",
    niveau: "CM1",
    matiere: "Découverte",
    competence: "sciences",
    chapitre: "Le corps humain",
    question: "Quel organe pompe le sang pour l'envoyer dans tout le corps ?",
    options: ["Le cerveau", "Les poumons", "Le cœur", "L'estomac"],
    reponse: "Le cœur",
    explication: "Le cœur est un muscle creux qui agit comme une pompe pour faire circuler le sang dans les vaisseaux sanguins.",
    indice: "Il bat dans ta poitrine.",
    difficulte: 1,
    xp: 12,
    etoiles: 1
  },
  {
    id: "cm1_fra_1",
    niveau: "CM1",
    matiere: "Français",
    competence: "orthographe",
    chapitre: "Homophones",
    question: "Complète la phrase : 'Il ___ parti ___ la campagne.'",
    options: ["est / a", "est / à", "et / à", "et / a"],
    reponse: "est / à",
    explication: "'est' est le verbe être au présent (il est). 'à' est la préposition indiquant le lieu (à la campagne).",
    indice: "Le premier est le verbe être, le second montre une direction.",
    difficulte: 2,
    xp: 15,
    etoiles: 2
  },
  {
    id: "cm1_mat_prob_1",
    niveau: "CM1",
    matiere: "Mathématiques",
    competence: "calcul",
    chapitre: "Problèmes de partage",
    question: "On partage 24 bonbons équitablement entre 6 enfants. Combien de bonbons aura chaque enfant ?",
    options: ["3 bonbons", "4 bonbons", "6 bonbons", "8 bonbons"],
    reponse: "4 bonbons",
    explication: "On divise le nombre total de bonbons par le nombre d'enfants : 24 ÷ 6 = 4.",
    indice: "Trouve quel nombre multiplié par 6 donne 24.",
    difficulte: 2,
    xp: 15,
    etoiles: 2
  },
  {
    id: "cm1_lan_1",
    niveau: "CM1",
    matiere: "Langues",
    competence: "anglais",
    chapitre: "Les vêtements",
    question: "Que signifie 'Shoes' en français ?",
    options: ["Chaussettes", "Pantalons", "Chaussures", "Chapeaux"],
    reponse: "Chaussures",
    explication: "Le mot 'Shoes' signifie 'Chaussures'.",
    indice: "On les porte aux pieds pour marcher dehors.",
    difficulte: 1,
    xp: 12,
    etoiles: 1
  },

  // ================= CM2 =================
  {
    id: "cm2_dec_1",
    niveau: "CM2",
    matiere: "Découverte",
    competence: "culture",
    chapitre: "Histoire moderne",
    question: "En quelle année a eu lieu la Révolution française (prise de la Bastille) ?",
    options: ["1492", "1789", "1815", "1914"],
    reponse: "1789",
    explication: "La prise de la Bastille a eu lieu le 14 juillet 1789, marquant le début de la Révolution française.",
    indice: "C'est à la fin du 18ème siècle.",
    difficulte: 2,
    xp: 15,
    etoiles: 2
  },
  {
    id: "cm2_dec_2",
    niveau: "CM2",
    matiere: "Découverte",
    competence: "sciences",
    chapitre: "La Terre",
    question: "Combien de temps met la Terre pour faire le tour complet du Soleil ?",
    options: ["24 heures", "28 jours", "365 jours", "10 ans"],
    reponse: "365 jours",
    explication: "La Terre met 365 jours et un quart (environ 1 an) pour effectuer sa révolution autour du Soleil.",
    indice: "Cela correspond à la durée d'une année standard.",
    difficulte: 1,
    xp: 12,
    etoiles: 1
  },
  {
    id: "cm2_fra_1",
    niveau: "CM2",
    matiere: "Français",
    competence: "conjugaison",
    chapitre: "Fonctions dans la phrase",
    question: "Dans la phrase : 'L'artiste peint un magnifique tableau', quelle est la fonction de 'un magnifique tableau' ?",
    options: ["Sujet", "Complément d'Objet Direct (COD)", "Complément d'Objet Indirect (COI)", "Complément Circonstanciel de Lieu"],
    reponse: "Complément d'Objet Direct (COD)",
    explication: "Il répond à la question : 'L'artiste peint QUOI ?' -> un magnifique tableau. C'est un COD.",
    indice: "Il complète le verbe directement sans préposition.",
    difficulte: 2,
    xp: 15,
    etoiles: 2
  },
  {
    id: "cm2_mat_prob_2",
    niveau: "CM2",
    matiere: "Mathématiques",
    competence: "calcul",
    chapitre: "Géométrie et aires",
    question: "Quelle est l'aire d'un rectangle de longueur 8 cm et de largeur 5 cm ?",
    options: ["13 cm²", "26 cm²", "40 cm²", "85 cm²"],
    reponse: "40 cm²",
    explication: "L'aire d'un rectangle se calcule en multipliant la longueur par la largeur : Aire = L × l = 8 × 5 = 40 cm².",
    indice: "Aire = Longueur × largeur.",
    difficulte: 2,
    xp: 15,
    etoiles: 2
  },
  {
    id: "cm2_lan_wol_3",
    niveau: "CM2",
    matiere: "Langues",
    competence: "culture",
    chapitre: "Wolof - Nombres",
    question: "Comment dit-on le nombre 5 en Wolof ?",
    options: ["Benn", "Ñaar", "Ñett", "Juróom"],
    reponse: "Juróom",
    explication: "En wolof, les nombres sont : 1 (Benn), 2 (Ñaar), 3 (Ñett), 4 (Ñeent), 5 (Juróom).",
    indice: "C'est le chiffre qui marque la fin des doigts d'une main.",
    difficulte: 2,
    xp: 15,
    etoiles: 2
  },

  // ================= 6e =================
  {
    id: "6e_dec_geo_1",
    niveau: "6e",
    matiere: "Découverte",
    competence: "culture",
    chapitre: "Géographie physique",
    question: "Quel est le plus long fleuve du monde ?",
    options: ["L'Amazone", "Le Nil", "Le Mississippi", "Le Yangzi Jiang"],
    reponse: "L'Amazone",
    explication: "L'Amazone est le plus grand fleuve du monde par son débit d'eau et sa longueur (bien que le Nil lui dispute parfois ce titre).",
    indice: "Il traverse la forêt tropicale d'Amérique du Sud.",
    difficulte: 2,
    xp: 15,
    etoiles: 2
  },
  {
    id: "6e_dec_sci_1",
    niveau: "6e",
    matiere: "Découverte",
    competence: "sciences",
    chapitre: "Biologie cellulaire",
    question: "Quelle partie de la cellule végétale contient la chlorophylle nécessaire à la photosynthèse ?",
    options: ["Le noyau", "Le chloroplaste", "La vacuole", "La membrane"],
    reponse: "Le chloroplaste",
    explication: "Les chloroplastes sont des organites des cellules végétales qui captent l'énergie lumineuse grâce à la chlorophylle.",
    indice: "Son nom ressemble à chlorophylle.",
    difficulte: 2,
    xp: 15,
    etoiles: 2
  },
  {
    id: "6e_fra_orth_1",
    niveau: "6e",
    matiere: "Français",
    competence: "orthographe",
    chapitre: "Participe passé",
    question: "Dans la phrase : 'Les lettres que j'ai (écrire)', comment s'accorde le participe passé ?",
    options: ["écrit", "écrite", "écrits", "écrites"],
    reponse: "écrites",
    explication: "Le participe passé conjugué avec l'auxiliaire 'avoir' s'accorde avec le COD s'il est placé devant le verbe. Ici, le COD est 'que' (mis pour 'les lettres', féminin pluriel).",
    indice: "Le COD est placé avant l'auxiliaire.",
    difficulte: 3,
    xp: 20,
    etoiles: 3
  },
  {
    id: "6e_lan_ang_1",
    niveau: "6e",
    matiere: "Langues",
    competence: "anglais",
    chapitre: "Verbes irréguliers",
    question: "Quel est le prétérit du verbe irrégulier 'to go' ?",
    options: ["goed", "went", "gone", "was"],
    reponse: "went",
    explication: "Le verbe 'to go' (aller) est irrégulier. Ses formes sont : go (base), went (prétérit), gone (participe passé).",
    indice: "C'est une forme très courante et très différente de 'go'.",
    difficulte: 2,
    xp: 15,
    etoiles: 2
  },

  // ================= 5e =================
  {
    id: "5e_dec_hist_1",
    niveau: "5e",
    matiere: "Découverte",
    competence: "culture",
    chapitre: "Moyen Âge",
    question: "Quel grand empire d'Occident Charlemagne a-t-il été couronné empereur en l'an 800 ?",
    options: ["L'Empire romain", "L'Empire carolingien", "Le Royaume de France", "Le Saint-Empire romain germanique"],
    reponse: "L'Empire carolingien",
    explication: "Le couronnement de Charlemagne à Rome en 800 marque la restauration de l'Empire en Occident, appelé empire carolingien.",
    indice: "Le nom de l'empire dérive de 'Charles' (Carolus).",
    difficulte: 2,
    xp: 15,
    etoiles: 2
  },
  {
    id: "5e_dec_sci_1",
    niveau: "5e",
    matiere: "Découverte",
    competence: "sciences",
    chapitre: "Volcanisme",
    question: "Comment appelle-t-on la roche fondue située sous la surface de la Terre avant qu'elle ne soit expulsée ?",
    options: ["La lave", "Le magma", "Le basalte", "Le granite"],
    reponse: "Le magma",
    explication: "Le magma est de la roche en fusion située sous la croûte terrestre. Une fois à l'air libre, on l'appelle de la lave.",
    indice: "Il commence par la lettre M.",
    difficulte: 1,
    xp: 12,
    etoiles: 1
  },
  {
    id: "5e_fra_gram_1",
    niveau: "5e",
    matiere: "Français",
    competence: "conjugaison",
    chapitre: "Conditionnel présent",
    question: "Quelle phrase contient un verbe au conditionnel présent ?",
    options: [
      "Si tu viens, nous jouerons.",
      "Si tu venais, nous jouerions.",
      "Nous jouons maintenant.",
      "Nous avons joué hier."
    ],
    reponse: "Si tu venais, nous jouerions.",
    explication: "'jouerions' est conjugué au conditionnel présent (radical du futur + terminaisons de l'imparfait).",
    indice: "Il exprime une hypothèse ou un souhait.",
    difficulte: 3,
    xp: 20,
    etoiles: 3
  },
  {
    id: "5e_lan_esp_1",
    niveau: "5e",
    matiere: "Langues",
    competence: "culture",
    chapitre: "Espagnol de base",
    question: "Comment dit-on 'Comment t'appelles-tu ?' en espagnol ?",
    options: ["¿Cómo estás?", "¿De dónde eres?", "¿Cómo te llamas?", "¿Qué tal?"],
    reponse: "¿Cómo te llamas?",
    explication: "'¿Cómo te llamas?' se traduit par 'Comment t'appelles-tu ?'.",
    indice: "C'est relié au verbe 'llamarse' (s'appeler).",
    difficulte: 1,
    xp: 12,
    etoiles: 1
  },

  // ================= 4e =================
  {
    id: "4e_dec_hist_1",
    niveau: "4e",
    matiere: "Découverte",
    competence: "culture",
    chapitre: "XVIIIe siècle",
    question: "Quel mouvement philosophique européen a inspiré la Révolution française et américaine ?",
    options: ["La Renaissance", "L'Humanisme", "Les Lumières", "Le Romantisme"],
    reponse: "Les Lumières",
    explication: "Le mouvement des Lumières (porté par Rousseau, Voltaire, Montesquieu) a prôné la liberté et la raison au XVIIIe siècle.",
    indice: "Ils apportaient la clarté contre l'obscurantisme.",
    difficulte: 2,
    xp: 15,
    etoiles: 2
  },
  {
    id: "4e_dec_sci_1",
    niveau: "4e",
    matiere: "Découverte",
    competence: "sciences",
    chapitre: "Optique",
    question: "Quelle est la vitesse de la lumière dans le vide ?",
    options: ["300 000 m/s", "340 m/s", "300 000 km/s", "150 000 000 km/h"],
    reponse: "300 000 km/s",
    explication: "La lumière se propage dans le vide à environ 300 000 kilomètres par seconde (exactement 299 792 km/s).",
    indice: "Elle parcourt la distance Terre-Lune en un peu plus d'une seconde.",
    difficulte: 2,
    xp: 15,
    etoiles: 2
  },
  {
    id: "4e_mat_prob_1",
    niveau: "4e",
    matiere: "Mathématiques",
    competence: "calcul",
    chapitre: "Théorème de Pythagore",
    question: "Dans un triangle rectangle, le carré de l'hypoténuse est égal à :",
    options: [
      "La somme des autres côtés",
      "Le produit des autres côtés",
      "La somme des carrés des deux autres côtés",
      "La différence des carrés des autres côtés"
    ],
    reponse: "La somme des carrés des deux autres côtés",
    explication: "D'après le théorème de Pythagore, dans un triangle rectangle, AC² = AB² + BC², où AC est l'hypoténuse.",
    indice: "Formule célèbre : a² + b² = c².",
    difficulte: 2,
    xp: 15,
    etoiles: 2
  },
  {
    id: "4e_lan_ang_1",
    niveau: "4e",
    matiere: "Langues",
    competence: "anglais",
    chapitre: "Voix passive",
    question: "Quelle phrase est à la voix passive ?",
    options: [
      "The dog bit the cat.",
      "The cat was bitten by the dog.",
      "The dog is biting the cat.",
      "The dog will bite the cat."
    ],
    reponse: "The cat was bitten by the dog.",
    explication: "'The cat was bitten by the dog' utilise l'auxiliaire be au prétérit suivi du participe passé, ce qui caractérise la voix passive.",
    indice: "Le sujet de la phrase subit l'action.",
    difficulte: 3,
    xp: 20,
    etoiles: 3
  },

  // ================= 3e =================
  {
    id: "3e_dec_hist_1",
    niveau: "3e",
    matiere: "Découverte",
    competence: "culture",
    chapitre: "Seconde Guerre Mondiale",
    question: "Quel événement a provoqué l'entrée des États-Unis dans la Seconde Guerre mondiale ?",
    options: [
      "Le débarquement en Normandie",
      "L'attaque de Pearl Harbor",
      "La bataille de Stalingrad",
      "L'invasion de la Pologne"
    ],
    reponse: "L'attaque de Pearl Harbor",
    explication: "L'attaque surprise de la base navale de Pearl Harbor à Hawaï par l'aviation japonaise le 7 décembre 1941 a fait entrer les USA en guerre.",
    indice: "C'était une base navale américaine située dans le Pacifique.",
    difficulte: 2,
    xp: 15,
    etoiles: 2
  },
  {
    id: "3e_dec_sci_1",
    niveau: "3e",
    matiere: "Découverte",
    competence: "sciences",
    chapitre: "Génétique",
    question: "Où se trouve l'information génétique (ADN) dans une cellule eucaryote ?",
    options: ["Dans le cytoplasme", "Dans les ribosomes", "Dans le noyau", "Dans la membrane plasmique"],
    reponse: "Dans le noyau",
    explication: "L'ADN des cellules eucaryotes est stocké de manière hautement condensée sous forme de chromosomes à l'intérieur du noyau.",
    indice: "C'est le centre de commande de la cellule.",
    difficulte: 1,
    xp: 12,
    etoiles: 1
  },
  {
    id: "3e_fra_gram_1",
    niveau: "3e",
    matiere: "Français",
    competence: "lecture",
    chapitre: "Genres littéraires",
    question: "Comment qualifie-t-on un récit à la première personne retraçant la vie de son auteur ?",
    options: ["Une biographie", "Une autobiographie", "Un essai", "Un roman d'apprentissage"],
    reponse: "Une autobiographie",
    explication: "L'autobiographie est un genre littéraire où l'auteur, le narrateur et le personnage principal ne font qu'un, racontant sa propre histoire.",
    indice: "Auto- signifie de soi-même.",
    difficulte: 2,
    xp: 15,
    etoiles: 2
  },
  {
    id: "3e_mat_prob_1",
    niveau: "3e",
    matiere: "Mathématiques",
    competence: "calcul",
    chapitre: "Probabilités",
    question: "On lance un dé équilibré à 6 faces. Quelle est la probabilité d'obtenir un nombre pair ?",
    options: ["1/6", "1/3", "1/2", "2/3"],
    reponse: "1/2",
    explication: "Les nombres pairs sur un dé à 6 faces sont 2, 4 et 6 (3 résultats favorables). La probabilité est de 3/6, ce qui se simplifie en 1/2 (ou 50%).",
    indice: "Il y a autant de nombres pairs que de nombres impairs.",
    difficulte: 2,
    xp: 15,
    etoiles: 2
  },

  // ================= Lycée =================
  {
    id: "lyc_dec_phy_1",
    niveau: "Lycée",
    matiere: "Découverte",
    competence: "sciences",
    chapitre: "Chimie organique",
    question: "Quel élément chimique est la base de toutes les molécules organiques ?",
    options: ["L'oxygène", "L'azote", "Le carbone", "L'hydrogène"],
    reponse: "Le carbone",
    explication: "Le carbone a la capacité unique de former des liaisons covalentes stables avec lui-même et de nombreux autres atomes, formant les chaînes carbonées de la vie.",
    indice: "Son symbole chimique est C.",
    difficulte: 1,
    xp: 15,
    etoiles: 1
  },
  {
    id: "lyc_dec_phi_1",
    niveau: "Lycée",
    matiere: "Découverte",
    competence: "culture",
    chapitre: "Philosophie",
    question: "À quel philosophe attribue-t-on la célèbre maxime 'Je pense, donc je suis' ?",
    options: ["Platon", "René Descartes", "Emmanuel Kant", "Friedrich Nietzsche"],
    reponse: "René Descartes",
    explication: "René Descartes l'a formulée dans le 'Discours de la méthode' (1637) pour établir la première certitude incontestable de sa philosophie.",
    indice: "C'est un penseur rationaliste français du XVIIe siècle.",
    difficulte: 2,
    xp: 18,
    etoiles: 2
  },
  {
    id: "lyc_mat_1",
    niveau: "Lycée",
    matiere: "Mathématiques",
    competence: "calcul",
    chapitre: "Dérivées",
    question: "Quelle est la dérivée de la fonction f(x) = x² sur R ?",
    options: ["f'(x) = 2", "f'(x) = x", "f'(x) = 2x", "f'(x) = 2x²"],
    reponse: "f'(x) = 2x",
    explication: "D'après les formules de dérivation de base, la dérivée de x^n est n * x^(n-1). Pour x², cela donne 2 * x^1 = 2x.",
    indice: "La puissance descend devant le x.",
    difficulte: 2,
    xp: 18,
    etoiles: 2
  },
  {
    id: "lyc_lan_ang_1",
    niveau: "Lycée",
    matiere: "Langues",
    competence: "anglais",
    chapitre: "Subjonctif et souhaits",
    question: "Complète la phrase : 'I wish he ___ here now.'",
    options: ["is", "was", "were", "be"],
    reponse: "were",
    explication: "Après 'wish', pour exprimer un regret au présent, on utilise le subjonctif passé (ou prétérit modal). La forme 'were' est préférée à toutes les personnes (I wish I were, I wish he were).",
    indice: "C'est un prétérit modal, singulier comme pluriel utilisent 'were'.",
    difficulte: 3,
    xp: 22,
    etoiles: 3
  }
];
