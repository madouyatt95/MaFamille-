import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  ArrowLeft, 
  Volume2, 
  VolumeX, 
  BookOpen, 
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Music,
  Sliders,
  Sparkle,
  Plus,
  Shield,
  Check,
  RefreshCw
} from 'lucide-react';
import { aiQuotaService } from '../../services/aiQuotaService';

interface ConteurIAProps {
  onBack: () => void;
  members: any[];
  isPremium?: boolean;
  onTriggerPaywall?: () => void;
}

interface Universe {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  bgGlow: string;
  themeColor: string;
}

interface Moral {
  id: string;
  name: string;
  emoji: string;
  desc: string;
}

const UNIVERSES: Universe[] = [
  { id: 'espace', name: 'L\'Espace Intersidéral', emoji: '🚀', desc: 'Planètes en sucre filé, nébuleuses chantantes et étoiles filantes chatouilleuses', bgGlow: 'from-indigo-950 via-purple-950 to-slate-950', themeColor: '#8B5CF6' },
  { id: 'foret', name: 'La Forêt Enchantée', emoji: '🌲', desc: 'Arbres centenaires bavards, champignons lumineux et ruisseaux de murmures', bgGlow: 'from-emerald-950 via-teal-950 to-slate-950', themeColor: '#10B981' },
  { id: 'dinos', name: 'Le Royaume des Dinos', emoji: '🦕', desc: 'Bébés tricératops espiègles, volcans de chocolat tiède et fougères géantes en guimauve', bgGlow: 'from-amber-950 via-orange-950 to-slate-950', themeColor: '#F59E0B' },
  { id: 'ocean', name: 'L\'Océan Mystérieux', emoji: '🐙', desc: 'Poissons-lanternes farceurs, cités de nacre et baleines conteuses d\'histoires', bgGlow: 'from-sky-950 via-cyan-950 to-slate-950', themeColor: '#0EA5E9' },
  { id: 'bonbons', name: 'Le Monde des Bonbons', emoji: '🍭', desc: 'Rivières de sirop de fraise, collines de chocolat blanc et nuages en barbe à papa', bgGlow: 'from-pink-950 via-rose-950 to-slate-950', themeColor: '#EC4899' }
];

const MORALS: Moral[] = [
  { id: 'partage', name: 'Le Partage', emoji: '🤝', desc: 'Apprendre la joie d\'offrir et la douceur d\'être unis' },
  { id: 'courage', name: 'Le Courage', emoji: '🦁', desc: 'Dépasser ses petites craintes pour découvrir sa force intérieure' },
  { id: 'amitie', name: 'L\'Amitié', emoji: '🧸', desc: 'S\'entraider fidèlement et rire ensemble face aux défis' },
  { id: 'curiosite', name: 'La Curiosité', emoji: '🔍', desc: 'Savoir s\'émerveiller et explorer le monde pour apprendre' },
  { id: 'perseverance', name: 'La Persévérance', emoji: '🎯', desc: 'Garder le sourire et continuer d\'essayer jusqu\'à réussir ses rêves' }
];

