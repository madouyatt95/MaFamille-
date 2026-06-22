import type { GroceryItem } from '../../types';
import { formatGroceryQty, getGroceryItemEmoji } from '../../utils/groceryDisplay';

type Props = {
  groceries: GroceryItem[];
  onOpenList: () => void;
};

export function GroceryRemainingPopup({ groceries, onOpenList }: Props) {
  const remaining = groceries.filter(item => !item.checked);

  return (
    <div onClick={onOpenList} className="fixed inset-0 z-[110] flex items-center justify-center bg-[#07111F]/90 p-4 backdrop-blur-md animate-fade-in">
      <div onClick={event => event.stopPropagation()} className="glass-panel relative flex max-h-[85vh] w-full max-w-md flex-col rounded-[40px] border border-white/15 p-6 shadow-[0_20px_50px_rgba(255,77,109,0.25)] sm:p-8">
        <button onClick={onOpenList} className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-bold text-white/60 transition-all hover:bg-white/10 hover:text-white">✕</button>
        <div className="space-y-2 border-b border-white/5 pb-4 text-center">
          <span className="rounded-full bg-[#FF4D6D]/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-[#FF4D6D]">Courses</span>
          <h2 className="text-xl font-extrabold text-white">Articles restants</h2>
          <p className="text-xs font-bold uppercase tracking-wider text-white/50">{remaining.length} articles à acheter</p>
        </div>
        <div className="no-scrollbar min-h-[150px] flex-1 space-y-2 overflow-y-auto py-4 pr-1">
          {remaining.length === 0 ? <div className="py-8 text-center text-xs italic text-white/40">🛒 Aucun article restant à acheter !</div> : remaining.map(item => (
            <div key={item.id} className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3 transition hover:bg-white/8">
              <div className="flex items-center gap-3"><span className="text-xl">{getGroceryItemEmoji(item.name)}</span><span className="text-xs font-bold text-white">{item.name}</span></div>
              <span className="rounded-lg border border-white/8 bg-white/5 px-2.5 py-1 text-[10px] font-extrabold text-white/40">{formatGroceryQty(item.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-white/5 pt-4"><button onClick={onOpenList} className="w-full rounded-2xl bg-gradient-to-r from-[#FF4D6D] to-[#FFB020] py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg">Ouvrir la liste</button></div>
      </div>
    </div>
  );
}
