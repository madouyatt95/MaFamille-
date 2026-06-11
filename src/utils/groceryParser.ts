/**
 * Utilitaire d'analyse intelligente pour la liste de courses.
 * Permet d'extraire la quantité, l'unité, de nettoyer le nom du produit,
 * de détecter des repas et d'attribuer automatiquement la bonne catégorie.
 */
import type { GroceryItem } from '../types';

export interface ProductInfo {
  name: string;
  category: string;
  emoji: string;
  keywords: string[];
}

export const PRODUCT_LIST: ProductInfo[] = [
  // Fruits & légumes
  { name: 'Tomates', category: 'Fruits & Légumes', emoji: '🍅', keywords: ['tomate', 'tomates'] },
  { name: 'Oignons', category: 'Fruits & Légumes', emoji: '🧅', keywords: ['oignon', 'oignons'] },
  { name: 'Pommes de terre', category: 'Fruits & Légumes', emoji: '🥔', keywords: ['pomme de terre', 'pommes de terre', 'patate', 'patates'] },
  { name: 'Carottes', category: 'Fruits & Légumes', emoji: '🥕', keywords: ['carotte', 'carottes'] },
  { name: 'Salade', category: 'Fruits & Légumes', emoji: '🥬', keywords: ['salade', 'salades', 'laitue', 'laitues'] },
  { name: 'Concombre', category: 'Fruits & Légumes', emoji: '🥒', keywords: ['concombre', 'concombres'] },
  { name: 'Poivrons', category: 'Fruits & Légumes', emoji: '🫑', keywords: ['poivron', 'poivrons', 'piment', 'piments'] },
  { name: 'Courgettes', category: 'Fruits & Légumes', emoji: '🥒', keywords: ['courgette', 'courgettes'] },
  { name: 'Aubergines', category: 'Fruits & Légumes', emoji: '🍆', keywords: ['aubergine', 'aubergines'] },
  { name: 'Bananes', category: 'Fruits & Légumes', emoji: '🍌', keywords: ['banane', 'bananes'] },
  { name: 'Pommes', category: 'Fruits & Légumes', emoji: '🍎', keywords: ['pomme', 'pommes'] },
  { name: 'Oranges', category: 'Fruits & Légumes', emoji: '🍊', keywords: ['orange', 'oranges'] },
  { name: 'Citrons', category: 'Fruits & Légumes', emoji: '🍋', keywords: ['citron', 'citrons'] },
  { name: 'Fraises', category: 'Fruits & Légumes', emoji: '🍓', keywords: ['fraise', 'fraises'] },
  { name: 'Raisins', category: 'Fruits & Légumes', emoji: '🍇', keywords: ['raisin', 'raisins'] },
  { name: 'Mangues', category: 'Fruits & Légumes', emoji: '🥭', keywords: ['mangue', 'mangues'] },
  { name: 'Pastèque', category: 'Fruits & Légumes', emoji: '🍉', keywords: ['pastèque', 'pasteque', 'pastèques', 'pasteques'] },
  { name: 'Melon', category: 'Fruits & Légumes', emoji: '🍈', keywords: ['melon', 'melons'] },
  { name: 'Avocats', category: 'Fruits & Légumes', emoji: '🥑', keywords: ['avocat', 'avocats'] },
  { name: 'Ail', category: 'Fruits & Légumes', emoji: '🧄', keywords: ['ail'] },
  { name: 'Persil', category: 'Fruits & Légumes', emoji: '🌿', keywords: ['persil'] },
  { name: 'Coriandre', category: 'Fruits & Légumes', emoji: '🌿', keywords: ['coriandre'] },
  { name: 'Menthe', category: 'Fruits & Légumes', emoji: '🌱', keywords: ['menthe'] },
  { name: 'Épinards', category: 'Fruits & Légumes', emoji: '🥬', keywords: ['épinard', 'epinard', 'épinards', 'epinards'] },
  { name: 'Brocolis', category: 'Fruits & Légumes', emoji: '🥦', keywords: ['brocoli', 'brocolis'] },
  { name: 'Haricots verts', category: 'Fruits & Légumes', emoji: '🫘', keywords: ['haricot vert', 'haricots verts'] },

  // Produits laitiers
  { name: 'Lait', category: 'Produits laitiers', emoji: '🥛', keywords: ['lait', 'laits'] },
  { name: 'Yaourts', category: 'Produits laitiers', emoji: '🥛', keywords: ['yaourt', 'yaourts'] },
  { name: 'Fromage', category: 'Produits laitiers', emoji: '🧀', keywords: ['fromage', 'fromages'] },
  { name: 'Beurre', category: 'Produits laitiers', emoji: '🧈', keywords: ['beurre', 'beurres'] },
  { name: 'Crème fraîche', category: 'Produits laitiers', emoji: '🍶', keywords: ['crème fraîche', 'creme fraiche', 'crème', 'creme'] },
  { name: 'Mozzarella', category: 'Produits laitiers', emoji: '🧀', keywords: ['mozzarella', 'mozza'] },
  { name: 'Emmental', category: 'Produits laitiers', emoji: '🧀', keywords: ['emmental', 'gruyère', 'gruyere'] },
  { name: 'Kiri', category: 'Produits laitiers', emoji: '🧀', keywords: ['kiri'] },
  { name: 'Vache qui rit', category: 'Produits laitiers', emoji: '🧀', keywords: ['vache qui rit', 'la vache qui rit'] },
  { name: 'Fromage blanc', category: 'Produits laitiers', emoji: '🥛', keywords: ['fromage blanc'] },

  // Épicerie
  { name: 'Riz', category: 'Épicerie', emoji: '🍚', keywords: ['riz'] },
  { name: 'Pâtes', category: 'Épicerie', emoji: '🍝', keywords: ['pâte', 'pates', 'pâtes'] },
  { name: 'Couscous', category: 'Épicerie', emoji: '🍛', keywords: ['couscous'] },
  { name: 'Semoule', category: 'Épicerie', emoji: '🌾', keywords: ['semoule'] },
  { name: 'Farine', category: 'Épicerie', emoji: '🌾', keywords: ['farine', 'farines'] },
  { name: 'Sucre', category: 'Épicerie', emoji: '🍬', keywords: ['sucre', 'sucres'] },
  { name: 'Sel', category: 'Épicerie', emoji: '🧂', keywords: ['sel'] },
  { name: 'Poivre', category: 'Épicerie', emoji: '🧂', keywords: ['poivre'] },
  { name: 'Huile', category: 'Épicerie', emoji: '🫗', keywords: ['huile', 'huiles'] },
  { name: 'Huile d\'olive', category: 'Épicerie', emoji: '🫒', keywords: ['huile d\'olive', 'huile d’olive'] },
  { name: 'Vinaigre', category: 'Épicerie', emoji: '🍶', keywords: ['vinaigre', 'vinaigres'] },
  { name: 'Café', category: 'Épicerie', emoji: '☕', keywords: ['café', 'cafe', 'cafés', 'cafes'] },
  { name: 'Thé', category: 'Épicerie', emoji: '🍵', keywords: ['thé', 'the', 'thés', 'thes'] },
  { name: 'Chocolat', category: 'Épicerie', emoji: '🍫', keywords: ['chocolat', 'chocolats'] },
  { name: 'Céréales', category: 'Épicerie', emoji: '🥣', keywords: ['céréale', 'cereale', 'céréales', 'cereales'] },
  { name: 'Biscuits', category: 'Épicerie', emoji: '🍪', keywords: ['biscuit', 'biscuits', 'cookie', 'cookies', 'gâteau', 'gateau', 'gâteaux', 'gateaux'] },
  { name: 'Pain de mie', category: 'Épicerie', emoji: '🍞', keywords: ['pain de mie'] },
  { name: 'Confiture', category: 'Épicerie', emoji: '🍯', keywords: ['confiture', 'confitures'] },
  { name: 'Miel', category: 'Épicerie', emoji: '🍯', keywords: ['miel', 'miels'] },
  { name: 'Nutella', category: 'Épicerie', emoji: '🍫', keywords: ['nutella'] },
  { name: 'Thon', category: 'Épicerie', emoji: '🐟', keywords: ['thon'] },
  { name: 'Sardines', category: 'Épicerie', emoji: '🐟', keywords: ['sardine', 'sardines'] },
  { name: 'Lentilles', category: 'Épicerie', emoji: '🫘', keywords: ['lentille', 'lentilles'] },
  { name: 'Pois chiches', category: 'Épicerie', emoji: '🫘', keywords: ['pois chiche', 'pois chiches'] },
  { name: 'Haricots rouges', category: 'Épicerie', emoji: '🫘', keywords: ['haricot rouge', 'haricots rouges'] },

  // Boulangerie
  { name: 'Pain', category: 'Boulangerie', emoji: '🍞', keywords: ['pain', 'pains'] },
  { name: 'Baguette', category: 'Boulangerie', emoji: '🥖', keywords: ['baguette', 'baguettes'] },
  { name: 'Croissants', category: 'Boulangerie', emoji: '🥐', keywords: ['croissant', 'croissants'] },
  { name: 'Pains au chocolat', category: 'Boulangerie', emoji: '🥐', keywords: ['pain au chocolat', 'pains au chocolat', 'chocolatine', 'chocolatines'] },
  { name: 'Brioche', category: 'Boulangerie', emoji: '🍞', keywords: ['brioche', 'brioches'] },
  { name: 'Wraps', category: 'Boulangerie', emoji: '🫓', keywords: ['wrap', 'wraps'] },
  { name: 'Tortillas', category: 'Boulangerie', emoji: '🫓', keywords: ['tortilla', 'tortillas'] },

  // Viandes & poissons
  { name: 'Poulet', category: 'Viandes & poissons', emoji: '🍗', keywords: ['poulet', 'poulets', 'dinde', 'dindes', 'escalope', 'escalopes'] },
  { name: 'Viande hachée', category: 'Viandes & poissons', emoji: '🥩', keywords: ['viande hachée', 'viande hachee'] },
  { name: 'Bœuf', category: 'Viandes & poissons', emoji: '🥩', keywords: ['bœuf', 'boeuf', 'bœufs', 'boeufs'] },
  { name: 'Agneau', category: 'Viandes & poissons', emoji: '🥩', keywords: ['agneau', 'agneaux'] },
  { name: 'Merguez', category: 'Viandes & poissons', emoji: '🌭', keywords: ['merguez'] },
  { name: 'Steak', category: 'Viandes & poissons', emoji: '🥩', keywords: ['steak', 'steaks'] },
  { name: 'Poisson', category: 'Viandes & poissons', emoji: '🐟', keywords: ['poisson', 'poissons'] },
  { name: 'Saumon', category: 'Viandes & poissons', emoji: '🐟', keywords: ['saumon', 'saumons'] },
  { name: 'Thon frais', category: 'Viandes & poissons', emoji: '🐟', keywords: ['thon frais'] },
  { name: 'Crevettes', category: 'Viandes & poissons', emoji: '🍤', keywords: ['crevette', 'crevettes'] },
  { name: 'Œufs', category: 'Viandes & poissons', emoji: '🥚', keywords: ['œuf', 'oeuf', 'œufs', 'oeufs'] },

  // Boissons
  { name: 'Eau', category: 'Boissons', emoji: '💧', keywords: ['eau', 'eaux', 'eau minérale', 'eau minerale'] },
  { name: 'Bouteilles d\'eau', category: 'Boissons', emoji: '💧', keywords: ['bouteille d\'eau', 'bouteilles d\'eau', 'bouteille d’eau', 'bouteilles d’eau', 'pack d\'eau', 'pack d’eau'] },
  { name: 'Coca-Cola', category: 'Boissons', emoji: '🥤', keywords: ['coca', 'coca-cola', 'cocacola', 'coca cola'] },
  { name: 'Fanta', category: 'Boissons', emoji: '🥤', keywords: ['fanta'] },
  { name: 'Oasis', category: 'Boissons', emoji: '🥤', keywords: ['oasis'] },
  { name: 'Jus d\'orange', category: 'Boissons', emoji: '🥤', keywords: ['jus d\'orange', 'jus d’orange'] },
  { name: 'Jus de pomme', category: 'Boissons', emoji: '🥤', keywords: ['jus de pomme', 'jus de pommes'] },
  { name: 'Lait chocolaté', category: 'Boissons', emoji: '🥛', keywords: ['lait chocolaté', 'lait chocolate'] },

  // Surgelés
  { name: 'Frites', category: 'Surgelés', emoji: '🍟', keywords: ['frite', 'frites'] },
  { name: 'Pizzas', category: 'Surgelés', emoji: '🍕', keywords: ['pizza', 'pizzas'] },
  { name: 'Légumes surgelés', category: 'Surgelés', emoji: '❄️', keywords: ['légumes surgelés', 'legumes surgeles', 'légume surgelé', 'legume surgele'] },
  { name: 'Glaces', category: 'Surgelés', emoji: '🍦', keywords: ['glace', 'glaces', 'sorbet', 'sorbets'] },
  { name: 'Nuggets', category: 'Surgelés', emoji: '🍗', keywords: ['nugget', 'nuggets'] },
  { name: 'Poissons panés', category: 'Surgelés', emoji: '🐟', keywords: ['poisson pané', 'poissons panés', 'poisson pane', 'poissons panes'] },

  // Hygiène
  { name: 'Dentifrice', category: 'Hygiène', emoji: '🪥', keywords: ['dentifrice', 'dentifrices'] },
  { name: 'Brosse à dents', category: 'Hygiène', emoji: '🪥', keywords: ['brosse à dents', 'brosses à dents'] },
  { name: 'Savon', category: 'Hygiène', emoji: '🧼', keywords: ['savon', 'savons'] },
  { name: 'Gel douche', category: 'Hygiène', emoji: '🧼', keywords: ['gel douche', 'gels douche'] },
  { name: 'Shampoing', category: 'Hygiène', emoji: '🧴', keywords: ['shampoing', 'shampoings', 'après-shampoing', 'apres-shampoing'] },
  { name: 'Déodorant', category: 'Hygiène', emoji: '🧴', keywords: ['déodorant', 'deodorant', 'déodorants', 'deodorants'] },
  { name: 'Papier toilette', category: 'Hygiène', emoji: '🧻', keywords: ['papier toilette', 'pq'] },
  { name: 'Mouchoirs', category: 'Hygiène', emoji: '🤧', keywords: ['mouchoir', 'mouchoirs'] },
  { name: 'Couches', category: 'Hygiène', emoji: '👶', keywords: ['couche', 'couches'] },
  { name: 'Lingettes', category: 'Hygiène', emoji: '🧻', keywords: ['lingette', 'lingettes'] },
  { name: 'Serviettes hygiéniques', category: 'Hygiène', emoji: '🩸', keywords: ['serviette hygiénique', 'serviettes hygiéniques', 'tampon', 'tampons'] },

  // Maison
  { name: 'Lessive', category: 'Maison', emoji: '🧼', keywords: ['lessive', 'lessives'] },
  { name: 'Liquide vaisselle', category: 'Maison', emoji: '🧼', keywords: ['liquide vaisselle'] },
  { name: 'Éponges', category: 'Maison', emoji: '🧽', keywords: ['éponge', 'eponge', 'éponges', 'eponges'] },
  { name: 'Sacs poubelle', category: 'Maison', emoji: '🗑️', keywords: ['sac poubelle', 'sacs poubelle', 'sac poubelles', 'sacs poubelles'] },
  { name: 'Nettoyant sol', category: 'Maison', emoji: '🧹', keywords: ['nettoyant sol', 'nettoyant'] },
  { name: 'Javel', category: 'Maison', emoji: '🧴', keywords: ['javel', 'eau de javel'] },
  { name: 'Essuie-tout', category: 'Maison', emoji: '🧻', keywords: ['essuie-tout', 'sopalin'] },
  { name: 'Aluminium', category: 'Maison', emoji: '🪙', keywords: ['aluminium', 'alu', 'papier alu', 'papier aluminium'] },
  { name: 'Film alimentaire', category: 'Maison', emoji: '🛡️', keywords: ['film alimentaire', 'cellophane'] },

  // Bébé
  { name: 'Lait bébé', category: 'Bébé', emoji: '🍼', keywords: ['lait bébé', 'lait bebe'] },
  { name: 'Petits pots', category: 'Bébé', emoji: '👶', keywords: ['petit pot', 'petits pots', 'pot bébé', 'pots bebe'] },
  { name: 'Compotes bébé', category: 'Bébé', emoji: '🍏', keywords: ['compote bébé', 'compotes bébé', 'compote bebe', 'compotes bebe'] },
  { name: 'Biscuits bébé', category: 'Bébé', emoji: '🍪', keywords: ['biscuit bébé', 'biscuits bébé', 'biscuit bebe', 'biscuits bebe'] },

  // Animaux
  { name: 'Croquettes', category: 'Animaux', emoji: '🥩', keywords: ['croquettes', 'croquette', 'croquettes chat', 'croquettes chien'] },
  { name: 'Pâtée', category: 'Animaux', emoji: '🥫', keywords: ['pâtée', 'patee', 'pâtées', 'patees'] },
  { name: 'Litière', category: 'Animaux', emoji: '🐱', keywords: ['litière', 'litiere'] },
  { name: 'Friandises animaux', category: 'Animaux', emoji: '🦴', keywords: ['friandise', 'friandises'] },

  // Pharmacie
  { name: 'Doliprane', category: 'Pharmacie', emoji: '💊', keywords: ['doliprane'] },
  { name: 'Paracétamol', category: 'Pharmacie', emoji: '💊', keywords: ['paracétamol', 'paracetamol'] },
  { name: 'Ibuprofène', category: 'Pharmacie', emoji: '💊', keywords: ['ibuprofène', 'ibuprofene'] },
  { name: 'Pansements', category: 'Pharmacie', emoji: '🩹', keywords: ['pansement', 'pansements'] },
  { name: 'Sérum physiologique', category: 'Pharmacie', emoji: '🧪', keywords: ['sérum physiologique', 'serum physiologique', 'sérum physio', 'serum physio'] },
  { name: 'Vitamines', category: 'Pharmacie', emoji: '💊', keywords: ['vitamine', 'vitamines'] }
];

