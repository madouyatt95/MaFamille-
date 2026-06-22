/* eslint-disable @typescript-eslint/no-explicit-any */
import { getGroceryItemEmoji } from '../../utils/groceryDisplay';

type Props = {
  items: any[];
  editing: boolean;
  onItemsChange: (items: any[]) => void;
  onEditingChange: (editing: boolean) => void;
  onValidate: (items: any[], edited: boolean) => void;
};

const categories = ['Fruits & Légumes', 'Produits Frais', 'Boulangerie', 'Boucherie', 'Épicerie', 'Boissons', 'Surgelés', 'Hygiène', 'Maison'];

export function PendingGroceryPanel({ items, editing, onItemsChange, onEditingChange, onValidate }: Props) {
  if (!editing) {
    return (
      <div className="space-y-4 rounded-[20px] border border-white/10 bg-white/5 p-4 text-left text-xs font-semibold text-white animate-fade-in">
        <div className="border-b border-white/5 pb-2 font-bold text-white/60">🛒 Ajouté à la liste de courses :</div>
        <div className="max-h-40 space-y-3 overflow-y-auto pr-1">
          {items.map((item, index) => <div key={`${item.name}-${index}`} className="space-y-1 rounded-xl border border-white/5 bg-white/5 p-2.5">
            <div className="flex items-center gap-1.5 text-sm font-extrabold text-white"><span>{getGroceryItemEmoji(item.name)}</span><span>{item.name}</span></div>
            <div className="flex justify-between text-[10px] text-white/60"><span>Catégorie : {item.category}</span><span>Quantité : {item.quantity}</span></div>
          </div>)}
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={() => onValidate(items, false)} className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 py-2 text-center text-[10px] font-extrabold uppercase tracking-wider text-black transition-all">Valider</button>
          <button onClick={() => onEditingChange(true)} className="rounded-xl bg-white/10 px-4 py-2 text-[10px] font-extrabold uppercase tracking-wider text-white">Modifier</button>
        </div>
      </div>
    );
  }

  const updateItem = (index: number, updates: Record<string, string>) => {
    const next = [...items];
    next[index] = { ...next[index], ...updates };
    onItemsChange(next);
  };

  return (
    <div className="space-y-4 rounded-[20px] border border-white/10 bg-white/5 p-4 text-left text-xs text-white animate-fade-in">
      <div className="border-b border-white/5 pb-2 font-bold text-white/60">✏️ Modifier les articles :</div>
      <div className="max-h-52 space-y-4 overflow-y-auto pr-1">
        {items.map((item, index) => <div key={`${item.name}-${index}`} className="space-y-2 rounded-xl border border-white/5 bg-white/5 p-3">
          <div><label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-white/40">Nom du produit</label><input type="text" value={item.name} onChange={event => updateItem(index, { name: event.target.value })} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none focus:border-[#6C5CFF]" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-white/40">Catégorie</label><select value={item.category} onChange={event => updateItem(index, { category: event.target.value })} className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white outline-none focus:border-[#6C5CFF]">{categories.map(category => <option key={category} value={category} className="bg-[#07111F]">{category}</option>)}</select></div>
            <div><label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-white/40">Quantité</label><input type="text" value={item.quantity} onChange={event => updateItem(index, { quantity: event.target.value })} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none focus:border-[#6C5CFF]" /></div>
          </div>
        </div>)}
      </div>
      <div className="flex gap-2"><button onClick={() => onValidate(items, true)} className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 py-2 text-[10px] font-extrabold uppercase tracking-wider text-black">Enregistrer et valider</button><button onClick={() => onEditingChange(false)} className="rounded-xl bg-white/10 px-4 py-2 text-[10px] font-extrabold uppercase tracking-wider text-white">Retour</button></div>
    </div>
  );
}
