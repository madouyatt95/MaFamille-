import type { SafeGroceryItem } from './safeGroceryEntities.ts';

export function describeGroceryChanges(before: SafeGroceryItem[], after: SafeGroceryItem[]): string[] {
  const changes: string[] = [];
  for (const item of after) {
    const previous = before.find(value => value.name === item.name);
    if (!previous) changes.push(`Ajouter ${item.quantity} de ${item.name}`);
    else {
      if (Boolean(previous.completed) !== Boolean(item.completed)) changes.push(`${item.completed ? 'Cocher comme acheté' : 'Remettre à acheter'} : ${item.name}`);
      if (JSON.stringify(previous.amount) !== JSON.stringify(item.amount)) changes.push(`${item.name} : passer de ${previous.quantity} à ${item.quantity}`);
    }
  }
  for (const item of before) if (!after.some(value => value.name === item.name)) changes.push(`Retirer ${item.name}`);
  return changes;
}
