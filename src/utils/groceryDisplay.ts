export const getGroceryItemEmoji = (itemName: string): string => {
  const item = itemName.toLowerCase();
  if (/tomate/.test(item)) return '🍅';
  if (/banane/.test(item)) return '🍌';
  if (/pomme/.test(item)) return '🍎';
  if (/orange|clémentine|mandarine/.test(item)) return '🍊';
  if (/carotte/.test(item)) return '🥕';
  if (/salade|épinard|legume|légume/.test(item)) return '🥬';
  if (/lait|yaourt/.test(item)) return '🥛';
  if (/fromage/.test(item)) return '🧀';
  if (/pain|baguette|croissant/.test(item)) return '🥖';
  if (/riz/.test(item)) return '🍚';
  if (/pâte|pate/.test(item)) return '🍝';
  if (/œuf|oeuf/.test(item)) return '🥚';
  if (/poulet|viande/.test(item)) return '🍗';
  if (/poisson|saumon|thon/.test(item)) return '🐟';
  if (/eau/.test(item)) return '💧';
  if (/coca|soda|jus/.test(item)) return '🥤';
  if (/pizza/.test(item)) return '🍕';
  if (/glace/.test(item)) return '🍦';
  if (/doliprane|paracétamol|ibuprofène|vitamine/.test(item)) return '💊';
  if (/croquette|pâtée/.test(item)) return '🐱';
  if (/bébé|bebe|couche/.test(item)) return '👶';
  if (/lessive|savon|vaisselle/.test(item)) return '🧼';
  return '🛒';
};

export const formatGroceryQty = (quantity: string): string => {
  if (!quantity) return '';
  return quantity.endsWith(' pièces') ? quantity.replace(' pièces', '').trim() : quantity;
};
