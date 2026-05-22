/**
 * Utilitaire d'analyse intelligente pour la liste de courses.
 * Permet d'extraire la quantité, l'unité, de nettoyer le nom du produit
 * et d'attribuer automatiquement la bonne catégorie.
 */

export const detectGroceryCategory = (itemName: string): string => {
  const itemLower = itemName.toLowerCase();
  
  if (itemLower.includes('banane') || itemLower.includes('pomme') || itemLower.includes('tomate') || itemLower.includes('salade') || itemLower.includes('carotte') || itemLower.includes('avocat') || itemLower.includes('fraise') || itemLower.includes('citron') || itemLower.includes('fruit') || itemLower.includes('légume') || itemLower.includes('orange') || itemLower.includes('poire') || itemLower.includes('oignon') || itemLower.includes('ail') || itemLower.includes('pomme de terre') || itemLower.includes('patate') || itemLower.includes('courgette') || itemLower.includes('aubergine') || itemLower.includes('piment') || itemLower.includes('poivron') || itemLower.includes('champignon') || itemLower.includes('chou')) {
    return 'Fruits & Légumes';
  } 
  
  if (itemLower.includes('lait') || itemLower.includes('beurre') || itemLower.includes('fromage') || itemLower.includes('yaourt') || itemLower.includes('crème') || itemLower.includes('creme') || itemLower.includes('chèvre') || itemLower.includes('mozzarella') || itemLower.includes('gruyère') || itemLower.includes('parmesan') || itemLower.includes('frais') || itemLower.includes('oeuf') || itemLower.includes('œuf') || itemLower.includes('frite') || itemLower.includes('surgel') || itemLower.includes('congel') || itemLower.includes('glace')) {
    return 'Produits Frais';
  } 
  
  if (itemLower.includes('poulet') || itemLower.includes('viande') || itemLower.includes('steak') || itemLower.includes('jambon') || itemLower.includes('saumon') || itemLower.includes('poisson') || itemLower.includes('sardine') || itemLower.includes('bœuf') || itemLower.includes('boeuf') || itemLower.includes('porc') || itemLower.includes('dinde') || itemLower.includes('saucisse') || itemLower.includes('thon') || itemLower.includes('crevette') || itemLower.includes('escalope') || itemLower.includes('haché')) {
    return 'Boucherie';
  } 
  
  if (itemLower.includes('eau') || itemLower.includes('jus') || itemLower.includes('soda') || itemLower.includes('coca') || itemLower.includes('bière') || itemLower.includes('biere') || itemLower.includes('vin') || itemLower.includes('café') || itemLower.includes('cafe') || itemLower.includes('thé') || itemLower.includes('the') || itemLower.includes('limonade') || itemLower.includes('nectar') || itemLower.includes('sirop') || itemLower.includes('lait de coco')) {
    return 'Boissons';
  } 
  
  if (itemLower.includes('shampoing') || itemLower.includes('savon') || itemLower.includes('dentifrice') || itemLower.includes('brosse') || itemLower.includes('douche') || itemLower.includes('papier toilette') || itemLower.includes('essuie-tout') || itemLower.includes('couche') || itemLower.includes('coton') || itemLower.includes('serviette') || itemLower.includes('rasoir') || (/\bgel\b/.test(itemLower) && !itemLower.includes('surgel') && !itemLower.includes('congel'))) {
    return 'Hygiène';
  } 
  
  if (itemLower.includes('lessive') || itemLower.includes('liquide vaisselle') || itemLower.includes('éponge') || itemLower.includes('eponge') || itemLower.includes('nettoyant') || itemLower.includes('aspirateur') || itemLower.includes('sac poubelle') || itemLower.includes('poubelle') || itemLower.includes('adoucissant') || itemLower.includes('pastille')) {
    return 'Entretien';
  }
  
  // Par défaut tout le reste (pâtes, riz, pain, chocolat etc.) va en épicerie
  return 'Épicerie';
};

export const parseGroceryNameAndQty = (text: string) => {
  const frenchNumbers: Record<string, number> = {
    'un': 1, 'une': 1, 'deux': 2, 'trois': 3, 'quatre': 4, 'cinq': 5,
    'six': 6, 'sept': 7, 'huit': 8, 'neuf': 9, 'dix': 10
  };

  let qty = 1;
  let unit = 'pièce';
  
  const words = text.trim().split(/\s+/);
  const firstWord = words[0].toLowerCase();
  let remainingName = text.trim();

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
    { word: 'boîtes', norm: 'boîtes' },
    { word: 'boîte', norm: 'boîtes' },
    { word: 'paquets', norm: 'paquets' },
    { word: 'paquet', norm: 'paquets' },
    { word: 'pots', norm: 'pots' },
    { word: 'pot', norm: 'pots' },
    { word: 'canettes', norm: 'canettes' },
    { word: 'canette', norm: 'canettes' }
  ];

  for (const uk of unitKeywords) {
    const lowerName = remainingName.toLowerCase();
    if (lowerName.startsWith(uk.word + ' de ')) {
      unit = uk.norm;
      remainingName = remainingName.slice((uk.word + ' de ').length).trim();
      break;
    } else if (lowerName.startsWith(uk.word + ' d\'')) {
      unit = uk.norm;
      remainingName = remainingName.slice((uk.word + ' d\'').length).trim();
      break;
    } else if (lowerName.startsWith(uk.word + ' ')) {
      unit = uk.norm;
      remainingName = remainingName.slice(uk.word.length).trim();
      break;
    }
  }

  if (unit === 'pièce' && qty > 1) {
    unit = 'pièces';
  }

  remainingName = remainingName.charAt(0).toUpperCase() + remainingName.slice(1);
  return {
    name: remainingName,
    qtyString: `${qty} ${unit}`
  };
};
