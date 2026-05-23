import React, { useState } from 'react';
import { 
  Sparkles, 
  Check, 
  ShoppingCart,
  ChefHat,
  RefreshCw,
  Clock,
  Utensils
} from 'lucide-react';
import { aiQuotaService } from '../../services/aiQuotaService';

interface EcoChefProps {
  onAddGroceryItem: (name: string, category: string, qty: string) => void;
  formatMoney: (amount: number) => string;
  isPremium?: boolean;
  onTriggerPaywall?: () => void;
}

export const EcoChef: React.FC<EcoChefProps> = ({ onAddGroceryItem, isPremium = false, onTriggerPaywall }) => {
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
  const [customIngredient, setCustomIngredient] = useState('');

  const [recipeImages, setRecipeImages] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>({});

  const handleToggleIngredient = (id: string) => {
    setFridgeIngredients(prev =>
      prev.map(ing => ing.id === id ? { ...ing, checked: !ing.checked } : ing)
    );
  };

  const handleAddCustomIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customIngredient.trim()) return;

    const newItem = {
      id: `custom-${Date.now()}`,
      name: customIngredient.trim(),
      checked: true,
      type: 'custom'
    };

    setFridgeIngredients(prev => [...prev, newItem]);
    setCustomIngredient('');
  };

  const generateRecipes = async () => {
    const activeInFull = fridgeIngredients.filter(i => i.checked).map(i => i.name);
    if (activeInFull.length === 0) {
      alert("Veuillez sélectionner au moins un ingrédient dans votre frigo pour que l'Éco-Chef IA puisse inventer des recettes !");
      return;
    }

    // 1. Contrôle d'accès Premium obligatoire
    if (!aiQuotaService.checkAIPremiumAccess(isPremium, onTriggerPaywall)) {
      return;
    }

    setGenerating(true);
    setRecipes([]);

    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    // Consomme le quota si Premium
    const useRealAI = !!geminiKey && aiQuotaService.consumeAIQuota(isPremium);

    if (useRealAI) {
      try {
        const prompt = `Tu es l'Éco-Chef IA de MaFamille+, un cuisinier virtuose qui invente des recettes de cuisine merveilleuses pour éviter le gaspillage alimentaire.
Voici les ingrédients disponibles dans mon réfrigérateur : ${activeInFull.join(', ')}.
Génère EXACTEMENT 3 idées de recettes originales sous format JSON uniquement (sans aucun texte explicatif avant ou après, pas de balise markdown, juste un tableau JSON brut et valide).
Chaque recette doit être un objet JSON avec les propriétés suivantes rédigées en français :
- id (string unique ex: 'rec-gem-${Date.now()}-1')
- title (titre court, moderne et appétissant en français)
- desc (description alléchante et synthétique de la recette en français)
- uses (tableau de strings contenant uniquement les ingrédients de la liste ci-dessus qui sont utilisés)
- missing (tableau de strings d'ingrédients manquants réalistes à acheter pour compléter le plat)
- time (ex: '15 min')
- difficulty (ex: 'Très Facile', 'Facile' ou 'Moyen')
- rating (avis fictif fun de la famille ex: 'Papa ⭐️5, Amadou ⭐️4.8')
- promptKeywords (mots-clés très descriptifs en anglais séparés par des virgules pour générer la photo culinaire ex: 'creamy chicken soup with warm bread, hyper detailed food photography, Pixar style 3d')`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }]
          })
        });

        if (!response.ok) {
          throw new Error('Gemini API request failed');
        }

        const data = await response.json();
        let textResult = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        // Nettoyer d'éventuels marqueurs markdown retournés par le modèle
        textResult = textResult.replace(/```json/g, '').replace(/```/g, '').trim();

        const parsedRecipes = JSON.parse(textResult);
        if (Array.isArray(parsedRecipes) && parsedRecipes.length > 0) {
          const remainingCalls = aiQuotaService.getRemainingCalls(isPremium);
          const dailyLimit = aiQuotaService.getDailyLimit();
          
          // Ajouter une indication discrète sur le quota dans les descriptions
          const recipesWithQuotaInfo = parsedRecipes.map((rec, index) => {
            if (index === 0) {
              return {
                ...rec,
                desc: `${rec.desc} ✨ (Généré par Gemini Flash • Quota réel restant : ${remainingCalls}/${dailyLimit} aujourd'hui)`
              };
            }
            return rec;
          });

          setRecipes(recipesWithQuotaInfo);
          setGenerating(false);
          
          // Charger les images Stable Diffusion
          recipesWithQuotaInfo.forEach(rec => {
            loadRecipeImage(rec.id, rec.promptKeywords);
          });
          return;
        } else {
          throw new Error("Le format JSON reçu n'est pas un tableau valide.");
        }
      } catch (err) {
        console.warn("[EcoChef] Erreur de génération IA en direct, basculement sur la simulation locale :", err);
      }
    }

    // Version locale simulée en cas de quota épuisé ou clé absente
    setTimeout(() => {
      const ingNames = [...activeInFull];
      const remainingCalls = aiQuotaService.getRemainingCalls(isPremium);
      const isQuotaFallback = isPremium && remainingCalls === 0;

      const dynamicRecipes = [
        {
          id: 'rec-1',
          title: `Poêlée Express : ${ingNames.slice(0, 2).join(' & ')}`,
          desc: `Une cuisson rapide et savoureuse à la poêle pour sublimer vos restes de ${ingNames.join(', ').toLowerCase()} en quelques minutes.${isQuotaFallback ? ' ✨ (IA Locale simulée : votre quota quotidien d\'IA réelle est épuisé !)' : ' ✨ (IA Locale simulée : configurez VITE_GEMINI_API_KEY dans votre fichier .env.local)'}`,
          uses: activeInFull,
          missing: ['Huile d\'olive', 'Oignon blanc', 'Herbes de Provence'],
          time: '12 min',
          difficulty: 'Très Facile',
          rating: 'Maman ⭐️4.9, Awa ⭐️4.6',
          promptKeywords: `pan-seared gourmet meal with ${ingNames.slice(0, 2).join(' and ').toLowerCase()}, colorful steam, fresh herbs, delicious food photography, pixar style`
        },
        {
          id: 'rec-2',
          title: `Gratin Fondant : ${ingNames[0]} ${ingNames[1] ? '& ' + ingNames[1] : 'Maison'}`,
          desc: `Mélangez vos restes de ${ingNames.join(' et ').toLowerCase()} dans un plat, nappez de crème et saupoudrez de fromage avant de gratiner au four.`,
          uses: activeInFull,
          missing: ['Crème fraîche', 'Fromage râpé', 'Gousse d\'ail'],
          time: '22 min',
          difficulty: 'Facile',
          rating: 'Papa ⭐️5, Amadou ⭐️4.8',
          promptKeywords: `hot bubbling oven baked gratin casserole with ${ingNames.slice(0, 2).join(' and ').toLowerCase()}, melted cheese pull, warm studio lighting, Pixar movie style food`
        },
        {
          id: 'rec-3',
          title: `Bowl de l'Éco-Chef : ${[...ingNames].reverse().slice(0, 2).join(' & ')}`,
          desc: `Un assemblage sain, équilibré et coloré pour consommer vos restes de ${activeInFull.join(' et ').toLowerCase()} sans passer des heures en cuisine.`,
          uses: activeInFull,
          missing: ['Vinaigrette au citron', 'Graines de sésame', 'Jeunes pousses de salade'],
          time: '8 min',
          difficulty: 'Très Facile',
          rating: 'Famille ⭐️4.5',
          promptKeywords: `gourmet healthy salad bowl with ${ingNames.slice(0, 2).join(' and ').toLowerCase()}, aesthetic plating, chef presentation, Pixar style vibrant food 3d`
        }
      ];

      setRecipes(dynamicRecipes);
      setGenerating(false);

      dynamicRecipes.forEach(rec => {
        loadRecipeImage(rec.id, rec.promptKeywords);
      });
    }, 1200);
  };

  // Chargeur d'images IA avec Stable Diffusion + Fallback Unsplash en cas d'erreur
  const loadRecipeImage = (recipeId: string, keywords: string) => {
    setLoadingImages(prev => ({ ...prev, [recipeId]: true }));

    const seed = Math.floor(Math.random() * 1000000);
    const finalPrompt = encodeURIComponent(`high quality food photography, ${keywords}, hyper detailed, master chef rendering, volumetric lighting, vibrant food colors`);
    const generatedUrl = `https://image.pollinations.ai/prompt/${finalPrompt}?width=600&height=400&nologo=true&seed=${seed}`;

    const img = new Image();
    img.src = generatedUrl;

    img.onload = () => {
      setRecipeImages(prev => ({ ...prev, [recipeId]: generatedUrl }));
      setLoadingImages(prev => ({ ...prev, [recipeId]: false }));
    };

    img.onerror = () => {
      // Fallback en direct sur Unsplash
      const backupUrl = `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80&sig=${seed}`;
      setRecipeImages(prev => ({ ...prev, [recipeId]: backupUrl }));
      setLoadingImages(prev => ({ ...prev, [recipeId]: false }));
    };
  };

  const handleAddMissing = (ingredients: string[]) => {
    ingredients.forEach(ing => {
      onAddGroceryItem(ing, 'Épicerie', '1');
    });
    alert(`${ingredients.join(', ')} ajouté(s) à la liste de courses ! 🛒`);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="p-3 rounded-2xl bg-[#00D26A]/10 border border-[#00D26A]/20 text-[#00D26A]">
          <ChefHat className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-white">L'Éco-Chef IA Anti-Gaspi</h2>
          <p className="text-xs text-white/50">Cuisinez vos restes et visualisez de délicieuses recettes par IA</p>
        </div>
      </div>

      {/* Fridge selector */}
      <div className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Dans mon frigo & placards :</span>
          <span className="text-[9px] text-[#00D26A] font-bold font-sans">Sélecteur multi-choix</span>
        </div>
        
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

        {/* Custom Ingredient Adder */}
        <form onSubmit={handleAddCustomIngredient} className="flex gap-2 pt-2 border-t border-white/5">
          <input 
            type="text"
            placeholder="Autre ingrédient à vider ? (ex: brocolis, saumon...)"
            value={customIngredient}
            onChange={e => setCustomIngredient(e.target.value)}
            className="flex-1 bg-white/5 border border-white/8 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#00D26A]"
          />
          <button 
            type="submit"
            className="px-4 py-2 bg-[#00D26A] text-black text-xs font-black rounded-xl cursor-pointer hover:opacity-90 active:scale-95 transition-all"
          >
            Ajouter
          </button>
        </form>

        <button
          onClick={generateRecipes}
          disabled={generating}
          className="w-full py-4 rounded-[20px] bg-gradient-to-r from-[#00D26A] to-[#6C5CFF] text-white font-extrabold text-xs tracking-wider uppercase shadow-md shadow-[#00D26A]/10 cursor-pointer transition-all hover:brightness-105 active:scale-[0.99] flex items-center justify-center space-x-2"
        >
          {generating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Chuchotement des recettes aux marmites...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 animate-bounce" />
              <span>Générer mes Recettes Anti-Gaspi Visuelles</span>
            </>
          )}
        </button>
      </div>

      {/* Suggested Recipes */}
      {recipes.length > 0 && (
        <div className="space-y-4">
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Idées recettes magiques générées :</span>
          
          <div className="space-y-4">
            {recipes.map(recipe => (
              <div key={recipe.id} className="glass-panel border border-white/8 rounded-[28px] overflow-hidden flex flex-col justify-between shadow-lg relative group">
                
                {/* Real-time AI Generated Food Image */}
                <div className="relative w-full h-48 bg-black/40 border-b border-white/5 overflow-hidden flex items-center justify-center">
                  {loadingImages[recipe.id] ? (
                    <div className="absolute inset-0 bg-white/3 flex flex-col items-center justify-center space-y-2 animate-pulse">
                      <RefreshCw className="w-6 h-6 text-[#00D26A] animate-spin" />
                      <span className="text-[8.5px] font-black text-white/50 uppercase tracking-widest font-sans">
                        Stable Diffusion mijote le visuel...
                      </span>
                    </div>
                  ) : recipeImages[recipe.id] ? (
                    <img 
                      src={recipeImages[recipe.id]} 
                      alt={recipe.title} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Utensils className="w-8 h-8 text-white/20" />
                    </div>
                  )}

                  {/* Badges overlay */}
                  <span className="absolute top-3 left-3 px-2 py-0.5 rounded-lg bg-black/60 text-[8px] font-extrabold text-[#00D26A] border border-white/5 shadow-md uppercase tracking-wider flex items-center space-x-1">
                    <Clock className="w-2.5 h-2.5 text-[#00D26A] shrink-0" />
                    <span>{recipe.time}</span>
                  </span>

                  <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded-lg bg-gradient-to-tr from-[#00D26A] to-[#6C5CFF] text-[8px] font-extrabold text-white border border-white/5 shadow-md uppercase tracking-wider">
                    {recipe.difficulty}
                  </span>
                </div>

                {/* Content details */}
                <div className="p-5 space-y-4">
                  <div>
                    <h3 className="text-sm font-black text-white leading-snug">{recipe.title}</h3>
                    <p className="text-[11px] text-white/50 mt-1 leading-relaxed font-sans">{recipe.desc}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-[10px] bg-black/20 p-3 rounded-2xl border border-white/5">
                    <div>
                      <span className="text-white/30 font-bold block uppercase tracking-wider text-[8px]">Restes utilisés :</span>
                      <div className="space-y-0.5 mt-1">
                        {recipe.uses.map((u: string, i: number) => (
                          <span key={i} className="text-[#00D26A] font-semibold block">✓ {u}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-white/30 font-bold block uppercase tracking-wider text-[8px]">À acheter (Manquants) :</span>
                      <div className="space-y-0.5 mt-1">
                        {recipe.missing.length > 0 ? (
                          recipe.missing.map((m: string, i: number) => (
                            <span key={i} className="text-[#FF4D6D] font-semibold block">✗ {m}</span>
                          ))
                        ) : (
                          <span className="text-[#00D26A] font-semibold block">Rien ! 100% Restes 🎉</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Rating */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <span className="text-[9px] font-bold text-white/40 font-sans">
                      Avis : {recipe.rating}
                    </span>
                    
                    {recipe.missing.length > 0 && (
                      <button
                        onClick={() => handleAddMissing(recipe.missing)}
                        className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-[#00D26A] hover:text-black border border-white/10 text-white/80 font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-1.5"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>Acheter les manquants</span>
                      </button>
                    )}
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
