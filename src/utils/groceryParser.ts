/**
 * Utilitaire d'analyse intelligente pour la liste de courses.
 * Permet d'extraire la quantité, l'unité, de nettoyer le nom du produit,
 * de détecter des repas et d'attribuer automatiquement la bonne catégorie.
 */
import type { GroceryItem } from '../types';

export const detectGroceryCategory = (itemName: string): string => {
  const itemLower = itemName.toLowerCase();
  
  if (
    itemLower.includes('banane') || itemLower.includes('pomme') || 
    itemLower.includes('tomate') || itemLower.includes('salade') || 
    itemLower.includes('carotte') || itemLower.includes('avocat') || 
    itemLower.includes('fraise') || itemLower.includes('citron') || 
    itemLower.includes('fruit') || itemLower.includes('légume') || 
    itemLower.includes('orange') || itemLower.includes('poire') || 
    itemLower.includes('oignon') || itemLower.includes('ail') || 
    itemLower.includes('pomme de terre') || itemLower.includes('patate') || 
    itemLower.includes('courgette') || itemLower.includes('aubergine') || 
    itemLower.includes('piment') || itemLower.includes('poivron') || 
    itemLower.includes('champignon') || itemLower.includes('chou') ||
    itemLower.includes('melon') || itemLower.includes('pastèque') ||
    itemLower.includes('pêche') || itemLower.includes('abricot') ||
    itemLower.includes('radis') || itemLower.includes('épinard')
  ) {
    return 'Fruits & Légumes';
  } 

  if (
    itemLower.includes('baguette') || itemLower.includes('pain') || 
    itemLower.includes('croissant') || itemLower.includes('brioche') || 
    itemLower.includes('biscotte') || itemLower.includes('galette') || 
    itemLower.includes('muffin') || itemLower.includes('tarte') || 
    itemLower.includes('gâteau') || itemLower.includes('gateau') || 
    itemLower.includes('pâtisserie') || itemLower.includes('patisserie') || 
    itemLower.includes('cookies') || itemLower.includes('donut')
  ) {
    return 'Boulangerie';
  }
  
  if (
    itemLower.includes('lait') || itemLower.includes('beurre') || 
    itemLower.includes('fromage') || itemLower.includes('yaourt') || 
    itemLower.includes('crème') || itemLower.includes('creme') || 
    itemLower.includes('chèvre') || itemLower.includes('mozzarella') || 
    itemLower.includes('gruyère') || itemLower.includes('parmesan') || 
    itemLower.includes('frais') || itemLower.includes('oeuf') || 
    itemLower.includes('œuf') || itemLower.includes('charcuterie') ||
    itemLower.includes('crêpe') || itemLower.includes('crepe') ||
    itemLower.includes('dessert')
  ) {
    return 'Produits Frais';
  } 
  
  if (
    itemLower.includes('poulet') || itemLower.includes('viande') || 
    itemLower.includes('steak') || itemLower.includes('jambon') || 
    itemLower.includes('saumon') || itemLower.includes('poisson') || 
    itemLower.includes('sardine') || itemLower.includes('bœuf') || 
    itemLower.includes('boeuf') || itemLower.includes('porc') || 
    itemLower.includes('dinde') || itemLower.includes('saucisse') || 
    itemLower.includes('thon') || itemLower.includes('crevette') || 
    itemLower.includes('escalope') || itemLower.includes('haché') ||
    itemLower.includes('merguez') || itemLower.includes('chipolatas') ||
    itemLower.includes('côtelette') || itemLower.includes('lardons')
  ) {
    return 'Boucherie';
  } 

  if (
    itemLower.includes('pizza') || itemLower.includes('surgelé') ||
    itemLower.includes('surgele') || itemLower.includes('congelé') ||
    itemLower.includes('congele') || itemLower.includes('glace') ||
    itemLower.includes('sorbet') || itemLower.includes('frite') ||
    itemLower.includes('nugget') || itemLower.includes('poêlée')
  ) {
    return 'Surgelés';
  }
  
  if (
    itemLower.includes('eau') || itemLower.includes('jus') || 
    itemLower.includes('soda') || itemLower.includes('coca') || 
    itemLower.includes('bière') || itemLower.includes('biere') || 
    itemLower.includes('vin') || itemLower.includes('café') || 
    itemLower.includes('cafe') || itemLower.includes('thé') || 
    itemLower.includes('the') || itemLower.includes('limonade') || 
    itemLower.includes('nectar') || itemLower.includes('sirop') || 
    itemLower.includes('lait de coco') || itemLower.includes('champagne') ||
    itemLower.includes('boisson')
  ) {
    return 'Boissons';
  } 
  
  if (
    itemLower.includes('shampoing') || itemLower.includes('savon') || 
    itemLower.includes('dentifrice') || itemLower.includes('brosse') || 
    itemLower.includes('douche') || itemLower.includes('rasoir') || 
    (itemLower.includes('gel') && !itemLower.includes('surgel') && !itemLower.includes('congel')) ||
    itemLower.includes('déodorant') || itemLower.includes('coton') ||
    itemLower.includes('serviette hygiénique') || itemLower.includes('couche') ||
    itemLower.includes('maquillage')
  ) {
    return 'Hygiène';
  } 
  
  if (
    itemLower.includes('lessive') || itemLower.includes('liquide vaisselle') || 
    itemLower.includes('éponge') || itemLower.includes('eponge') || 
    itemLower.includes('nettoyant') || itemLower.includes('aspirateur') || 
    itemLower.includes('sac poubelle') || itemLower.includes('poubelle') || 
    itemLower.includes('adoucissant') || itemLower.includes('pastille') ||
    itemLower.includes('essuie-tout') || itemLower.includes('papier toilette') ||
    itemLower.includes('bougie') || itemLower.includes('ampoule') ||
    itemLower.includes('piles') || itemLower.includes('chiffon')
  ) {
    return 'Maison';
  }
  
  // Par défaut tout le reste (pâtes, riz, chocolat, sel, poivre etc.) va en épicerie
  return 'Épicerie';
};