// Rich Bedtime Story Database with extremely descriptive, long paragraphs, extensive dialogues, and poetic atmosphere
const generateExtensiveStory = (hero: string, universeId: string, moralId: string) => {
  const universe = UNIVERSES.find(u => u.id === universeId) || UNIVERSES[0];
  
  let title = '';
  let chapters: { title: string; content: string[] }[] = [];

  if (universeId === 'espace') {
    title = `L'Étoile Rêveuse et le Secret de la Constellation Infinie`;
    chapters = [
      {
        title: "Chapitre I : L'Appel du Ciel Étoilé",
        content: [
          `Il était une fois, dans une jolie maison endormie sous une couverture de brume argentée, un(e) enfant au cœur rempli d'imagination nommé(e) ${hero}. Ce soir-là, alors que la lune veillait doucement, ${hero} remarqua un événement étrange par la fenêtre de sa chambre. Une minuscule navette étincelante, sculptée dans un cristal de verre givré de couleur lilas, se posa sans un bruit sur le tapis. Les moteurs de la navette émettaient un doux bruissement, semblable au ronronnement d'un chaton paisible.`,
          `Poussé(e) par une irrésistible envie d'explorer, ${hero} s'approcha à pas de loup et ouvrit la petite porte de verre. À l'intérieur, un petit tableau de bord en pain d'épices scintillait joyeusement. « Bienvenue à bord, aventurier(e) de la nuit ! » chuchota une voix douce et mélodieuse qui semblait venir des étoiles. Sans hésiter une seule seconde, ${hero} prit place sur le siège en mousse de barbe à papa et la navette décolla silencieusement, filant à toute allure vers les confins de l'Espace Intersidéral.`,
          `Le voyage était tout simplement majestueux. Par le hublot panoramique, ${hero} contemplait des constellations entières de bonbons acidulés qui brillaient de mille feux dans le vide cosmique. Des nébuleuses de couleur pastel se balançaient doucement au rythme d'une berceuse céleste lointaine, tandis que de gentilles comètes de réglisse passaient en laissant derrière elles des traînées de poussière dorée et scintillante.`
        ]
      },
      {
        title: "Chapitre II : La Rencontre Magique",
        content: [
          moralId === 'partage' 
            ? `Après avoir traversé un grand anneau de sucre glace autour de Saturne, la navette ralentit près d'une petite planète oubliée. Là, assis sur un cratère en chocolat, se tenait Piko, un minuscule extraterrestre aux grands yeux rieurs et à la peau bleu turquoise. Mais ce soir, Piko était triste. Il pleurait de chaudes larmes d'argent qui se transformaient instantanément en petites étoiles filantes. « Bonjour, je m'appelle Piko, dit-il d'une voix tremblante. Les feux de ma planète se sont éteints, et mes amis n'ont plus de lumière pour s'endormir ce soir... »`
            : moralId === 'courage'
            ? `Soudain, alors que la navette glissait paisiblement, le ciel s'assombrit brusquement. Une gigantesque tempête de comètes de réglisse commença à gronder tout autour d'eux, faisant tanguer le vaisseau de cristal. Piko, le petit robot de bord, commença à trembler de tous ses boulons. « Oh non ! Les courants cosmiques sont trop forts ! Si nous perdons le contrôle, nous allons nous égarer dans le grand vide noir ! » s'écria-t-il avec panique. ${hero} sentit son petit cœur battre très fort dans sa poitrine, mais il/elle savait qu'il fallait agir.`
            : `La navette atterrit doucement sur une comète de cristal étincelante. En sortant, ${hero} fit la connaissance de Nova, un adorable petit chien de l'espace aux oreilles bleues scintillantes qui aboyait joyeusement en faisant des pirouettes en apesanteur. Mais Nova s'était égaré en voulant attraper une étoile filante et ne retrouvait plus son chemin. « Wouf ! Bonjour ! Je cherche ma maison près de la Grande Ourse, mais toutes ces constellations se ressemblent tant, wouf ! » dit-il en remuant tristement sa queue lumineuse.`,
          
          moralId === 'partage'
            ? `${hero} fouilla avec attention dans sa poche et y trouva un sachet de sablés dorés à la vanille, préparés avec amour l'après-midi même. Avec un sourire bienveillant, ${hero} s'approcha de Piko : « Tiens, prenons-les ensemble, le partage rend tout plus joyeux ! » Ensemble, ils dégustèrent les sablés. Magiquement, chaque miette dorée tombant au sol se mit à grandir et à scintiller, libérant une immense énergie lumineuse. La planète entière de Piko s'illumina instantanément d'une splendide lueur bleu lagon chaleureuse et réconfortante.`
            : moralId === 'courage'
            ? `${hero} prit une grande inspiration, ferma les yeux une seconde pour rassembler toutes ses forces, puis attrapa fermement les commandes de la navette. D'une voix claire et douce, il/elle commença à chanter la berceuse que sa maman lui fredonnait chaque soir. Sa voix, portée par les haut-parleurs magiques de la navette, résonna à travers l'espace. Incroyablement, la douceur des paroles calma les vents cosmiques. La tempête de comètes se dissipa, se transformant en une pluie inoffensive de confettis argentés.`
            : `${hero} s'agenouilla devant Nova et lui caressa doucement le dos. « Ne t'inquiète pas, petit Nova, nous allons faire équipe et trouver la solution ensemble ! » dit-il/elle avec assurance. Nova utilisa ses oreilles pour écouter les vibrations du vent stellaire, tandis que ${hero} dessinait une carte des étoiles en reliant les points brillants sur l'écran tactile du vaisseau. Grâce à cette merveilleuse collaboration, le chemin vers la Grande Ourse apparut clairement sous la forme d'un magnifique toboggan de lumière dorée.`,
          
          moralId === 'partage'
            ? `Piko sauta de joie dans les bras de ${hero}. « Merci infiniment, aventurier(e) de la Terre ! Grâce à ta générosité, la nuit sera douce et belle pour tout le monde ici ! » Les habitants de la planète, sortant de leurs petites maisons de sucre, commencèrent à chanter en chœur pour célébrer ce geste de bonté.`
            : moralId === 'courage'
            ? `Piko ouvrit de grands yeux admiratifs. « Tu as été tellement brave ! Tu n'as pas fui face au danger, tu l'as affronté avec de la douceur et du sang-froid ! » La tempête avait laissé place à un calme absolu, et le ciel brillait désormais d'une pureté exceptionnelle, révélant des nébuleuses aux reflets irisés.`
            : `Nova poussa un jappement de pur bonheur et fit trois fois le tour de la navette avant de lécher affectueusement la main de ${hero}. « Wouf ! Merci mon ami(e) ! Ensemble, nous sommes bien plus forts que tout seul ! » La Grande Ourse brilla d'un éclat bienveillant dans le ciel nocturne pour saluer leur réussite.`
        ]
      },
      {
        title: "Chapitre III : Le Retour au Pays des Rêves",
        content: [
          `Pour remercier chaleureusement ${hero}, les habitants des étoiles lui offrirent un cadeau inestimable : une petite veilleuse en forme de croissant de lune, remplie de poussière d'étoile scintillante. Cette poussière magique avait le pouvoir de diffuser une douce chaleur et d'apporter les rêves les plus apaisants à quiconque la contemplait.`,
          `La navette spatiale de cristal prit alors le chemin du retour, glissant sur un rayon de lune velouté. Elle se posa à nouveau sur le tapis de la chambre, aussi discrète qu'un souffle d'air frais. ${hero} se glissa sous sa couette moelleuse, serrant fort la petite veilleuse magique contre son cœur. En fermant doucement les yeux, il/elle sentit la douce chaleur des étoiles envelopper toute sa chambre.`,
          `Alors que la lune veillait fidèlement au-dehors, ${hero} s'endormit paisiblement, l'esprit léger et le cœur rempli d'histoires merveilleuses. L'univers tout entier, avec ses constellations infinies et ses planètes chantantes, s'accorda en une douce symphonie silencieuse pour accompagner sa nuit. Fais de beaux rêves, ${hero}. L'espace t'attend pour d'autres voyages demain. Dors bien.`
        ]
      }
    ];
  }
  // 2. Enchanted Forest
  else if (universeId === 'foret') {
    title = `${hero} et la Cloche d'Argent de la Forêt Enchantée`;
    chapters = [
      {
        title: "Chapitre I : Le Passage Secret sous le Grand Chêne",
        content: [
          `Il était une fois, dans un petit cottage de campagne aux volets de couleur lavande, un(e) enfant curieux(se) et intrépide prénommé(e) ${hero}. Ce soir-là, alors que le soleil venait de se coucher en laissant une douce traînée de pourpre dans le ciel, ${hero} aperçut une clé dorée posée sur le rebord de sa fenêtre, suspendue à un ruban de soie verte. Intrigué(e), il/elle prit la clé et descendit dans le jardin pour rejoindre le vieux chêne centenaire.`,
          `Au pied de l'arbre géant, dissimulée derrière un rideau de lierre épais, se trouvait une petite porte en écorce sculptée. ${hero} glissa la clé dorée dans la serrure. La porte s'ouvrit avec un doux tintement de clochette, révélant un escalier de racine qui descendait vers la Forêt Enchantée. En posant le pied sur la mousse douce comme un tapis de laine, ${hero} vit que toute la forêt brillait d'une lueur émeraude fantastique.`,
          `Les fleurs s'ouvraient lentement pour libérer des petites lucioles bleues, roses et jaunes, qui s'organisaient en grappes lumineuses pour guider ses pas. Les arbres centenaires se balançaient en douceur, murmurant des poèmes oubliés dans le vent du soir, tandis que des petits lapins blancs aux oreilles dorées le/la regardaient passer avec des yeux remplis de malice et de bienveillance.`
        ]
      },
      {
        title: "Chapitre II : L'Énigme du Ruisseau de Cristal",
        content: [
          moralId === 'partage'
            ? `En arrivant près d'un magnifique pont de branches entrelacées, ${hero} fit la rencontre de Pipin, le gardien des chemins sylvestres. Pipin était un tout petit écureuil portant un gilet de feuilles sèches et un petit chapeau en forme de gland. Mais Pipin tremblait de froid, recroquevillé sous une grande feuille de fougère. « Bonjour voyageur(se), murmura-t-il. Le vent du nord a soufflé très fort ce soir, et j'ai perdu mon nid chaud... »`
            : moralId === 'courage'
            ? `Soudain, une ombre immense et sombre commença à s'étendre sur la forêt, masquant la jolie lumière des lucioles. C'était l'Ombre Grognon, un grand esprit de brume grise qui s'était égaré et qui, par tristesse, éteignait toutes les fleurs lumineuses sur son passage. Les lapins s'enfuirent dans leurs terriers et les lucioles tremblèrent de peur. « Chut, il arrive... » murmura une fleur de lys en fermant ses pétales. ${hero} sentit une pointe d'inquiétude, mais refusa de reculer.`
            : `Dans une clairière baignée de lumière argentée, ${hero} aperçut Willow, un petit faon aux yeux doux comme des noisettes et aux sabots brillants comme de la nacre. Willow était coincé de l'autre côté d'un ruisseau de cristal dont l'eau coulait trop rapidement pour lui. « Oh, je veux tellement rejoindre ma maman de l'autre côté, mais j'ai peur de glisser sur ces pierres mouillées ! » dit-il d'une petite voix craintive en regardant le courant.`,
          
          moralId === 'partage'
            ? `${hero} portait autour du cou une écharpe en laine très douce et bien chaude, tricotée par sa grand-mère. Sans hésiter une seconde, ${hero} s'approcha doucement de Pipin, détacha son écharpe et l'enroula tendrement autour du petit animal. « Tiens, petit Pipin, partageons ma chaleur, elle est faite pour cela ! » dit-il/elle avec tendresse. Aussitôt, l'écharpe se mit à briller d'une lumière dorée réconfortante, réchauffant instantanément le petit écureuil qui se mit à sautiller de joie.`
            : moralId === 'courage'
            ? `${hero} décida de faire preuve d'audace. Au lieu de se cacher, il/elle fit un pas en avant vers le grand nuage gris. D'une voix forte et chaleureuse, il/elle s'exclama : « Bonjour, grand nuage ! Tu n'as pas besoin d'être triste ou en colère. Viens plutôt écouter une jolie histoire avec nous ! » Surpris par tant de bravoure et de gentillesse, l'esprit de brume s'arrêta. Il commença à s'adoucir, à changer de couleur pour devenir blanc comme un mouton de laine, puis se dissipa en une brume parfumée.`
            : `${hero} s'approcha du bord du ruisseau et s'assit sur une grosse pierre pour se mettre à la hauteur du faon. « Ne t'en fais pas, Willow, nous allons le faire ensemble, pas après pas ! » dit-il/elle d'une voix apaisante. ${hero} repéra de grandes pierres plates stables et sauta gracieusement sur la première en tendant la main. Encouragé par cette complicité et cette confiance, Willow fit un petit bond courageux, puis un deuxième, jusqu'à traverser en toute sécurité.`,
          
          moralId === 'partage'
            ? `Pipin, ravi, offrit à ${hero} une noisette dorée magique : « Merci, généreux(se) ami(e) ! Ton geste de partage a réchauffé mon corps, mais surtout mon cœur ! » Toute la forêt sembla s'illuminer davantage pour célébrer ce moment de pure bonté.`
            : moralId === 'courage'
            ? `Les lucioles revinrent en grand nombre, entourant ${hero} d'une couronne de lumière scintillante. « Tu es le/la plus courageux(se) des aventuriers ! Ta voix a ramené la paix dans notre forêt sacrée ! » chuchotèrent les arbres centenaires.`
            : `Willow frotta gentiment son petit museau tout doux contre la joue de ${hero} en poussant de légers cris de bonheur. « Merci ! Grâce à ton aide et ton amitié, j'ai retrouvé ma famille et dépassé mes peurs ! »`
        ]
      },
      {
        title: "Chapitre III : La Douce Nuit des Bois",
        content: [
          `Pour le/la remercier de sa visite, le Grand Chêne fit tomber doucement une feuille dorée magique dans la main de ${hero}. Cette feuille avait la propriété extraordinaire de diffuser un léger parfum de lavande et de pin sauvage, idéal pour apaiser l'esprit avant de s'endormir.`,
          `Guidé(e) par la douce lumière des lucioles, ${hero} remonta l'escalier de racines et referma la petite porte en écorce avec précaution. De retour dans sa chambre chaleureuse, il/elle posa la feuille dorée sur sa table de chevet et se glissa avec délices sous sa couette douillette.`,
          `Un profond sentiment de sérénité enveloppa la pièce alors que la lune montait haut dans le ciel. Les yeux lourds de fatigue, ${hero} s'endormit paisiblement, rêvant d'écureuils rieurs, de faons courageux et de forêts de lumière émeraude. Dors bien, ${hero}, la forêt enchantée veille sur tes rêves les plus doux. Bonsoir.`
        ]
      }
    ];
  }
  // 3. Dinosaur Kingdom
  else if (universeId === 'dinos') {
    title = `L'Incroyable Vallée des Dinosaures de Sucre et le Volcan Chocolat`;
    chapters = [
      {
        title: "Chapitre I : Voyage dans le Temps Gourmand",
        content: [
          `Il était une fois, dans une maison baignée de la douce lumière du soir, un(e) jeune aventurier(e) curieux(se) nommé(e) ${hero}. Ce soir-là, en ouvrant son grand livre sur la préhistoire, ${hero} vit une petite étincelle orange s'échapper des pages illustrées. Soudain, une délicieuse odeur de cacao tiède et de biscuit chaud enveloppa toute sa chambre. Les pages du livre se mirent à tourner d'elles-mêmes à toute vitesse, créant un petit tourbillon de vent magique.`,
          `Sans avoir le temps d'avoir peur, ${hero} se sentit doucement flotter et atterrit en douceur sur un lit de mousse moelleuse. En ouvrant les yeux, il/elle découvrit un paysage extraordinaire : des arbres géants en sucre de canne, des collines de guimauve rose et, tout au bout de l'horizon, un grand volcan majestueux qui crachait des vagues paresseuses de chocolat chaud fumant. ${hero} venait de pénétrer dans le Royaume des Dinosaures Gourmands !`,
          `Tout y était paisible et coloré. Les dinosaures de ce monde fantastique étaient de gentilles créatures de la taille de petits chiots, couvertes d'une peau douce et parfumée. Des petits tricératops jouaient à cache-cache derrière des buissons de barbe à papa, tandis que des diplodocus miniatures se laissaient glisser le long des collines de gaufres en poussant des petits cris de joie.`
        ]
      },
      {
        title: "Chapitre II : Le Mystère du T-Rex Timide",
        content: [
          moralId === 'partage'
            ? `Alors qu'il/elle marchait joyeusement sur un chemin de biscuits sablés, ${hero} rencontra Choco, un bébé Diplodocus tout mignon. Choco pleurait près d'un grand arbre à bonbons car il avait très faim, mais son cou était trop court pour atteindre les feuilles de caramel situées au sommet. « Bonjour, dit Choco tristement. Je n'arrive pas à attraper mon dîner, et mon petit ventre fait de gros bruits... »`
            : moralId === 'courage'
            ? `Soudain, un grand bruit fit trembler le sol de guimauve. Un petit Tyrannosaure, haut comme trois pommes, surgit d'un buisson de réglisse. Il rugissait de toutes ses forces pour essayer de paraître effrayant, mais ses yeux étaient remplis de larmes. ${hero} remarqua immédiatement qu'il tenait sa petite patte droite en l'air : une grosse épine de sucre d'orge y était profondément enfoncée. Le petit dinosaure avait mal et avait peur qu'on lui fasse du mal.`
            : `Près d'une rivière de lait chaud, ${hero} fit la connaissance de Kiki, un petit Ptérodactyle aux ailes colorées comme des bonbons acidulés. Kiki voulait traverser la rivière pour rejoindre son nid au sommet de la falaise de meringue, mais ses petites ailes étaient fatiguées par le vent frais. « Oh, le courant est si rapide, si je tombe à l'eau je vais me mouiller les ailes et je ne pourrai plus voler ! » dit-il en frissonnant.`,
          
          moralId === 'partage'
            ? `${hero} décida de l'aider. Il/Elle monta agilement sur le dos d'un grand rocher de nougatine et cueillit délicatement les plus belles feuilles de caramel du sommet de l'arbre. Il/Elle redescendit et les posa devant Choco : « Tiens, partageons ce délicieux festin de bonbons ! Il y en a bien assez pour nous deux ! » dis-t-il/elle. Ravi de cette générosité, Choco mangea avec appétit, sa queue frétillant de bonheur, et son ventre cessa immédiatement de gronder.`
            : moralId === 'courage'
            ? `${hero} décida de faire preuve d'un grand courage. Au lieu de s'enfuir face aux rugissements du T-Rex, il/elle s'approcha doucement, les mains ouvertes pour montrer sa gentillesse. « N'aie pas peur, petit dinosaure. Je suis ton ami et je vais t'aider », dit-il/elle d'une voix douce et rassurante. ${hero} s'agenouilla avec précaution, attrapa délicatement la patte blessée et, d'un geste précis, retira la grosse épine de sucre d'orge.`
            : `${hero} regarda autour de lui/elle et vit de grandes gaufres sèches posées sur la rive. « Ne t'inquiète pas, Kiki, nous allons unir nos forces ! » dit-il/elle en souriant. Ensemble, en déplaçant les grandes gaufres avec soin, ils construisirent un magnifique pont solide au-dessus de la rivière de lait chaud. ${hero} prit Kiki par la petite patte pour le rassurer et ils traversèrent ensemble, étape par étape, en riant de bon cœur.`,
          
          moralId === 'partage'
            ? `Choco fit un grand câlin préhistorique tout chaud à ${hero}. « Tu es le/la plus gentil(le) des terriens ! Partager ton repas m'a redonné des forces et le sourire ! » chuchota-t-il avec affection.`
            : moralId === 'courage'
            ? `Le petit Tyrannosaure s'arrêta instantanément de rugir. Il frotta joyeusement sa tête contre l'épaule de ${hero} en ronronnant comme un gros chat. « Merci ! Tu as été si courageux(se) de venir m'aider malgré mes vilains grognements ! »`
            : `Kiki s'envola joyeusement au-dessus du nid de meringue en faisant des loopings dans le ciel de cacao. « Merci infiniment ! Grâce à notre travail d'équipe et notre amitié, j'ai surmonté cet obstacle avec brio ! »`
        ]
      },
      {
        title: "Chapitre III : Une Nuit Parfumée au Chocolat",
        content: [
          `Pour remercier ${hero}, le grand conseil des dinosaures lui fit cadeau d'un petit œuf en chocolat magique qui ne fond jamais, mais qui diffuse une douce et rassurante odeur de gousse de vanille quand on le garde près de soi.`,
          `Alors que la lune de sucre glace commençait à briller dans le ciel étoilé de cannelle, un grand nuage moelleux en barbe à papa descendit doucement pour accueillir ${hero}. Il/Elle s'y installa confortablement et s'envola vers le présent, atterrissant en douceur sous sa propre couette chaude.`,
          `Serrant fort son petit œuf de vanille, ${hero} ferma les yeux, le cœur rempli d'images gourmandes et d'amis fantastiques. Les yeux lourds de sommeil, il/elle s'endormit paisiblement dans un monde de douceur infinie. Fais de doux rêves sucrés, ${hero}. Dors bien, la nuit est belle.`
        ]
      }
    ];
  }
  // 4. Mysterious Ocean
  else if (universeId === 'ocean') {
    title = `${hero} et la Symphonie de la Cité Sous-Marine`;
    chapters = [
      {
        title: "Chapitre I : La Plongée dans le Bleu Profond",
        content: [
          `Il était une fois, dans une chambre paisible éclairée par la douce lueur d'une veilleuse, un(e) enfant à l'esprit rêveur nommé(e) ${hero}. Ce soir-là, en posant l'oreille contre un grand coquillage nacré rapporté de vacances, ${hero} entendit non pas le bruit de la mer, mais une magnifique mélodie de harpe jouée par les courants marins. Une jolie bulle dorée et protectrice, douce comme une caresse d'air chaud, enveloppa délicatement ${hero} et l'emmena flotter à travers le sol de sa chambre.`,
          `Sans ressentir la moindre peur, ${hero} commença à descendre doucement dans les profondeurs de l'Océan Mystérieux. La bulle magique lui permettait de respirer et de se déplacer avec une incroyable légèreté. Autour de lui/elle, l'eau était d'un bleu saphir magnifique, éclairée par des bancs de poissons-lanternes qui dansaient en dessinant des vagues lumineuses. C'était un monde sous-marin merveilleux où tout semblait calme et magique.`,
          `Au fond de l'eau brillait une splendide cité de corail aux mille éclats mauves et argentés. Des dauphins luminescents faisaient des acrobaties autour des tours de coquillages géants, tandis que des petites étoiles de mer jouaient de la musique en tapotant sur des perles de cristal brillantes.`
        ]
      },
      {
        title: "Chapitre II : Le Trésor de la Sirène",
        content: [
          moralId === 'partage'
            ? `Près d'un grand palais de nacre, ${hero} fit la connaissance de Marina, une petite sirène couronnée de fleurs marines. Marina était très triste car toutes ses perles lumineuses s'étaient éparpillées au fond d'une faille sombre, et elle n'avait plus de lumière pour guider les bébés tortues qui allaient naître ce soir sur la plage. « Bonjour, murmura Marina. Sans mes perles de lumière, les petites tortues vont s'égarer dans l'ombre... »`
            : moralId === 'courage'
            ? `Soudain, un grand grondement résonna dans la grotte aux merveilles. Octo, un calamar géant très timide, s'était caché à l'intérieur car il avait peur de la grande obscurité des abysses profonds. Pour empêcher quiconque d'entrer, il agitait ses grands tentacules de manière impressionnante, créant de gros tourbillons d'eau. Les poissons-lanternes s'enfuirent de peur. ${hero} sentit le courant bouger fort autour de sa bulle, mais décida de garder son calme.`
            : `Sur un récif de corail rose, ${hero} aperçut Bulle, un petit hippocampe aux reflets dorés qui pleurait doucement. Bulle s'était éloigné de sa famille en suivant un banc de poissons rigolos et s'était perdu. « Oh, le chemin du retour passe par le grand jardin d'algues qui bougent sans cesse, et j'ai peur de m'y perdre tout seul ! » dit-il d'une voix tremblante en regardant les grandes feuilles vertes danser.`,
          
          moralId === 'partage'
            ? `${hero} fouilla dans sa bulle et y trouva son magnifique trésor de coquillages polis et de galets brillants ramassés l'été dernier. Avec un grand sourire protecteur, ${hero} ouvrit les mains pour les partager avec Marina. « Tiens, Marina, mes coquillages brillent très fort aussi ! Partageons-les pour éclairer le chemin des bébés tortues ! » dit-il/elle. Magiquement, en touchant l'eau sacrée, les coquillages de ${hero} se mirent à briller d'une splendide lueur d'or chaleureuse.`
            : moralId === 'courage'
            ? `${hero} prit une grande décision de bravoure. Guidant sa bulle magique avec douceur, il/elle s'approcha doucement d'Octo malgré les mouvements impressionnants de ses tentacules. D'une voix douce et rassurante qui traversa la paroi de verre, il/elle lui dit : « N'aie pas peur, grand Octo. Tiens, prends ma veilleuse de cristal, elle va éclairer ta grotte et réchauffer ton cœur. » Rassuré par tant de gentillesse, le calamar se calma instantanément.`
            : `${hero} prit délicatement le petit hippocampe dans le creux de sa main pour le rassurer. « Ne t'inquiète pas, petit Bulle, nous allons faire équipe et trouver la sortie ensemble ! » dit-il/elle avec assurance. Bulle utilisait ses grands yeux pour repérer les passages libres entre les algues en mouvement, tandis que ${hero} guidait sa bulle dorée pour écarter doucement les grandes feuilles vertes. Grâce à cette collaboration, ils franchirent le jardin d'algues sans aucun problème.`,
          
          moralId === 'partage'
            ? `Marina réunit les coquillages lumineux de ${hero} pour former un magnifique chemin d'or sur le sable. « Merci infiniment, généreux(se) ami(e) ! Grâce à ton esprit de partage, toutes les petites tortues sont nées en sécurité ce soir sous les étoiles ! » chuchota-t-elle avec gratitude.`
            : moralId === 'courage'
            ? `Octo prit délicatement la veilleuse de cristal avec l'un de ses tentacules. La grotte entière s'illumina d'une douce couleur rose et violette. « Merci, aventurier(e) courageux(se) ! Ta présence et ta bonté ont chassé toutes mes peurs du noir ! » murmura-t-il avec soulagement.`
            : `Bulle retrouva sa maman hippocampe qui l'attendait avec impatience. Il fit trois fois le tour de la main de ${hero} en poussant des petits cris de joie : « Merci ! Ensemble, nous avons été plus forts que tous les obstacles du grand océan ! »`
        ]
      },
      {
        title: "Chapitre III : Le Sommeil des Abysses",
        content: [
          `Pour le/la remercier de son aide précieuse, le grand roi de la mer offrit à ${hero} un magnifique coquillage magique bleu nacré qui murmurait la plus douce des chansons de mer quand on le posait sur sa table de nuit.`,
          `La bulle dorée de ${hero} remonta tranquillement à travers l'eau tiède, le/la ramenant en douceur dans sa chambre douillette. Il/Elle se glissa avec délices sous sa couette chaude, posant le coquillage bleu près de son oreiller.`,
          `Une magnifique sensation de calme et de sécurité envahit toute la pièce alors que le murmure apaisant de l'océan berçait son esprit. Les paupières de ${hero} se firent lourdes de beaux rêves aquatiques. Fais de doux rêves marins, petit(e) explorateur(trice). Dors bien, l'océan veille sur toi. Bonsoir.`
        ]
      }
    ];
  }
  // 5. Candy World
  else {
    title = `${hero} et le Mystère de la Montagne en Barbe à Papa`;
    chapters = [
      {
        title: "Chapitre I : L'Envol vers le Pays Sucré",
        content: [
          `Il était une fois, dans une maison baignée par le calme de la nuit, un(e) jeune aventurier(e) gourmand(e) et joyeux(se) prénommé(e) ${hero}. Ce soir-là, alors que les étoiles commençaient à clignoter comme de petits sucres d'orge dans le ciel sombre, ${hero} découvrit un petit sentier de bonbons multicolores dessiné sur le tapis de sa chambre. Curieux(se), il/elle posa le pied sur le premier bonbon violet, puis sur le bleu... et soudain, il/elle s'envola doucement comme un ballon de baudruche !`,
          `Porté(e) par une brise tiède parfumée à la fraise, ${hero} atterrit tout en douceur sur une colline de brioche moelleuse. En ouvrant les yeux, il/elle poussa un cri d'admiration : sous ses pieds s'étendait le Monde des Bonbons ! Une magnifique rivière de sirop de fraise coulait paisiblement entre des collines de chocolat blanc, et de grands arbres en sucette abritaient des oiseaux en sucre filé qui chantaient la plus douce des mélodies du soir.`,
          `Tout dans ce monde magique était fait pour s'amuser et se régaler. Le sol était si souple qu'on pouvait y rebondir sans aucun danger, et de grands nuages blancs en barbe à papa flottaient dans le ciel, prêts à accueillir les enfants fatigués pour leur offrir le plus doux des lits de repos.`
        ]
      },
      {
        title: "Chapitre II : L'Ours en Guimauve et le Pont de Caramel",
        content: [
          moralId === 'partage'
            ? `Alors qu'il/elle marchait au bord de la rivière de sirop, ${hero} fit la rencontre de Gribouille, un adorable petit ours en guimauve rose. Gribouille était assis sur un rocher de nougat et pleurait doucement, car son grand biscuit en gaufrette s'était brisé en tombant dans l'eau. « Bonjour, murmura le petit ours tristement. C'était mon seul goûter pour ce soir, et maintenant je n'ai plus rien à manger... »`
            : moralId === 'courage'
            ? `Soudain, un grand bruit se fit entendre : le pont de sucre d'orge qui permettait de traverser la falaise de chocolat commençait à fondre sous la chaleur d'une lune de miel trop brillante. Gribouille, l'ours en guimauve, était paralysé par la peur au milieu du pont, n'osant plus faire un pas en avant ni en arrière. Le caramel coulait tout autour de lui et il risquait de glisser à tout moment. ${hero} savait qu'il fallait agir avec assurance.`
            : `Près d'une colline de meringue géante, ${hero} aperçut Pip, un petit oiseau en sucre filé bleu qui essayait désespérément d'atteindre le sommet pour cueillir une cerise confite magique. Mais la meringue était terriblement glissante comme de la vraie glace, et Pip n'arrivait pas à s'y accrocher avec ses petites pattes de sucre. « Oh, c'est trop difficile d'y monter tout seul, je glisse sans cesse ! » dit-il tristement en soupirant.`,
          
          moralId === 'partage'
            ? `${hero} fouilla dans son petit sac à dos et y trouva une magnifique tablette de chocolat multicolore aux éclats de caramel, reçue l'après-midi même. Avec un grand sourire chaleureux, ${hero} s'approcha de Gribouille, cassa la tablette en deux et lui offrit la plus grande moitié. « Tiens, petit Gribouille ! Partageons mon chocolat magique, c'est encore meilleur à deux ! » dit-il/elle. Instantanément, la guimauve de l'ours s'illumina de paillettes dorées.`
            : moralId === 'courage'
            ? `${hero} prit une grande décision de bravoure. S'avançant sans hésiter sur le pont de sucre d'orge chancelant, il/elle prit le petit ours par sa patte molle en guimauve. D'une voix forte, rassurante et douce, ${hero} lui dit : « Ne t'en fais pas, Gribouille, serre fort ma main et marche dans mes pas. Nous allons y arriver ensemble ! » Inspiré par tant de courage, Gribouille serra la main de son ami(e) et avança pas après pas.`
            : `${hero} s'approcha de Pip avec un grand sourire complice. « Ne t'inquiète pas, Pip, nous allons faire équipe et réussir ensemble ! » dit-il/elle. ${hero} s'agenouilla pour faire la courte échelle au petit oiseau en lui servant de marchepied avec ses mains douces, tandis que Pip utilisait son bec pour s'accrocher solidement à une branche de réglisse robuste. En unissant leurs efforts, ils atteignirent le sommet de la meringue.`,
          
          moralId === 'partage'
            ? `Gribouille dégusta le chocolat avec un immense bonheur, sa peau rose brillant de mille feux. « Merci infiniment, généreux(se) terrien(ne) ! Ton geste de partage a rendu ma soirée infiniment plus douce ! » chuchota-t-il avec tendresse.`
            : moralId === 'courage'
            ? `Ils atteignirent la rive solide juste au moment où le pont de sucre d'orge se transformait en un toboggan amusant de caramel doré. Gribouille poussa un cri de joie : « Merci ! Tu as été tellement courageux(se) d'affronter le danger pour venir me sauver la vie ! »`
            : `Pip attrapa la magnifique cerise confite brillante et la déposa délicatement dans la main de ${hero} : « Merci ! Grâce à notre travail d'équipe et notre belle amitié, nous avons conquis le sommet de la colline magique ! »`
        ]
      },
      {
        title: "Chapitre III : Le Repos sur les Nuages de Sucre",
        content: [
          `Pour remercier ${hero} de sa visite inoubliable, la reine du royaume des bonbons lui offrit un petit sucre d'orge scintillant magique qui diffusait un doux parfum de fraise et de vanille propice aux rêves les plus apaisants.`,
          `Un magnifique nuage de barbe à papa rose descendit doucement du ciel étoilé de sucre glace pour accueillir ${hero}. Il/Elle s'y installa comme dans un nid douillet et s'envola paisiblement vers sa chambre, se retrouvant blotti(e) sous sa propre couette chaude.`,
          `Une délicieuse sensation de paix et de douceur enveloppa toute la pièce alors que le parfum de fraise apaisait son esprit fatigué. Les paupières de ${hero} se fermèrent doucement sur des rêves de rivières de sirop et d'oursons rieurs. Fais de délicieux rêves sucrés, ${hero}. Dors bien, la nuit est magique. Bonsoir.`
        ]
      }
    ];
  }

  return { title, chapters, bgGlow: universe.bgGlow, emoji: universe.emoji, themeColor: universe.themeColor };
};