export const POPULAR_GROCERIES = PRODUCT_LIST.map(p => p.name);

export const getProductInfo = (name: string): ProductInfo | undefined => {
  const lower = name.toLowerCase().trim();
  
  // 1. Recherche exacte sur le nom standard
  let found = PRODUCT_LIST.find(p => p.name.toLowerCase() === lower);
  if (found) return found;

  // 2. Recherche exacte sur les mots-clés
  found = PRODUCT_LIST.find(p => p.keywords.includes(lower));
  if (found) return found;

  // 3. Recherche de mot-clé entier à l'intérieur
  found = PRODUCT_LIST.find(p => 
    p.keywords.some(kw => {
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      return regex.test(lower);
    })
  );
  return found;
};

export const getGroceryItemEmoji = (itemName: string): string => {
  const prodInfo = getProductInfo(itemName);
  if (prodInfo) return prodInfo.emoji;

  const itemLower = itemName.toLowerCase();
  if (itemLower.includes('coca')) return '🥤';
  if (itemLower.includes('lait')) return '🥛';
  if (itemLower.includes('eau')) return '💧';
  if (itemLower.includes('jus')) return '🥤';
  if (itemLower.includes('pain') || itemLower.includes('baguette') || itemLower.includes('croissant')) return '🥖';
  if (itemLower.includes('tomate')) return '🍅';
  if (itemLower.includes('riz')) return '🍚';
  if (itemLower.includes('pâte')) return '🍝';
  if (itemLower.includes('œuf') || itemLower.includes('oeuf')) return '🥚';
  if (itemLower.includes('fromage')) return '🧀';
  if (itemLower.includes('yaourt')) return '🥛';
  if (itemLower.includes('poulet') || itemLower.includes('viande')) return '🍗';
  if (itemLower.includes('poisson') || itemLower.includes('saumon')) return '🐟';
  if (itemLower.includes('pizza')) return '🍕';
  if (itemLower.includes('glace')) return '🍦';
  if (itemLower.includes('doliprane') || itemLower.includes('paracétamol') || itemLower.includes('ibuprofène') || itemLower.includes('vitamine')) return '💊';
  if (itemLower.includes('croquette') || itemLower.includes('pâtée')) return '🐱';
  if (itemLower.includes('bébé')) return '👶';
  if (itemLower.includes('lessive') || itemLower.includes('savon')) return '🧼';
  return '🛒';
};