// Analyseur de phrase naturelle ultra intelligent
export const parseSmartNaturalSentence = (text: string, activeMemberName: string): Omit<GroceryItem, 'id'>[] => {
  const normalized = text.toLowerCase().trim();

  // 1. Détection des paniers-repas ou listes types
  if (normalized.includes('petit-déjeuner') || normalized.includes('petit dejeuner')) {
    if (normalized.includes('prépare') || normalized.includes('prepare') || normalized.includes('fait les courses') || normalized.includes('faire les courses')) {
      return [
        { name: 'Lait', category: 'Produits Frais', quantity: '1 L', checked: false, inStock: true, meal: 'Petit-déjeuner', addedBy: activeMemberName },
        { name: 'Pain de mie', category: 'Boulangerie', quantity: '1 paquets', checked: false, inStock: true, meal: 'Petit-déjeuner', addedBy: activeMemberName },
        { name: 'Beurre', category: 'Produits Frais', quantity: '1 pièces', checked: false, inStock: true, meal: 'Petit-déjeuner', addedBy: activeMemberName },
        { name: 'Jus d\'orange', category: 'Boissons', quantity: '1 bouteilles', checked: false, inStock: true, meal: 'Petit-déjeuner', addedBy: activeMemberName },
        { name: 'Café', category: 'Boissons', quantity: '1 paquets', checked: false, inStock: true, meal: 'Petit-déjeuner', addedBy: activeMemberName }
      ];
    }
  }

  if (normalized.includes('barbecue')) {
    if (normalized.includes('prépare') || normalized.includes('prepare') || normalized.includes('fait les courses') || normalized.includes('faire les courses')) {
      return [
        { name: 'Chipolatas', category: 'Boucherie', quantity: '6 pièces', checked: false, inStock: true, meal: 'Déjeuner', addedBy: activeMemberName },
        { name: 'Merguez', category: 'Boucherie', quantity: '6 pièces', checked: false, inStock: true, meal: 'Déjeuner', addedBy: activeMemberName },
        { name: 'Baguette', category: 'Boulangerie', quantity: '2 pièces', checked: false, inStock: true, meal: 'Déjeuner', addedBy: activeMemberName },
        { name: 'Chips', category: 'Épicerie', quantity: '2 paquets', checked: false, inStock: true, meal: 'Déjeuner', addedBy: activeMemberName },
        { name: 'Charbon de bois', category: 'Maison', quantity: '1 pièces', checked: false, inStock: true, meal: 'Déjeuner', addedBy: activeMemberName }
      ];
    }
  }

  if (normalized.includes('goûter') || normalized.includes('gouter')) {
    if (normalized.includes('prépare') || normalized.includes('prepare') || normalized.includes('courses')) {
      return [
        { name: 'Biscuits chocolat', category: 'Épicerie', quantity: '2 paquets', checked: false, inStock: true, meal: 'Goûter', addedBy: activeMemberName },
        { name: 'Jus de pomme', category: 'Boissons', quantity: '1 bouteilles', checked: false, inStock: true, meal: 'Goûter', addedBy: activeMemberName },
        { name: 'Compotes', category: 'Épicerie', quantity: '1 boîtes', checked: false, inStock: true, meal: 'Goûter', addedBy: activeMemberName }
      ];
    }
  }

  // 2. Traitement standard des phrases multi-produits
  // Détecter et extraire le repas (meal)
  let meal: string | undefined = undefined;
  let cleanText = normalized;

  if (normalized.includes('pour ce soir') || normalized.includes('pour le dîner') || normalized.includes('pour le diner') || normalized.includes('ce soir')) {
    meal = 'Dîner';
    cleanText = cleanText
      .replace('pour ce soir', '')
      .replace('pour le dîner', '')
      .replace('pour le diner', '')
      .replace('ce soir', '');
  } else if (normalized.includes('pour ce midi') || normalized.includes('pour le déjeuner') || normalized.includes('pour le dejeuner') || normalized.includes('ce midi')) {
    meal = 'Déjeuner';
    cleanText = cleanText
      .replace('pour ce midi', '')
      .replace('pour le déjeuner', '')
      .replace('pour le dejeuner', '')
      .replace('ce midi', '');
  } else if (normalized.includes('pour le petit-déjeuner') || normalized.includes('pour le petit dejeuner') || normalized.includes('pour le petit-dej')) {
    meal = 'Petit-déjeuner';
    cleanText = cleanText
      .replace('pour le petit-déjeuner', '')
      .replace('pour le petit dejeuner', '')
      .replace('pour le petit-dej', '');
  } else if (normalized.includes('pour le goûter') || normalized.includes('pour le gouter')) {
    meal = 'Goûter';
    cleanText = cleanText
      .replace('pour le goûter', '')
      .replace('pour le gouter', '');
  }

  // Enlever les préfixes de commande
  cleanText = cleanText
    .replace(/^ajoute\s+(du\s+|de\s+la\s+|des\s+|de\s+|l\')/, '')
    .replace(/^ajoute\s+/, '')
    .replace(/^achète\s+/, '')
    .replace(/^acheter\s+/, '')
    .replace(/^rajoute\s+/, '')
    .replace(/^il faut\s+/, '');

  // Découper la phrase vocale en sous-segments
  // Connecteurs : " et ", ", ", " plus ", " puis "
  const rawSegments = cleanText.split(/,|\bet\b|\bpuis\b|\bplus\b/);
  const items: Omit<GroceryItem, 'id'>[] = [];

  const frenchNumbers: Record<string, number> = {
    'un': 1, 'une': 1, 'deux': 2, 'trois': 3, 'quatre': 4, 'cinq': 5,
    'six': 6, 'sept': 7, 'huit': 8, 'neuf': 9, 'dix': 10
  };

  const unitKeywords = [
    { word: 'bouteilles', norm: 'bouteilles' },
    { word: 'bouteille', norm: 'bouteilles' },
    { word: 'kilos', norm: 'kg' },
    { word: 'kilo', norm: 'kg' },
    { word: 'kg', norm: 'kg' },
    { word: 'grammes', norm: 'g' },
    { word: 'gramme', norm: 'g' },
    { word: 'g', norm: 'g' },
    { word: 'packs', norm: 'packs' },
    { word: 'pack', norm: 'packs' },
    { word: 'litres', norm: 'L' },
    { word: 'litre', norm: 'L' },
    { word: 'l', norm: 'L' },
    { word: 'boîtes', norm: 'boîtes' },
    { word: 'boîte', norm: 'boîtes' },
    { word: 'paquets', norm: 'paquets' },
    { word: 'paquet', norm: 'paquets' },
    { word: 'pots', norm: 'pots' },
    { word: 'pot', norm: 'pots' },
    { word: 'canettes', norm: 'canettes' },
    { word: 'canette', norm: 'canettes' }
  ];

  for (const seg of rawSegments) {
    const trimmedSeg = seg.trim();
    if (!trimmedSeg) continue;

    let qty = 1;
    let unit = 'pièces';
    const words = trimmedSeg.split(/\s+/);
    const firstWord = words[0].toLowerCase();
    let remainingName = trimmedSeg;

    // Détection de la quantité numérique ou écrite en français
    if (firstWord in frenchNumbers) {
      qty = frenchNumbers[firstWord];
      remainingName = words.slice(1).join(' ');
    } else {
      const parsedNumber = parseInt(firstWord);
      if (!isNaN(parsedNumber)) {
        qty = parsedNumber;
        remainingName = words.slice(1).join(' ');
      }
    }

    // Détection de l'unité
    let foundUnit = false;
    for (const uk of unitKeywords) {
      const lowerName = remainingName.toLowerCase();
      if (lowerName.startsWith(uk.word + ' de ')) {
        unit = uk.norm;
        remainingName = remainingName.slice((uk.word + ' de ').length).trim();
        foundUnit = true;
        break;
      } else if (lowerName.startsWith(uk.word + ' d\'')) {
        unit = uk.norm;
        remainingName = remainingName.slice((uk.word + ' d\'').length).trim();
        foundUnit = true;
        break;
      } else if (lowerName.startsWith(uk.word + ' ')) {
        unit = uk.norm;
        remainingName = remainingName.slice(uk.word.length).trim();
        foundUnit = true;
        break;
      }
    }

    if (!foundUnit) {
      // Nettoyer les déterminants restants en début de nom
      remainingName = remainingName
        .replace(/^(du\s+|de\s+la\s+|des\s+|de\s+|l\'|le\s+|la\s+|un\s+|une\s+)/, '')
        .trim();
    }

    if (unit === 'pièces' && qty === 1) {
      unit = 'pièces'; // ou pièces
    }

    // Formater le nom du produit
    if (!remainingName) continue;
    remainingName = remainingName.charAt(0).toUpperCase() + remainingName.slice(1);

    const category = detectGroceryCategory(remainingName);

    items.push({
      name: remainingName,
      category,
      quantity: `${qty} ${unit}`,
      checked: false,
      inStock: true,
      meal,
      addedBy: activeMemberName
    });
  }

  return items;
};

// Garde de compatibilité
export const parseGroceryNameAndQty = (text: string) => {
  const items = parseSmartNaturalSentence(text, 'Foyer');
  if (items.length > 0) {
    return {
      name: items[0].name,
      qtyString: items[0].quantity
    };
  }
  return {
    name: text,
    qtyString: '1 pièces'
  };
};
