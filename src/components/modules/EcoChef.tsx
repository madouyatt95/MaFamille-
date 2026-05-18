import React, { useState } from 'react';
import { 
  Sparkles, 
  Check, 
  ShoppingCart,
  ChefHat
} from 'lucide-react';

interface EcoChefProps {
  onAddGroceryItem: (name: string, category: string, qty: string) => void;
  formatMoney: (amount: number) => string;
}

export const EcoChef: React.FC<EcoChefProps> = ({ onAddGroceryItem }) => {
  const [fridgeIngredients, setFridgeIngredients] = useState([
    { id: '1', name: 'Poulet rôti (Reste)', checked: true, type: 'meat' },
    { id: '2', name: 'Pâtes cuites', checked: true, type: 'carbs' },
    { id: '3', name: 'Ratatouille de la veille', checked: false, type: 'veggies' },
    { id: '4', name: 'Tomates fatiguées', checked: true, type: 'veggies' },
    { id: '5', name: 'Crème fraîche', checked: true, type: 'dairy' },
    { id: '6', name: 'Demi-oignon', checked: false, type: 'veggies' },
    { id: '7', name: 'Pain rassis', checked: false, type: 'bakery' },
  ]);

  const [generating, setGenerating] = useState(false);
  const [recipes, setRecipes] = useState<any[]>([]);

  const handleToggleIngredient = (id: string) => {
    setFridgeIngredients(prev =>
      prev.map(ing => ing.id === id ? { ...ing, checked: !ing.checked } : ing)
    );
  };

  const generateRecipes = () => {
    setGenerating(true);
    setTimeout(() => {
      const activeIn = fridgeIngredients.filter(i => i.checked).map(i => i.name.toLowerCase());
      
      const allSimulatedRecipes = [
        {
          id: 'rec-1',
          title: 'Gratin Royal aux Restes de Poulet & Pâtes',
          desc: 'Une recette réconfortante et crémeuse pour liquider vos restes en 20 minutes.',
          uses: ['Poulet rôti (Reste)', 'Pâtes cuites', 'Crème fraîche'],
          missing: ['Fromage râpé'],
          time: '20 min',
          difficulty: 'Facile',
          rating: 'Papa ⭐️5, Amadou ⭐️4.5'
        },
        {
          id: 'rec-2',
          title: 'Poêlée Anti-Gaspi Tomates & Poulet',
          desc: 'Faites caraméliser le poulet et les tomates douces avec un filet d\'huile d\'olive.',
          uses: ['Poulet rôti (Reste)', 'Tomates fatiguées'],
          missing: ['Ail', 'Herbes de Provence'],
          time: '15 min',
          difficulty: 'Très Facile',
          rating: 'Maman ⭐️5, Awa ⭐️4'
        },
        {
          id: 'rec-3',
          title: 'Pudding Salé au Pain Rassis & Crème',
          desc: 'Le secret des grands-mères pour ne jamais jeter de pain dur.',
          uses: ['Pain rassis', 'Crème fraîche'],
          missing: ['Œufs', 'Lardons'],
          time: '35 min',
          difficulty: 'Moyen',
          rating: 'Famille ⭐️4.2'
        }
      ];

      // Filter recipes based on ingredients selected
      const filtered = allSimulatedRecipes.filter(r => 
        r.uses.some(u => activeIn.some(act => u.toLowerCase().includes(act.substring(0, 5))))
      );

      setRecipes(filtered.length > 0 ? filtered : allSimulatedRecipes);
      setGenerating(false);
    }, 1000);
  };

  const handleAddMissing = (ingredients: string[]) => {
    ingredients.forEach(ing => {
      onAddGroceryItem(ing, 'Épicerie', '1');
    });
    alert(`${ingredients.join(', ')} ajouté(s) à la liste de courses ! 🛒`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="p-3 rounded-2xl bg-[#00D26A]/10 border border-[#00D26A]/20 text-[#00D26A]">
          <ChefHat className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-white">L'Éco-Chef IA Anti-Gaspi</h2>
          <p className="text-xs text-white/50">Cuisinez vos restes et planifiez vos courses intelligemment</p>
        </div>
      </div>

      {/* Fridge selector */}
      <div className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4">
        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Dans mon frigo & mes placards :</span>
        
        <div className="flex flex-wrap gap-2">
          {fridgeIngredients.map(ing => (
            <button
              key={ing.id}
              onClick={() => handleToggleIngredient(ing.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center space-x-2 ${
                ing.checked 
                  ? 'bg-[#00D26A]/15 border-[#00D26A] text-[#00D26A] shadow-[0_0_10px_rgba(0,210,106,0.15)]' 
                  : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/8'
              }`}
            >
              {ing.checked && <Check className="w-3.5 h-3.5" />}
              <span>{ing.name}</span>
            </button>
          ))}
        </div>

        <button
          onClick={generateRecipes}
          disabled={generating}
          className="w-full py-3.5 rounded-[18px] bg-gradient-to-r from-[#00D26A] to-[#6C5CFF] text-white font-semibold text-xs shadow-md cursor-pointer transition-all hover:opacity-95 flex items-center justify-center space-x-2"
        >
          <Sparkles className="w-4 h-4 animate-spin-slow" />
          <span>{generating ? 'Recherche d\'idées de génie...' : 'Générer des Recettes Anti-Gaspi'}</span>
        </button>
      </div>

      {/* Suggested Recipes */}
      {recipes.length > 0 && (
        <div className="space-y-4">
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Idées recettes suggérées :</span>
          
          <div className="space-y-3">
            {recipes.map(recipe => (
              <div key={recipe.id} className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#00D26A]/5 rounded-full blur-2xl"></div>
                
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="text-sm font-extrabold text-white">{recipe.title}</h3>
                    <span className="text-[9px] font-extrabold text-[#00D26A] bg-[#00D26A]/10 px-2 py-0.5 rounded-md border border-[#00D26A]/20">
                      {recipe.time}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/50 mt-1 leading-normal">{recipe.desc}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[10px]">
                  <div>
                    <span className="text-white/30 font-bold block uppercase tracking-wider">Restes utilisés :</span>
                    <div className="space-y-0.5 mt-1">
                      {recipe.uses.map((u: string, i: number) => (
                        <span key={i} className="text-[#00D26A] font-medium block">✓ {u}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-white/30 font-bold block uppercase tracking-wider">À acheter :</span>
                    <div className="space-y-0.5 mt-1">
                      {recipe.missing.map((m: string, i: number) => (
                        <span key={i} className="text-[#FF4D6D] font-medium block">✗ {m}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <span className="text-[9px] font-bold text-white/40 font-sans">
                    Avis : {recipe.rating}
                  </span>
                  
                  {recipe.missing.length > 0 && (
                    <button
                      onClick={() => handleAddMissing(recipe.missing)}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-[#6C5CFF] hover:text-white border border-white/10 text-white/80 font-bold text-[9px] transition-all cursor-pointer flex items-center space-x-1.5"
                    >
                      <ShoppingCart className="w-3 h-3" />
                      <span>Acheter les manquants</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