export const detectGroceryCategory = (itemName: string): string => {
  const prodInfo = getProductInfo(itemName);
  if (prodInfo) return prodInfo.category;

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
    return 'Produits laitiers';
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
    return 'Viandes & poissons';
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
  
  return 'Épicerie';
};

export const formatGroceryQty = (qty: string): string => {
  if (!qty) return '';
  if (qty.endsWith(' pièces')) {
    return qty.replace(' pièces', '').trim();
  }
  return qty;
};

// Analyseur de phrase naturelle ultra intelligent
export const parseSmartNaturalSentence = (text: string, activeMemberName: string): Omit<GroceryItem, 'id'>[] => {
  const normalized = text.toLowerCase().trim();

  // 1. Détection des paniers-repas ou listes types
  if (normalized.includes('petit-déjeuner') || normalized.includes('petit dejeuner')) {
    if (normalized.includes('prépare') || normalized.includes('prepare') || normalized.includes('fait les courses') || normalized.includes('faire les courses')) {
      return [
        { name: 'Lait', category: 'Produits laitiers', quantity: '1 L', checked: false, inStock: true, meal: 'Petit-déjeuner', addedBy: activeMemberName },
        { name: 'Pain de mie', category: 'Épicerie', quantity: '1 paquets', checked: false, inStock: true, meal: 'Petit-déjeuner', addedBy: activeMemberName },
        { name: 'Beurre', category: 'Produits laitiers', quantity: '1 pièces', checked: false, inStock: true, meal: 'Petit-déjeuner', addedBy: activeMemberName },
        { name: 'Jus d\'orange', category: 'Boissons', quantity: '1 bouteilles', checked: false, inStock: true, meal: 'Petit-déjeuner', addedBy: activeMemberName },
        { name: 'Café', category: 'Boissons', quantity: '1 paquets', checked: false, inStock: true, meal: 'Petit-déjeuner', addedBy: activeMemberName }
      ];
    }
  }

  if (normalized.includes('barbecue')) {
    if (normalized.includes('prépare') || normalized.includes('prepare') || normalized.includes('fait les courses') || normalized.includes('faire les courses')) {
      return [
        { name: 'Chipolatas', category: 'Viandes & poissons', quantity: '6 pièces', checked: false, inStock: true, meal: 'Déjeuner', addedBy: activeMemberName },
        { name: 'Merguez', category: 'Viandes & poissons', quantity: '6 pièces', checked: false, inStock: true, meal: 'Déjeuner', addedBy: activeMemberName },
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

  // Enlever les préfixes de commande et suffixes de liste
  cleanText = cleanText
    .replace(/^ajoute\s+(du\s+|de\s+la\s+|des\s+|de\s+|l')/, '')
    .replace(/^ajoute\s+/, '')
    .replace(/^achète\s+/, '')
    .replace(/^acheter\s+/, '')
    .replace(/^rajoute\s+/, '')
    .replace(/^il faut\s+/, '')
    .replace(/\s*(?:dans les courses|dans la liste|au panier|à la liste|aux courses|de courses)\s*/gi, ' ')
    .trim();

  // Remplacer les connecteurs explicites par '|'
  let textWithSplits = cleanText.replace(/,|\bet\b|\bplus\b|\bpuis\b|\bavec\b/g, '|');

  // Insérer '|' devant les répétitions de quantités (chiffres ou mots-nombres)
  textWithSplits = textWithSplits.replace(/(?<![|])\s+\b(un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|dix-sept|dix-huit|dix-neuf|vingt|\d+)\b/gi, ' | $1');

  // Insérer '|' devant les produits connus successifs s'ils ne sont pas précédés d'un déterminant de liaison
  const KNOWN_PRODUCTS = Array.from(new Set(
    PRODUCT_LIST.flatMap(p => [p.name.toLowerCase(), ...p.keywords])
  )).sort((a, b) => b.length - a.length);

  let formattedText = textWithSplits;
  for (const product of KNOWN_PRODUCTS) {
    const regex = new RegExp(`(?<!\\b(?:de|du|des|d'|d’|le|la|les|l'|l’|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|dix-sept|dix-huit|dix-neuf|vingt|\\d+))\\s+\\b(${product})\\b`, 'gi');
    formattedText = formattedText.replace(regex, ' | $1');
  }

  // Découper la phrase vocale en sous-segments
  const rawSegments = formattedText.split('|');
  const items: Omit<GroceryItem, 'id'>[] = [];

  const frenchNumbers: Record<string, number> = {
    'un': 1, 'une': 1, 'deux': 2, 'trois': 3, 'quatre': 4, 'cinq': 5,
    'six': 6, 'sept': 7, 'huit': 8, 'neuf': 9, 'dix': 10, 'onze': 11,
    'douze': 12, 'treize': 13, 'quatorze': 14, 'quinze': 15, 'seize': 16,
    'dix-sept': 17, 'dix-huit': 18, 'dix-neuf': 19, 'vingt': 20
  };

  const unitKeywords = [
    { word: 'bouteilles', norm: 'bouteilles' },
    { word: 'bouteille', norm: 'bouteilles' },
    { word: 'kilos', norm: 'kilos' },
    { word: 'kilo', norm: 'kilos' },
    { word: 'kg', norm: 'kilos' },
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
    { word: 'paquets', norm: 'paquet' },
    { word: 'paquet', norm: 'paquet' },
    { word: 'pots', norm: 'pots' },
    { word: 'pot', norm: 'pots' },
    { word: 'canettes', norm: 'canettes' },
    { word: 'canette', norm: 'canettes' }
  ];

  const parasiteWords = [
    'de', 'du', 'des', 'd\'', 'd’', 'le', 'la', 'les',
    'un', 'une', 'deux', 'trois', 'quatre', 'cinq',
    'six', 'sept', 'huit', 'neuf', 'dix'
  ];

  for (const seg of rawSegments) {
    const trimmedSeg = seg.trim();
    if (!trimmedSeg) continue;

    let qty = 1;
    let unit = 'pièces';
    const words = trimmedSeg.split(/\s+/);
    const firstWord = words[0].toLowerCase();
    let remainingName = trimmedSeg;
    let hasParsedQty = false;

    // Détection de la quantité numérique ou écrite en français (Priorité quantité)
    if (firstWord in frenchNumbers) {
      qty = frenchNumbers[firstWord];
      remainingName = words.slice(1).join(' ');
      hasParsedQty = true;
    } else {
      const parsedNumber = parseInt(firstWord);
      if (!isNaN(parsedNumber)) {
        qty = parsedNumber;
        remainingName = words.slice(1).join(' ');
        hasParsedQty = true;
      }
    }

    // Détection de l'unité si quantité présente
    if (hasParsedQty) {
      let foundUnit = false;
      const lowerName = remainingName.toLowerCase();
      for (const uk of unitKeywords) {
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
        } else if (lowerName.startsWith(uk.word + ' d’')) {
          unit = uk.norm;
          remainingName = remainingName.slice((uk.word + ' d’').length).trim();
          foundUnit = true;
          break;
        } else if (lowerName === uk.word || lowerName.startsWith(uk.word + ' ')) {
          unit = uk.norm;
          remainingName = remainingName.slice(uk.word.length).trim();
          foundUnit = true;
          break;
        }
      }

      if (!foundUnit) {
        // Enlever les liaisons restantes si pas d'unité (ex: "de Coca" -> "Coca")
        remainingName = remainingName
          .replace(/^(du\s+|de\s+la\s+|des\s+|de\s+|d'|d’|l'|le\s+|la\s+|les\s+)/i, '')
          .trim();
      }
    } else {
      // Pas de quantité explicitée, enlever les déterminants au début
      remainingName = remainingName
        .replace(/^(du\s+|de\s+la\s+|des\s+|de\s+|d'|d’|l'|le\s+|la\s+|les\s+)/i, '')
        .trim();
    }

    // Gestion des variantes intelligentes et standardisation
    let standardName = remainingName.trim();
    if (!standardName) continue;
    
    const lowerName = standardName.toLowerCase();

    if (lowerName === 'coca') {
      standardName = 'Coca-Cola';
    } else if (lowerName === 'eau') {
      if (qty > 1 || unit !== 'pièces') {
        standardName = 'Bouteilles d\'eau';
      } else {
        standardName = 'Eau';
      }
    } else if (lowerName === 'yaourt') {
      standardName = 'Yaourts';
    } else if (lowerName === 'tomate') {
      standardName = 'Tomates';
    } else if (lowerName === 'oeuf' || lowerName === 'œuf') {
      standardName = 'Œufs';
    } else if (lowerName === 'pates' || lowerName === 'pâte') {
      standardName = 'Pâtes';
    } else {
      const prodInfo = getProductInfo(standardName);
      if (prodInfo) {
        standardName = prodInfo.name;
      } else {
        standardName = standardName.charAt(0).toUpperCase() + standardName.slice(1);
      }
    }

    // Filtrage strict de la liste noire de mots parasites (jamais créés seuls)
    if (parasiteWords.includes(standardName.toLowerCase().trim()) || standardName.length <= 1) {
      continue;
    }

    const category = detectGroceryCategory(standardName);

    items.push({
      name: standardName,
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

export const findMatchingGroceryItem = (searchText: string, list: GroceryItem[]): GroceryItem | null => {
  const cleanSearch = searchText.toLowerCase().trim()
    .replace(/^(le|la|les|l'|l’|du|de\s+la|des|un|une|de|d'|d’)\s+/i, '')
    .trim();

  if (!cleanSearch) return null;

  // Obtenir le nom standardisé du dictionnaire s'il existe
  const prodInfo = getProductInfo(cleanSearch);
  const searchStandardName = prodInfo ? prodInfo.name.toLowerCase() : cleanSearch;

  // 1. Recherche exacte sur le nom propre de la liste
  let matched = list.find(item => item.name.toLowerCase() === cleanSearch);
  if (matched) return matched;

  // 2. Recherche exacte sur le nom standardisé
  matched = list.find(item => item.name.toLowerCase() === searchStandardName);
  if (matched) return matched;

  // 3. Recherche de correspondance partielle (contient)
  matched = list.find(item => {
    const itemNameLower = item.name.toLowerCase();
    return itemNameLower.includes(cleanSearch) || cleanSearch.includes(itemNameLower);
  });
  if (matched) return matched;

  // 4. Recherche via les mots-clés du dictionnaire
  if (prodInfo) {
    matched = list.find(item => {
      const itemProdInfo = getProductInfo(item.name);
      return itemProdInfo && itemProdInfo.name === prodInfo.name;
    });
    if (matched) return matched;
  }

  // 5. Recherche par sous-mot tolérante
  matched = list.find(item => {
    const nameLower = item.name.toLowerCase();
    const searchWords = cleanSearch.split(/\s+/).filter(w => w.length > 2);
    return searchWords.some(w => nameLower.includes(w));
  });

  return matched || null;
};

export interface VoiceGroceryActionResult {
  action: 'check' | 'uncheck' | 'out_of_stock' | 'delete' | 'replace' | 'update_qty' | 'summary_remaining' | 'summary_bought' | 'count_remaining';
  items: { item: GroceryItem; details?: { replaceWith?: string; newQty?: string } }[];
}

const splitSegmentsAndFind = (text: string, list: GroceryItem[]): GroceryItem[] => {
  const segments = text.split(/,|\bet\b|\bplus\b|\bpuis\b/gi);
  const result: GroceryItem[] = [];
  for (const seg of segments) {
    const cleaned = seg.trim();
    if (!cleaned) continue;
    const item = findMatchingGroceryItem(cleaned, list);
    if (item && !result.some(r => r.id === item.id)) {
      result.push(item);
    }
  }
  return result;
};

export const parseGroceryAction = (prompt: string, list: GroceryItem[]): VoiceGroceryActionResult | null => {
  const lower = prompt.toLowerCase().trim();

  // Commandes vocales de résumés/comptages
  if (lower === 'que reste-t-il' || lower === 'que reste t il' || lower.includes('reste-t-il') || lower.includes('reste t il') || lower.includes('qu\'est-ce qu\'il reste') || lower.includes('qu\'est ce qu\'il reste')) {
    if (lower.includes('combien')) {
      return { action: 'count_remaining', items: [] };
    }
    return { action: 'summary_remaining', items: [] };
  }
  if (lower.includes('combien reste') && (lower.includes('article') || lower.includes('produit'))) {
    return { action: 'count_remaining', items: [] };
  }
  if (lower.includes('qu\'ai-je déjà acheté') || lower.includes('qu\'ai je deja achete') || lower.includes('déjà acheté') || lower.includes('deja achete') || lower.includes('ce que j\'ai acheté') || lower.includes('ce que j\'ai achete')) {
    return { action: 'summary_bought', items: [] };
  }

  // Remplacer : "remplace [produit1] par [produit2]" ou "substitue [produit1] par [produit2]"
  const replaceMatch = lower.match(/(?:remplace|substitue)\s+(.+?)\s+par\s+(.+)/i);
  if (replaceMatch) {
    const item1 = findMatchingGroceryItem(replaceMatch[1], list);
    if (item1) {
      return {
        action: 'replace',
        items: [{ item: item1, details: { replaceWith: replaceMatch[2].trim() } }]
      };
    }
  }

  // Modifier quantité : "passe [produit] à [quantité]" ou "mets [produit] à [quantité]"
  const qtyMatch1 = lower.match(/(?:passe|mets)\s+(.+?)\s+à\s+(.+)/i);
  if (qtyMatch1) {
    const item = findMatchingGroceryItem(qtyMatch1[1], list);
    if (item) {
      return {
        action: 'update_qty',
        items: [{ item, details: { newQty: qtyMatch1[2].trim() } }]
      };
    }
  }
  // "finalement [quantité] [produit]"
  if (lower.startsWith('finalement ')) {
    const rawText = lower.slice('finalement '.length).trim();
    const numRegex = /^(un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|dix-sept|dix-huit|dix-neuf|vingt|\d+)\s*(?:bouteilles?|kilos?|kg|grammes?|g|packs?|litres?|l|boîtes?|paquets?|pots?|canettes?)?\s*(?:de|du|des|d'|d’)?\s*(.+)/i;
    const match = rawText.match(numRegex);
    if (match) {
      const item = findMatchingGroceryItem(match[2], list);
      if (item) {
        const qtyStr = rawText.slice(0, rawText.length - match[2].length).trim();
        return {
          action: 'update_qty',
          items: [{ item, details: { newQty: qtyStr } }]
        };
      }
    }
  }

  // Décocher : décoche, remets, retire de mon panier, finalement non, je ne l'ai pas pris
  const uncheckTriggers = [
    'décoche le', 'décoche la', 'décoche les', 'décoche l\'', 'décoche',
    'decoche le', 'decoche la', 'decoche les', 'decoche l\'', 'decoche',
    'remets le', 'remets la', 'remets les', 'remets l\'', 'remets',
    'remet le', 'remet la', 'remet les', 'remet l\'', 'remet',
    'retire de mon panier le', 'retire de mon panier la', 'retire de mon panier les', 'retire de mon panier l\'', 'retire de mon panier',
    'finalement non pour les', 'finalement non pour le', 'finalement non pour la', 'finalement non pour l\'', 'finalement non pour', 'finalement non',
    'je ne l\'ai pas pris pour les', 'je ne l\'ai pas pris pour le', 'je ne l\'ai pas pris pour la', 'je ne l\'ai pas pris pour l\'', 'je ne l\'ai pas pris pour', 'je ne l\'ai pas pris', 'je ne l\'ai pas prise'
  ];
  for (const trig of uncheckTriggers) {
    if (lower.startsWith(trig + ' ')) {
      const remainder = lower.slice(trig.length + 1).trim();
      const itemsToUncheck = splitSegmentsAndFind(remainder, list);
      if (itemsToUncheck.length > 0) {
        return { action: 'uncheck', items: itemsToUncheck.map(item => ({ item })) };
      }
    }
  }

  // Marquer introuvable : je n'ai pas trouvé, introuvable, absent, rupture
  const outOfStockTriggers = [
    'je n\'ai pas trouvé les', 'je n\'ai pas trouvé le', 'je n\'ai pas trouvé la', 'je n\'ai pas trouvé l\'', 'je n\'ai pas trouvé',
    'je n\'ai pas trouve les', 'je n\'ai pas trouve le', 'je n\'ai pas trouve la', 'je n\'ai pas trouve l\'', 'je n\'ai pas trouve',
    'je n\'ai pas trouvé de', 'je n\'ai pas trouvé d\'', 'je n\'ai pas trouve de', 'je n\'ai pas trouve d\'',
    'rupture de', 'rupture de les', 'rupture de le', 'rupture de la', 'rupture de l\'', 'rupture',
    'absent les', 'absent le', 'absent la', 'absent l\'', 'absent',
    'absents les', 'absents le', 'absents la', 'absents l\'', 'absents'
  ];
  for (const trig of outOfStockTriggers) {
    if (lower.startsWith(trig + ' ')) {
      const remainder = lower.slice(trig.length + 1).trim();
      const itemsOutOfStock = splitSegmentsAndFind(remainder, list);
      if (itemsOutOfStock.length > 0) {
        return { action: 'out_of_stock', items: itemsOutOfStock.map(item => ({ item })) };
      }
    }
  }
  const suffixOutOfStock = lower.match(/(.+?)\s+(?:est introuvable|sont introuvables|est absent|sont absents|en rupture)$/i);
  if (suffixOutOfStock) {
    const itemsOutOfStock = splitSegmentsAndFind(suffixOutOfStock[1], list);
    if (itemsOutOfStock.length > 0) {
      return { action: 'out_of_stock', items: itemsOutOfStock.map(item => ({ item })) };
    }
  }

  // Supprimer : supprime, retire, enlève, enleve
  const deleteTriggers = [
    'supprime les', 'supprime le', 'supprime la', 'supprime l\'', 'supprime',
    'retire les', 'retire le', 'retire la', 'retire l\'', 'retire',
    'enlève les', 'enlève le', 'enlève la', 'enlève l\'', 'enlève',
    'enleve les', 'enleve le', 'enleve la', 'enleve l\'', 'enleve'
  ];
  for (const trig of deleteTriggers) {
    if (lower.startsWith(trig + ' ')) {
      const remainder = lower.slice(trig.length + 1).trim();
      const itemsToDelete = splitSegmentsAndFind(remainder, list);
      if (itemsToDelete.length > 0) {
        return { action: 'delete', items: itemsToDelete.map(item => ({ item })) };
      }
    }
  }

  // Cocher : j'ai pris, j'ai acheté, j'ai trouvé, coche, valide, récupéré, pris
  const checkTriggers = [
    'j\'ai pris les', 'j\'ai pris le', 'j\'ai pris la', 'j\'ai pris l\'', 'j\'ai pris',
    'j\'ai acheté les', 'j\'ai acheté le', 'j\'ai acheté la', 'j\'ai acheté l\'', 'j\'ai acheté',
    'j\'ai achete les', 'j\'ai achete le', 'j\'ai achete la', 'j\'ai achete l\'', 'j\'ai achete',
    'j\'ai trouvé les', 'j\'ai trouvé le', 'j\'ai trouvé la', 'j\'ai trouvé l\'', 'j\'ai trouvé',
    'j\'ai trouve les', 'j\'ai trouve le', 'j\'ai trouve la', 'j\'ai trouve l\'', 'j\'ai trouve',
    'coche les', 'coche le', 'coche la', 'coche l\'', 'coche',
    'valide les', 'valide le', 'valide la', 'valide l\'', 'valide',
    'récupéré les', 'récupéré le', 'récupéré la', 'récupéré l\'', 'récupéré',
    'recupere les', 'recupere le', 'recupere la', 'recupere l\'', 'recupere',
    'pris les', 'pris le', 'pris la', 'pris l\'', 'pris',
    'acheté les', 'acheté le', 'acheté la', 'acheté l\'', 'acheté',
    'achete les', 'achete le', 'achete la', 'achete l\'', 'achete',
    'trouvé les', 'trouvé le', 'trouvé la', 'trouvé l\'', 'trouvé',
    'trouve les', 'trouve le', 'trouve la', 'trouve l\'', 'trouve'
  ];
  for (const trig of checkTriggers) {
    if (lower.startsWith(trig + ' ')) {
      const remainder = lower.slice(trig.length + 1).trim();
      const itemsToCheck = splitSegmentsAndFind(remainder, list);
      if (itemsToCheck.length > 0) {
        return { action: 'check', items: itemsToCheck.map(item => ({ item })) };
      }
    }
  }
  const suffixCheck = lower.match(/(.+?)\s+(?:pris|recupere|récupéré|achete|acheté|trouve|trouvé|coche|coché)$/i);
  if (suffixCheck) {
    const itemsToCheck = splitSegmentsAndFind(suffixCheck[1], list);
    if (itemsToCheck.length > 0) {
      return { action: 'check', items: itemsToCheck.map(item => ({ item })) };
    }
  }

  return null;
};