export const ConteurIA: React.FC<ConteurIAProps> = ({ 
  onBack, 
  members, 
  isPremium = false, 
  onTriggerPaywall 
}) => {
  // Dynamically build heroes list from real family members passed via props
  const defaultHeroes = (members && members.length > 0)
    ? members.map(m => ({
        name: m.name,
        photoUrl: m.photoUrl,
        age: m.role === 'Enfant' ? (m.id === '3' ? '12 ans' : m.id === '4' ? '8 ans' : 'Enfant') : m.role
      }))
    : [
        { name: 'Amadou', photoUrl: '/avatars/amadou.png', age: '12 ans' },
        { name: 'Awa', photoUrl: '/avatars/awa.png', age: '8 ans' }
      ];

  // Config state
  const [selectedHero, setSelectedHero] = useState<string>('Awa'); // Default select Awa as in reference image
  const [isCustomHero, setIsCustomHero] = useState<boolean>(false);
  const [customHeroName, setCustomHeroName] = useState<string>('');

  const [selectedUniverse, setSelectedUniverse] = useState<string>('espace');
  const [selectedMoral, setSelectedMoral] = useState<string>('partage');
  
  // Story state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [genStep, setGenStep] = useState<number>(0);
  const [activeStory, setActiveStory] = useState<any | null>(null);
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(0);
  const [storyImage, setStoryImage] = useState<string>('');
  const [loadingStoryImage, setLoadingStoryImage] = useState<boolean>(false);
  
  // Text-To-Speech Controls
  const [isReadingAloud, setIsReadingAloud] = useState<boolean>(false);
  const [speechRate, setSpeechRate] = useState<number>(0.85); // Storytelling speed
  const [speechPitch, setSpeechPitch] = useState<number>(1.05); // Gentler pitch
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [showVoiceSettings, setShowVoiceSettings] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('lg');

  // Soundscape (local WAV files in public/sounds/)
  const [ambientSound, setAmbientSound] = useState<'none' | 'rain' | 'crickets' | 'lullaby' | 'ocean' | 'wind' | 'stream'>('none');
  const [ambientVolume, setAmbientVolume] = useState<number>(0.15);
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);

  // 3D Flip animation triggers
  const [isFlipping, setIsFlipping] = useState<boolean>(false);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev'>('next');

  // Load browser speech synthesis voices
  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const voices = window.speechSynthesis.getVoices();
        // Filter French voices
        const french = voices.filter(v => v.lang.startsWith('fr'));
        setAvailableVoices(french);
        
        // Pick best default French voice
        if (french.length > 0) {
          const googleFrench = french.find(v => v.name.toLowerCase().includes('google'));
          const premiumFrench = french.find(v => v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('soft'));
          const fallback = googleFrench || premiumFrench || french[0];
          setSelectedVoiceName(fallback.name);
        }
      }
    };

    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Set default hero based on family members
  useEffect(() => {
    if (members && members.length > 0) {
      const kids = members.filter(m => m.id === '3' || m.id === '4');
      if (kids.length > 0) {
        setSelectedHero(kids[0].name);
      } else {
        setSelectedHero(members[0].name);
      }
    } else {
      setSelectedHero('Amadou');
    }
  }, [members]);

  // Clean up sounds and speech on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      stopAmbientSound();
    };
  }, []);

  // Sync ambient sound volume
  useEffect(() => {
    if (ambientAudioRef.current) {
      ambientAudioRef.current.volume = ambientVolume;
    }
  }, [ambientVolume]);



  // Stop background sounds
  const stopAmbientSound = () => {
    if (ambientAudioRef.current) {
      try {
        ambientAudioRef.current.pause();
        ambientAudioRef.current.currentTime = 0;
      } catch (_) {}
      ambientAudioRef.current = null;
    }
  };

  // Start ambient sound using local MP3 files (served from public/sounds/)
  const startAmbientSound = (type: 'rain' | 'crickets' | 'lullaby' | 'ocean' | 'wind' | 'stream') => {
    stopAmbientSound();
    try {
      const audio = new Audio(`/sounds/${type}.mp3`);
      audio.loop = true;
      audio.volume = ambientVolume;
      audio.play().catch(err => console.warn('[ConteurIA] Audio play failed:', err));
      ambientAudioRef.current = audio;
    } catch (err) {
      console.warn('[ConteurIA] Audio init failed:', err);
    }
  };
  const handleStartGeneration = async () => {
    const finalHeroName = isCustomHero ? customHeroName.trim() : selectedHero;
    if (!finalHeroName.trim()) return;

    // 1. Contrôle d'accès Premium obligatoire
    if (!aiQuotaService.checkAIPremiumAccess(isPremium, onTriggerPaywall)) {
      return;
    }

    setIsGenerating(true);
    setGenStep(1);
    window.speechSynthesis.cancel();
    setIsReadingAloud(false);
    setStoryImage('');

    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    // Vérifie la clé API d'abord, puis consomme le quota seulement si la clé existe
    const useRealAI = !!geminiKey && aiQuotaService.consumeAIQuota(isPremium);
    const universe = UNIVERSES.find(u => u.id === selectedUniverse) || UNIVERSES[0];
    const moral = MORALS.find(m => m.id === selectedMoral) || MORALS[0];

    if (useRealAI) {
      try {
        setGenStep(2);
        const prompt = `Tu es le Conteur Céleste IA de l'application MaFamille+.
Génère une histoire merveilleuse, douce, poétique et apaisante pour endormir un enfant nommé ${finalHeroName}.
L'univers de l'histoire est : "${universe.name} (${universe.desc})".
La morale ou valeur à transmettre doucement à travers l'histoire est : "${moral.name} (${moral.desc})".

L'histoire doit impérativement être structurée en 3 chapitres progressifs (Chapitre I, Chapitre II, Chapitre III).
Chaque chapitre doit comporter exactement 2 à 3 longs paragraphes riches en descriptions magiques, en dialogues doux et en ambiance réconfortante propice au sommeil.

Renvoie STRICTEMENT un objet JSON brut valide, sans balises markdown (pas de \`\`\`json), sans texte explicatif avant ou après, respectant exactement cette structure :
{
  "title": "Le Titre de l'Histoire Merveilleuse",
  "chapters": [
    {
      "title": "Chapitre I : [Titre du chapitre]",
      "content": [
        "Paragraphe 1 (très poétique et immersif)",
        "Paragraphe 2 (installation de la trame)"
      ]
    },
    {
      "title": "Chapitre II : [Titre du chapitre]",
      "content": [
        "Paragraphe 1 (péripétie douce)",
        "Paragraphe 2 (résolution douce mettant en valeur la morale)"
      ]
    },
    {
      "title": "Chapitre III : [Titre du chapitre]",
      "content": [
        "Paragraphe 1 (le retour calme à la maison)",
        "Paragraphe 2 (berceuse chaleureuse finale)"
      ]
    }
  ]
}`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7 }
          })
        });

        if (!response.ok) throw new Error('Gemini API call failed');
        const data = await response.json();
        let textResult = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        textResult = textResult.replace(/```json/g, '').replace(/```/g, '').trim();

        const parsedStory = JSON.parse(textResult);
        if (parsedStory.title && parsedStory.chapters && parsedStory.chapters.length === 3) {
          setGenStep(3);
          const remaining = aiQuotaService.getRemainingCalls(isPremium);
          const limit = aiQuotaService.getDailyLimit();
          
          const story = {
            title: parsedStory.title,
            chapters: parsedStory.chapters,
            bgGlow: universe.bgGlow,
            emoji: universe.emoji,
            themeColor: universe.themeColor,
            isRealAI: true,
            quotaRemaining: remaining,
            quotaLimit: limit
          };

          setTimeout(() => {
            setActiveStory(story);
            setCurrentChapterIndex(0);
            setIsGenerating(false);
            setGenStep(0);

            // Charger l'illustration avec pollinations
            setLoadingStoryImage(true);
            const finalPrompt = encodeURIComponent(`dreamy fairytale watercolor children book illustration of ${story.title}, magical landscape in ${universe.name}, warm soft glow, master key art, 3d pixar fantasy style, vivid colors`);
            const seed = Math.floor(Math.random() * 1000000);
            const generatedUrl = `https://image.pollinations.ai/prompt/${finalPrompt}?width=600&height=800&nologo=true&seed=${seed}`;

            const img = new Image();
            img.src = generatedUrl;
            img.onload = () => {
              setStoryImage(generatedUrl);
              setLoadingStoryImage(false);
            };
            img.onerror = () => {
              setStoryImage(`https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=600&q=80&sig=${seed}`);
              setLoadingStoryImage(false);
            };
          }, 1000);
          return;
        } else {
          throw new Error('Structure JSON de histoire incorrecte');
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn("[ConteurIA] Erreur lors de la génération avec Gemini Flash, repli sur le conteur local :", err);
        alert("[ConteurIA Gemini Error]: " + errMsg);
      }
    }

    // Version locale de repli
    setTimeout(() => {
      setGenStep(2);
      setTimeout(() => {
        setGenStep(3);
        setTimeout(() => {
          const story = generateExtensiveStory(finalHeroName.trim(), selectedUniverse, selectedMoral);
          
          const remainingCalls = aiQuotaService.getRemainingCalls(isPremium);
          const isQuotaFallback = isPremium && remainingCalls === 0;

          setActiveStory(story);
          setCurrentChapterIndex(0);
          setIsGenerating(false);
          setGenStep(0);

          if (isQuotaFallback) {
            console.info("[ConteurIA] Quota quotidien d'IA réelle épuisé. Basculement sur le Conteur local.");
          } else if (!geminiKey) {
            console.info("[ConteurIA] Clé VITE_GEMINI_API_KEY absente. Basculement sur le Conteur local.");
          } else {
            console.info("[ConteurIA] Basculement sur le Conteur local (compte non-Premium).");
          }

          // Lancer le chargement de l'illustration d'IA céleste !
          setLoadingStoryImage(true);
          const universeName = UNIVERSES.find(u => u.id === selectedUniverse)?.name || selectedUniverse;
          const finalPrompt = encodeURIComponent(`dreamy fairytale watercolor children book illustration of ${story.title}, magical landscape in ${universeName}, warm soft glow, master key art, 3d pixar fantasy style, vivid colors`);
          const seed = Math.floor(Math.random() * 1000000);
          const generatedUrl = `https://image.pollinations.ai/prompt/${finalPrompt}?width=600&height=800&nologo=true&seed=${seed}`;

          const img = new Image();
          img.src = generatedUrl;
          img.onload = () => {
            setStoryImage(generatedUrl);
            setLoadingStoryImage(false);
          };
          img.onerror = () => {
            setStoryImage(`https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=600&q=80&sig=${seed}`);
            setLoadingStoryImage(false);
          };

        }, 1000);
      }, 1000);
    }, 1000);
  };

  // Flip Page Anim Trigger with direction parameter
  const changeChapter = (index: number, direction: 'next' | 'prev') => {
    if (isFlipping) return;
    window.speechSynthesis.cancel();
    setIsReadingAloud(false);
    
    setFlipDirection(direction);
    setIsFlipping(true);

    setTimeout(() => {
      setCurrentChapterIndex(index);
      setIsFlipping(false);
    }, 550); // half second flip duration
  };

  const handleNextPage = () => {
    if (!activeStory) return;
    if (currentChapterIndex < activeStory.chapters.length - 1) {
      changeChapter(currentChapterIndex + 1, 'next');
    }
  };

  const handlePrevPage = () => {
    if (currentChapterIndex > 0) {
      changeChapter(currentChapterIndex - 1, 'prev');
    }
  };

  // Upgraded Premium TTS Voice Engine
  const handleToggleReadAloud = () => {
    if (!activeStory) return;

    if (isReadingAloud) {
      window.speechSynthesis.cancel();
      setIsReadingAloud(false);
      return;
    }

    // Combine all paragraphs of the current chapter for a long reading
    const textToRead = activeStory.chapters[currentChapterIndex].content.join(' ');
    const utterance = new SpeechSynthesisUtterance(textToRead);
    
    utterance.lang = 'fr-FR';
    utterance.rate = speechRate;
    utterance.pitch = speechPitch;

    const voice = availableVoices.find(v => v.name === selectedVoiceName);
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onend = () => {
      setIsReadingAloud(false);
    };

    utterance.onerror = () => {
      setIsReadingAloud(false);
    };

    setIsReadingAloud(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleReset = () => {
    window.speechSynthesis.cancel();
    setIsReadingAloud(false);
    stopAmbientSound();
    setAmbientSound('none');
    setActiveStory(null);
    setCurrentChapterIndex(0);
  };

  return (
    <div className="relative glass-panel border border-white/10 rounded-[40px] p-6 md:p-8 overflow-hidden min-h-[660px] w-full flex flex-col justify-between transition-all duration-700 shadow-[0_25px_60px_rgba(0,0,0,0.5)] bg-[#070e17]/80">
      
      {/* Dynamic ambient glowing background circles */}
      <div className={`absolute -top-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-tr filter blur-[120px] opacity-20 transition-all duration-1000 ${
        activeStory ? activeStory.bgGlow : 
        selectedUniverse === 'espace' ? 'from-indigo-600 to-purple-600' :
        selectedUniverse === 'foret' ? 'from-emerald-600 to-teal-600' :
        selectedUniverse === 'dinos' ? 'from-amber-600 to-orange-600' :
        selectedUniverse === 'ocean' ? 'from-sky-600 to-cyan-600' :
        'from-pink-600 to-rose-600'
      }`}></div>

      {/* Embedded modular CSS styling for physical 3D book fold effect */}
      <style dangerouslySetInnerHTML={{__html: `
        .book-container {
          perspective: 1200px;
          transform-style: preserve-3d;
        }
        .book-cover-mock {
          box-shadow: 0 35px 80px rgba(0,0,0,0.7), inset 0 2px 5px rgba(255,255,255,0.1), inset 0 -2px 5px rgba(0,0,0,0.5);
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          position: relative;
        }
        .book-cover-mock::after {
          content: '';
          position: absolute;
          top: 0; left: 18px; bottom: 0; w: 4px;
          background: rgba(255,255,255,0.06);
          box-shadow: 1px 0 3px rgba(0,0,0,0.4);
        }
        .book-spine-line {
          box-shadow: inset -2px 0 8px rgba(0,0,0,0.6), inset 2px 0 8px rgba(0,0,0,0.6);
          background: rgba(15, 23, 42, 0.95);
        }
        .audio-wave-bar {
          animation: dance 1.2s ease-in-out infinite alternate;
        }
        @keyframes dance {
          0% { transform: scaleY(0.15); }
          100% { transform: scaleY(1.0); }
        }
        .flip-active-next {
          animation: flipNext 0.55s cubic-bezier(0.645, 0.045, 0.355, 1.0) forwards;
          transform-origin: left center;
        }
        .flip-active-prev {
          animation: flipPrev 0.55s cubic-bezier(0.645, 0.045, 0.355, 1.0) forwards;
          transform-origin: right center;
        }
        @keyframes flipNext {
          0% { transform: rotateY(0deg); opacity: 1; filter: brightness(1); }
          50% { transform: rotateY(-90deg); opacity: 0.5; filter: brightness(0.7); }
          100% { transform: rotateY(-180deg); opacity: 0; filter: brightness(0.4); }
        }
        @keyframes flipPrev {
          0% { transform: rotateY(0deg); opacity: 1; filter: brightness(1); }
          50% { transform: rotateY(90deg); opacity: 0.5; filter: brightness(0.7); }
          100% { transform: rotateY(180deg); opacity: 0; filter: brightness(0.4); }
        }
        .gold-border {
          border: 1px solid rgba(251, 191, 36, 0.15);
          box-shadow: 0 0 10px rgba(251, 191, 36, 0.05);
        }
        .animate-bounce-slow {
          animation: bounceSlow 3s ease-in-out infinite;
        }
        .animate-pulse-slow {
          animation: pulseSlow 4s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spinSlow 12s linear infinite;
        }
        .animate-spin-reverse {
          animation: spinReverse 8s linear infinite;
        }
        @keyframes bounceSlow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes pulseSlow {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 0.55; }
        }
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spinReverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />

      {/* Header Bar */}
      {activeStory && (
        <div className="relative z-10 flex items-center justify-between w-full pb-4 border-b border-white/8">
          <button 
            onClick={handleReset}
            className="flex items-center space-x-2 text-xs font-bold text-white/50 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Nouveau conte</span>
          </button>
          <div className="flex items-center space-x-2 bg-white/5 border border-white/8 px-4 py-1.5 rounded-full">
            <Sparkles className="w-4 h-4 text-[#FFB020] animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#FFB020] font-sans">Le Conteur Céleste</span>
          </div>
        </div>
      )}

      {/* DYNAMIC SCREEN LAYOUT */}
      <div className="relative z-10 my-auto py-6 flex flex-col items-center justify-center w-full min-h-[460px] book-container">
        
        {/* SCREEN 1: THE INPUTS PANEL */}
        {!isGenerating && !activeStory && (
          <div className="w-full max-w-5xl space-y-7 animate-fade-in px-1 md:px-4">
            
            {/* Header Title with premium cosmic styling */}
            <div className="space-y-4 relative w-full">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-16 bg-[#7C3AED]/10 filter blur-[40px] rounded-full"></div>
              
              {/* Back button and title badge wrapper */}
              <div className="flex items-center justify-between w-full relative z-10 px-1">
                <button 
                  onClick={onBack}
                  className="p-2.5 rounded-2xl bg-white/3 border border-white/6 hover:bg-white/8 text-white/70 hover:text-white transition-all duration-300 cursor-pointer flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-[#FFB020]" />
                  <span className="hidden sm:inline">Retour</span>
                </button>

                <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-violet-600/15 via-pink-500/15 to-[#FFB020]/15 border border-white/8 px-4.5 py-1.8 rounded-full backdrop-blur-md">
                  <Sparkles className="w-4 h-4 text-[#FFB020] animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#FFB020] font-sans">Le Conteur Céleste IA</span>
                </div>
              </div>
              
              <div className="text-center space-y-2 relative z-10">
                <h2 className="text-xl md:text-3xl font-black text-white tracking-tight">
                  Générer un Conte du Soir Merveilleux
                </h2>
                <p className="text-xs text-white/50 max-w-md mx-auto">
                  Configurez l'histoire magique et unique pour apaiser vos enfants avant le coucher.
                </p>
              </div>
            </div>

            {/* MAIN FULL-SCREEN CONFIGURATOR PANEL */}
            <div className="bg-white/4 border border-white/8 rounded-[36px] p-5 md:p-8 backdrop-blur-xl space-y-7 relative overflow-hidden">
              
              {/* Dev Diagnostics */}
              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between text-[10px] text-white/60 font-mono relative z-20">
                <div>
                  <span>Premium: {isPremium ? '✅' : '❌'} | Key: {import.meta.env.VITE_GEMINI_API_KEY ? '✅' : '❌'} | Usage: {aiQuotaService.getUsage().count}/{aiQuotaService.getDailyLimit()}</span>
                </div>
                <button 
                  onClick={() => {
                    aiQuotaService.resetQuota();
                    window.location.reload();
                  }}
                  className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded-[10px] font-bold text-[9px] active:scale-95 transition-all cursor-pointer"
                >
                  Reset Quota 🔄
                </button>
              </div>
              
              {/* Subtle ambient light shapes in the panel background */}
              <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#7C3AED]/5 rounded-full filter blur-[60px] pointer-events-none"></div>
              <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-pink-500/5 rounded-full filter blur-[60px] pointer-events-none"></div>

              {/* STEP 1: SELECT HERO */}
              <div className="space-y-3 relative z-10">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-6 h-6 rounded-full bg-[#7C3AED]/20 border border-[#7C3AED]/30 flex items-center justify-center text-[10px] font-black text-[#a78bfa]">
                      1
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-widest text-[#a78bfa]">
                      Pour quel héros ?
                    </span>
                  </div>

                  {isCustomHero && (
                    <button 
                      onClick={() => {
                        setIsCustomHero(false);
                        setSelectedHero('Awa');
                      }}
                      className="text-[9.5px] font-black text-pink-400 hover:text-pink-300 uppercase tracking-widest transition-colors cursor-pointer"
                    >
                      Annuler l'autre prénom
                    </button>
                  )}
                </div>

                {/* Centered Horizontal Avatars Selector Grid */}
                <div className="flex items-center space-x-4 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory">
                  {defaultHeroes.map((heroItem) => {
                    const isSelected = !isCustomHero && selectedHero === heroItem.name;
                    return (
                      <button
                        key={heroItem.name}
                        onClick={() => {
                          setIsCustomHero(false);
                          setSelectedHero(heroItem.name);
                        }}
                        className={`flex flex-col items-center p-3 rounded-2xl border transition-all duration-350 cursor-pointer snap-start shrink-0 min-w-[85px] ${
                          isSelected 
                            ? 'bg-[#7C3AED]/12 border-[#7C3AED] shadow-[0_0_15px_rgba(124,58,237,0.25)] scale-[1.03]' 
                            : 'bg-white/3 border-white/6 hover:bg-white/6'
                        }`}
                      >
                        <div className="relative">
                          <img 
                            src={heroItem.photoUrl} 
                            alt={heroItem.name}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${heroItem.name}`;
                            }}
                            className="w-12 h-12 rounded-full object-cover bg-slate-900 border border-white/10"
                          />
                          {isSelected && (
                            <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-[#7C3AED] border border-[#a78bfa] flex items-center justify-center shadow-md animate-scale-up">
                              <Check className="w-2.5 h-2.5 text-white stroke-[3.5]" />
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] font-black text-white mt-2 uppercase tracking-wider">
                          {heroItem.name}
                        </span>
                        <span className="text-[8px] font-semibold text-white/40 mt-0.5 leading-none">
                          {heroItem.age}
                        </span>
                      </button>
                    );
                  })}

                  {/* Button "+ Autre" for custom hero entry */}
                  <button
                    onClick={() => {
                      setIsCustomHero(true);
                      setSelectedHero('custom');
                      setCustomHeroName('');
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-350 cursor-pointer snap-start shrink-0 min-w-[85px] min-h-[92px] ${
                      isCustomHero 
                        ? 'bg-[#7C3AED]/12 border-[#7C3AED] shadow-[0_0_15px_rgba(124,58,237,0.25)] scale-[1.03]' 
                        : 'bg-white/3 border-white/6 hover:bg-white/6'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full border border-dashed border-white/20 flex items-center justify-center text-white/50 group-hover:text-white transition-colors">
                      <Plus className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black text-white mt-2 uppercase tracking-wider">
                      + Autre
                    </span>
                    <span className="text-[8px] font-semibold text-white/40 mt-0.5 leading-none">
                      Sur mesure
                    </span>
                  </button>
                </div>

                {/* Input field appearing if + Autre is active */}
                {isCustomHero && (
                  <input 
                    type="text"
                    placeholder="Saisissez son prénom..."
                    value={customHeroName}
                    onChange={(e) => setCustomHeroName(e.target.value)}
                    className="w-full max-w-lg bg-[#0d1627] border border-white/10 rounded-2xl px-4 py-3.5 text-xs text-white placeholder-white/35 focus:outline-none focus:border-[#7C3AED] focus:shadow-[0_0_12px_rgba(124,58,237,0.2)] transition-all animate-scale-up"
                  />
                )}

              </div>

              {/* STEP 2: SELECT MAGICAL UNIVERSE */}
              <div className="space-y-3 relative z-10">
                <div className="flex items-center space-x-2.5">
                  <div className="w-6 h-6 rounded-full bg-[#7C3AED]/20 border border-[#7C3AED]/30 flex items-center justify-center text-[10px] font-black text-[#a78bfa]">
                    2
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-[#a78bfa]">
                    Dans quel univers magique ?
                  </span>
                </div>

                {/* Grid of 5 premium high-fidelity background cards */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {UNIVERSES.map((u) => {
                    const isSelected = selectedUniverse === u.id;
                    const imageUrl = `/universes/${u.id === 'espace' ? 'espace' : u.id === 'foret' ? 'foret' : u.id === 'dinos' ? 'dinos' : u.id === 'ocean' ? 'ocean' : 'bonbons'}.png`;
                    return (
                      <button
                        key={u.id}
                        onClick={() => setSelectedUniverse(u.id)}
                        className={`rounded-2xl border transition-all duration-350 cursor-pointer overflow-hidden flex flex-col justify-between h-[125px] relative group ${
                          isSelected 
                            ? 'border-[#7C3AED] shadow-[0_0_18px_rgba(124,58,237,0.35)] scale-[1.02] ring-2 ring-[#a78bfa]/20' 
                            : 'border-white/8 hover:border-white/18 hover:shadow-[0_5px_15px_rgba(0,0,0,0.3)]'
                        }`}
                      >
                        {/* Background Image Coverage */}
                        <div className="absolute inset-0 w-full h-full overflow-hidden">
                          <img 
                            src={imageUrl} 
                            alt={u.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[3000ms] ease-out filter brightness-[0.75] contrast-[1.05]"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent"></div>
                        </div>

                        {/* Selection Check Indicator */}
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-4.5 h-4.5 rounded-full bg-[#7C3AED] border border-[#a78bfa] flex items-center justify-center shadow-md z-20 animate-scale-up">
                            <Check className="w-2.5 h-2.5 text-white stroke-[3.5]" />
                          </div>
                        )}

                        {/* Card bottom banner in high-fidelity glassmorphism */}
                        <div className="w-full py-2 backdrop-blur-md bg-black/60 border-t border-white/5 text-center relative z-10 mt-auto">
                          <span className="text-[9px] font-black text-white uppercase tracking-wider block">
                            {u.name}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                
                {/* Descriptive subquote */}
                <p className="text-[10px] text-white/35 italic leading-relaxed text-center pt-1">
                  « {UNIVERSES.find(u => u.id === selectedUniverse)?.desc} »
                </p>
              </div>

              {/* STEP 3: VALEUR MORALE */}
              <div className="space-y-3 relative z-10">
                <div className="flex items-center space-x-2.5">
                  <div className="w-6 h-6 rounded-full bg-[#7C3AED]/20 border border-[#7C3AED]/30 flex items-center justify-center text-[10px] font-black text-[#a78bfa]">
                    3
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-[#a78bfa]">
                    Valeur douce enseignée (Morale)
                  </span>
                </div>

                {/* Grid of Morals buttons in 5 columns on desktop */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {MORALS.map((m) => {
                    const isSelected = selectedMoral === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setSelectedMoral(m.id)}
                        className={`px-3 py-3 rounded-xl border flex items-center justify-center space-x-2.5 transition-all duration-350 cursor-pointer text-center focus:outline-none relative group ${
                          isSelected 
                            ? 'bg-[#7C3AED]/12 border-[#7C3AED] shadow-[0_0_15px_rgba(124,58,237,0.25)] scale-[1.01]' 
                            : 'bg-white/3 border-white/8 hover:bg-white/6 hover:border-white/15'
                        }`}
                      >
                        {/* Selected overlay check */}
                        {isSelected && (
                          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#7C3AED] border border-[#a78bfa] flex items-center justify-center shadow-md animate-scale-up">
                            <Check className="w-2.5 h-2.5 text-white stroke-[3.5]" />
                          </div>
                        )}
                        <span className="text-lg filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] shrink-0">{m.emoji}</span>
                        <span className="text-[9.5px] font-black text-white uppercase tracking-wider leading-none">
                          {m.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Glowing Full-Screen Action Buttons section */}
              <div className="pt-5 border-t border-white/6 flex items-center relative z-10 w-full">
                
                {/* Main magic wand generate button */}
                <button
                  onClick={handleStartGeneration}
                  disabled={isCustomHero ? !customHeroName.trim() : !selectedHero.trim()}
                  className="w-full bg-gradient-to-r from-violet-600 via-pink-500 to-[#FFB020] hover:brightness-110 shadow-[0_4px_25px_rgba(124,58,237,0.35)] transition-all active:scale-[0.99] font-black py-4.5 rounded-[22px] text-white flex items-center justify-center space-x-2 tracking-wide cursor-pointer disabled:opacity-50 disabled:pointer-events-none group"
                >
                  <Sparkles className="w-4 h-4 text-white animate-pulse group-hover:scale-110 transition-transform" />
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">GÉNÉRER L'HISTOIRE MAGIQUE</span>
                    <span className="text-[7.5px] text-white/85 font-extrabold tracking-widest mt-0.8 leading-none">COMMENCER L'AVENTURE DANS LES ÉTOILES &gt;</span>
                  </div>
                </button>
              </div>

              {/* Parent security safety advice badge */}
              <div className="flex justify-center items-center space-x-1.5 text-[9px] text-white/35 pt-1 leading-none w-full relative z-10">
                <Shield className="w-3.5 h-3.5 text-[#00D26A]" />
                <span className="font-medium">Histoires adaptées • Contenu sécurisé • Validé par les parents</span>
              </div>

            </div>

          </div>
        )}

        {/* SCREEN 2: GENERATING STORY LOADER */}
        {isGenerating && (
          <div className="flex flex-col items-center justify-center space-y-6 text-center animate-fade-in max-w-sm">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-dashed border-[#FFB020]/40 animate-spin-slow"></div>
              <div className="absolute inset-2 rounded-full border-2 border-[#FF4D6D]/40 animate-spin-reverse"></div>
              <div className="absolute -inset-4 bg-gradient-to-tr from-[#FFB020] to-[#FF4D6D] rounded-full opacity-25 filter blur-[20px] animate-pulse"></div>
              <BookOpen className="w-10 h-10 text-white relative z-10 animate-bounce" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#FFB020] animate-pulse">
                {genStep === 1 ? 'Mélange magique...' :
                 genStep === 2 ? 'Écriture du conte long...' :
                 'Dessin des pages dorées...'}
              </span>
              <h3 className="text-base font-extrabold text-white">Création du livre magique</h3>
              <p className="text-[11px] text-white/50 leading-relaxed font-sans">
                {genStep === 1 && `Rédaction de l'expédition de ${isCustomHero ? customHeroName.trim() : selectedHero} dans ${UNIVERSES.find(u => u.id === selectedUniverse)?.name}...`}
                {genStep === 2 && `Incorporation des dialogues et de la leçon sur ${MORALS.find(m => m.id === selectedMoral)?.name.toLowerCase()}...`}
                {genStep === 3 && `Génération des chapitres audio et de l'ambiance sonore...`}
              </p>
            </div>

            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/10">
              <div 
                className="bg-gradient-to-r from-[#FFB020] to-[#FF4D6D] h-full transition-all duration-[1500ms] rounded-full"
                style={{ width: `${genStep === 1 ? '33%' : genStep === 2 ? '66%' : '100%'}` }}
              ></div>
            </div>
          </div>
        )}

        {/* SCREEN 3: HIGH-FIDELITY 3D PHYSICAL STORYBOOK INTERFACE */}
        {!isGenerating && activeStory && (
          <div className="w-full max-w-4xl space-y-6 animate-scale-up">
            
            {/* The Leather / Wood physical 3D book cover layout */}
            <div className="book-cover-mock rounded-[32px] p-4 md:p-5 border border-white/10 shadow-2xl relative">
              
              {/* Golden corner decorations */}
              <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-[#FFB020]/40 rounded-tl-lg"></div>
              <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-[#FFB020]/40 rounded-tr-lg"></div>
              <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-[#FFB020]/40 rounded-bl-lg"></div>
              <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-[#FFB020]/40 rounded-br-lg"></div>

              {/* Opened Pages Area (Glassmorphism layout simulating open pages) */}
              <div className="relative rounded-[24px] overflow-hidden bg-slate-900/90 border border-white/8 flex flex-col md:grid md:grid-cols-2 min-h-[460px] shadow-[inset_0_0_40px_rgba(0,0,0,0.8)]">
                
                {/* Physical Book Spine (The central fold shadow) */}
                <div className="hidden md:block absolute top-0 bottom-0 left-1/2 -ml-[12px] w-[24px] z-20 book-spine-line opacity-80"></div>
                
                {/* LEFT PAGE: DYNAMIC GRAPHICAL SCENE REPRESENTATION */}
                <div className="relative hidden md:flex flex-col justify-between p-0 text-center border-b md:border-b-0 md:border-r border-white/6 bg-slate-950 shadow-inner overflow-hidden min-h-[260px] md:min-h-full">
                  
                  {loadingStoryImage ? (
                    <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center space-y-3 z-10">
                      <RefreshCw className="w-8 h-8 text-[#7C3AED] animate-spin" />
                      <span className="text-[9px] font-black text-white/50 uppercase tracking-widest font-sans">
                        Stable Diffusion peint le conte...
                      </span>
                    </div>
                  ) : storyImage ? (
                    <div className="absolute inset-0 w-full h-full group">
                      <img 
                        src={storyImage} 
                        alt="Story Illustration" 
                        className="w-full h-full object-cover transition-transform duration-[6000ms] group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30"></div>
                      
                      {/* Floating title overlay */}
                      <div className="absolute bottom-4 inset-x-4 text-center z-10">
                        <span className="text-[8px] font-black text-[#FFB020] uppercase tracking-widest block font-sans">
                          {selectedHero} dans l'univers {UNIVERSES.find(u => u.id === selectedUniverse)?.name}
                        </span>
                        <h4 className="text-xs font-black text-white uppercase tracking-tight leading-tight mt-1 max-w-[200px] mx-auto">
                          {activeStory.title}
                        </h4>
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-[#0d1322] flex flex-col items-center justify-center p-6 space-y-4">
                      <div className="relative w-20 h-20 rounded-full border border-white/10 flex items-center justify-center">
                        <span className="text-4xl animate-bounce-slow">{activeStory.emoji}</span>
                      </div>
                      <h4 className="text-[11px] font-black text-white/80 uppercase tracking-widest">{activeStory.title}</h4>
                    </div>
                  )}

                  {/* Left Page Header decoration overlay */}
                  <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between text-[9px] font-bold text-white/40 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] font-sans">
                    <span className="uppercase tracking-widest">{UNIVERSES.find(u => u.id === selectedUniverse)?.name}</span>
                    <Sparkle className="w-3.5 h-3.5 text-[#FFB020] animate-spin-slow" />
                  </div>

                  {/* Left Page Footer decoration overlay */}
                  <div className="absolute bottom-4 left-4 right-4 z-20 flex justify-center text-[8px] text-white/50 italic drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] font-sans mt-auto">
                    <span>Morale : {MORALS.find(m => m.id === selectedMoral)?.name}</span>
                  </div>

                </div>

                {/* RIGHT PAGE: THE DENSE BOOK TEXT AREA */}
                <div className={`relative flex flex-col justify-between p-6 md:p-8 min-h-[320px] md:min-h-full bg-slate-900/40 ${
                  isFlipping ? (flipDirection === 'next' ? 'flip-active-next' : 'flip-active-prev') : ''
                }`}>
                  
                  <div className="space-y-4 flex-1 flex flex-col justify-between">
                    
                    {/* Chapter Header & Voice Synthesis Panel Toggle */}
                    <div className="flex items-center justify-between pb-3 border-b border-white/6">
                      <span className="text-[9.5px] font-black uppercase tracking-widest text-white/40">
                        {activeStory.chapters[currentChapterIndex].title}
                      </span>

                      {/* Control Panel Toggle */}
                      <div className="flex items-center space-x-1.5">
                        {/* Font size adjustment buttons */}
                        <div className="flex items-center bg-white/5 border border-white/8 rounded-lg overflow-hidden mr-1">
                          <button
                            onClick={() => {
                              if (fontSize === 'xl') setFontSize('lg');
                              else if (fontSize === 'lg') setFontSize('base');
                              else if (fontSize === 'base') setFontSize('sm');
                            }}
                            disabled={fontSize === 'sm'}
                            className="px-2 py-1 text-[8.5px] font-black text-white/60 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer border-r border-white/6"
                            title="Texte plus petit"
                          >
                            A-
                          </button>
                          <button
                            onClick={() => {
                              if (fontSize === 'sm') setFontSize('base');
                              else if (fontSize === 'base') setFontSize('lg');
                              else if (fontSize === 'lg') setFontSize('xl');
                            }}
                            disabled={fontSize === 'xl'}
                            className="px-2 py-1 text-[10px] font-black text-white/60 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer"
                            title="Texte plus grand"
                          >
                            A+
                          </button>
                        </div>

                        <button
                          onClick={() => setShowVoiceSettings(prev => !prev)}
                          className={`p-1.5 rounded-lg border text-white/50 hover:text-white transition-all cursor-pointer ${
                            showVoiceSettings ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-transparent'
                          }`}
                          title="Paramètres de conte"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </button>

                        {/* Speech synthesis controller trigger */}
                        <button
                          onClick={handleToggleReadAloud}
                          className={`px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                            isReadingAloud 
                              ? 'bg-[#FF4D6D]/15 border-[#FF4D6D] text-[#FF4D6D] shadow-[0_0_12px_rgba(255,77,109,0.15)]' 
                              : 'bg-white/5 border-white/8 text-white/60 hover:text-white hover:bg-white/8'
                          }`}
                        >
                          {isReadingAloud ? (
                            <>
                              <VolumeX className="w-3 h-3 animate-pulse" />
                              <span>Stop</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3 h-3" />
                              <span>Vocaliser</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* DYNAMIC SETTINGS PANEL overlay */}
                    {showVoiceSettings && (
                      <div className="bg-slate-950/90 border border-white/10 rounded-2xl p-4 space-y-3 animate-fade-in relative z-35 my-2">
                        <h4 className="text-[10px] font-black text-white uppercase tracking-wider">Réglages du Conte Vocalisé</h4>
                        
                        {/* Voice Selector */}
                        <div className="space-y-1">
                          <label className="text-[8.5px] font-extrabold uppercase text-white/40">Voix de lecture</label>
                          <select
                            value={selectedVoiceName}
                            onChange={(e) => setSelectedVoiceName(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none"
                          >
                            {availableVoices.map(v => (
                              <option key={v.name} value={v.name} className="bg-slate-950 text-white">
                                {v.name} ({v.lang})
                              </option>
                            ))}
                            {availableVoices.length === 0 && (
                              <option className="bg-slate-950 text-white">Voix système par défaut...</option>
                            )}
                          </select>
                        </div>

                        {/* Tone & Pitch controls */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[8.5px] font-extrabold uppercase text-white/40 flex justify-between">
                              <span>Vitesse</span> <span>{Math.round(speechRate * 100)}%</span>
                            </label>
                            <input
                              type="range"
                              min="0.6"
                              max="1.1"
                              step="0.05"
                              value={speechRate}
                              onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#FFB020]"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8.5px] font-extrabold uppercase text-white/40 flex justify-between">
                              <span>Hauteur</span> <span>{Math.round(speechPitch * 100)}%</span>
                            </label>
                            <input
                              type="range"
                              min="0.8"
                              max="1.3"
                              step="0.05"
                              value={speechPitch}
                              onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#FFB020]"
                            />
                          </div>
                        </div>
                        <p className="text-[8.5px] text-white/40 italic">
                          💡 Conseil : Diminuez la vitesse à 75% ou 80% pour obtenir une tonalité de conte apaisante de qualité premium.
                        </p>
                      </div>
                    )}

                    {/* Mobile Themed Banner to remind children of the universe */}
                    <div className="flex md:hidden items-center justify-between bg-white/5 border border-white/8 rounded-xl p-2.5 mb-1.5 backdrop-blur-sm">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] animate-bounce-slow">{activeStory.emoji}</span>
                        <div className="flex flex-col text-left">
                          <span className="text-[8px] font-black uppercase tracking-widest text-[#FFB020] leading-none">Univers actif</span>
                          <span className="text-[10px] font-extrabold text-white leading-tight">{activeStory.title}</span>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-white/30 italic">{selectedHero} 🧸</span>
                    </div>

                    {/* DENSE IMMERSIVE STORY TEXT WRAPPER */}
                    <div className="flex-1 overflow-y-auto max-h-[300px] pr-2 space-y-4 py-2 custom-scrollbar">
                      {activeStory.chapters[currentChapterIndex].content.map((paragraph: string, pIdx: number) => (
                        <p 
                          key={pIdx} 
                          className={`leading-relaxed text-white/95 font-serif text-justify font-normal select-none indent-6 transition-all duration-350 ${
                            fontSize === 'sm' ? 'text-[11px] md:text-xs' :
                            fontSize === 'base' ? 'text-xs md:text-[13px]' :
                            fontSize === 'lg' ? 'text-sm md:text-[15.5px]' :
                            'text-[15px] md:text-[18px]'
                          }`}
                        >
                          {paragraph}
                        </p>
                      ))}
                    </div>

                    {/* Speech active pulsating neon waveform */}
                    {isReadingAloud && (
                      <div className="flex items-center justify-center space-x-1.5 h-6 bg-gradient-to-r from-transparent via-[#FF4D6D]/10 to-transparent border-y border-[#FF4D6D]/15 rounded-lg py-1">
                        <span className="text-[8px] font-bold text-[#FF4D6D] uppercase tracking-widest animate-pulse mr-1">Lecture contée active</span>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(bar => (
                          <div
                            key={bar}
                            className="w-[2px] bg-[#FF4D6D] rounded-full audio-wave-bar"
                            style={{ 
                              height: '100%', 
                              animationDelay: `${bar * 0.12}s`,
                              animationDuration: `${0.8 + Math.random() * 0.7}s`
                            }}
                          ></div>
                        ))}
                      </div>
                    )}

                  </div>

                  {/* Right Page Footer controls */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/6 font-sans mt-2">
                    <span className="text-[9.5px] font-black text-white/30">
                      Chapitre {currentChapterIndex + 1} / {activeStory.chapters.length}
                    </span>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handlePrevPage}
                        disabled={currentChapterIndex === 0 || isFlipping}
                        className="p-2 rounded-xl bg-white/5 border border-white/8 hover:bg-white/10 disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4 text-white" />
                      </button>

                      {currentChapterIndex < activeStory.chapters.length - 1 ? (
                        <button
                          onClick={handleNextPage}
                          disabled={isFlipping}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FFB020] to-[#FF4D6D] text-black font-extrabold text-[9px] uppercase tracking-widest flex items-center space-x-1 hover:opacity-90 active:scale-95 transition-all shadow-md shadow-[#FFB020]/15 animate-pulse-subtle cursor-pointer"
                        >
                          <span>Tourner Page</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={handleReset}
                          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-extrabold text-[9px] uppercase tracking-widest flex items-center space-x-1.5 active:scale-95 transition-all border border-white/10 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Recommencer</span>
                        </button>
                      )}
                    </div>
                  </div>

                </div>

              </div>

            </div>

            {/* DOWNTIME IMMERSIVE SOUNDSCAPE PANEL (AMPLIFYING AMBIENT NOISE & REMOVING ROBOT FEEL) */}
            <div className="bg-slate-900/60 border border-white/8 rounded-3xl p-5 md:p-6 shadow-xl relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Music className="w-4 h-4 text-[#FFB020]" />
                  <h4 className="text-[10px] font-black uppercase text-white tracking-widest">
                    Veilleuse Sonore d'Ambiance
                  </h4>
                </div>
                <span className="text-[8px] font-extrabold text-[#FFB020] uppercase tracking-widest bg-[#FFB020]/10 px-2 py-0.5 rounded-full">
                  6 Ambiances
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Mode Selector */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => { setAmbientSound('none'); stopAmbientSound(); }}
                    className={`px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      ambientSound === 'none' 
                        ? 'bg-white/15 border-white/30 text-white' 
                        : 'bg-white/5 border-white/8 text-white/50 hover:text-white'
                    }`}
                  >
                    🔇 Silence
                  </button>
                  <button
                    onClick={() => { setAmbientSound('rain'); startAmbientSound('rain'); }}
                    className={`px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      ambientSound === 'rain' 
                        ? 'bg-sky-500/20 border-sky-500 text-sky-400 shadow-[0_0_10px_rgba(14,165,233,0.15)]' 
                        : 'bg-white/5 border-white/8 text-white/50 hover:text-white'
                    }`}
                  >
                    🌧️ Douce Pluie
                  </button>
                  <button
                    onClick={() => { setAmbientSound('crickets'); startAmbientSound('crickets'); }}
                    className={`px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      ambientSound === 'crickets' 
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)]' 
                        : 'bg-white/5 border-white/8 text-white/50 hover:text-white'
                    }`}
                  >
                    🦗 Grillons d'Été
                  </button>
                  <button
                    onClick={() => { setAmbientSound('lullaby'); startAmbientSound('lullaby'); }}
                    className={`px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      ambientSound === 'lullaby' 
                        ? 'bg-pink-500/20 border-pink-500 text-pink-400 shadow-[0_0_10px_rgba(236,72,153,0.15)]' 
                        : 'bg-white/5 border-white/8 text-white/50 hover:text-white'
                    }`}
                  >
                    🎵 Berceuse Céleste
                  </button>
                  <button
                    onClick={() => { setAmbientSound('ocean'); startAmbientSound('ocean'); }}
                    className={`px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      ambientSound === 'ocean' 
                        ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.15)]' 
                        : 'bg-white/5 border-white/8 text-white/50 hover:text-white'
                    }`}
                  >
                    🌊 Vagues Océan
                  </button>
                  <button
                    onClick={() => { setAmbientSound('wind'); startAmbientSound('wind'); }}
                    className={`px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      ambientSound === 'wind' 
                        ? 'bg-teal-500/20 border-teal-500 text-teal-400 shadow-[0_0_10px_rgba(20,184,166,0.15)]' 
                        : 'bg-white/5 border-white/8 text-white/50 hover:text-white'
                    }`}
                  >
                    🌲 Vent Forêt
                  </button>
                  <button
                    onClick={() => { setAmbientSound('stream'); startAmbientSound('stream'); }}
                    className={`px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      ambientSound === 'stream' 
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)]' 
                        : 'bg-white/5 border-white/8 text-white/50 hover:text-white'
                    }`}
                  >
                    💧 Ruisseau Calme
                  </button>
                </div>

                {/* Volume slider */}
                {ambientSound !== 'none' && (
                  <div className="flex items-center space-x-3 bg-white/5 border border-white/8 rounded-2xl px-4 py-2">
                    <span className="text-[9px] font-bold text-white/40 uppercase">Volume fond :</span>
                    <input
                      type="range"
                      min="0.05"
                      max="0.45"
                      step="0.05"
                      value={ambientVolume}
                      onChange={(e) => setAmbientVolume(parseFloat(e.target.value))}
                      className="w-24 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#FFB020]"
                    />
                    <span className="text-[9px] font-bold text-white/60 w-6 text-right">
                      {Math.round(ambientVolume * 200)}%
                    </span>
                  </div>
                )}
              </div>
              <p className="text-[8.5px] text-white/30 italic">
                💡 Conseil premium : Lancez la « Berceuse Céleste » ou la « Douce Pluie » à 100% de volume de fond en activant en même temps la lecture contée. Les deux s'harmonisent magnifiquement pour plonger la chambre dans le sommeil.
              </p>
            </div>

          </div>
        )}

      </div>

      {/* Footer information bar */}
      <div className="relative z-10 pt-4 border-t border-white/6 flex items-center justify-between text-[9px] text-white/30">
        <span>© MaFamille+ Conteur IA Merveilleux 2.0</span>
        <span>Recommandé pour les contes du soir 🧸</span>
      </div>

    </div>
  );
};
