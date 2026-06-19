import React, { useEffect, useMemo, useState } from 'react';
import { 
  Sparkles, 
  Check, 
  ShoppingCart,
  ChefHat,
  RefreshCw,
  Clock,
  Utensils,
  Heart,
  CalendarPlus,
  WalletCards,
  Leaf,
  X,
  Plus,
  BookOpen,
  Save,
  Trash2
} from 'lucide-react';
import { aiQuotaService } from '../../services/aiQuotaService';
import { familyContentService, type CloudFamilyRecipe } from '../../services/familyContentService';

interface EcoChefProps {
  onAddGroceryItem: (name: string, category: string, qty: string) => void;
  formatMoney: (amount: number) => string;
  isPremium?: boolean;
  onTriggerPaywall?: () => void;
  activeFoyerId?: string;
  activeMemberName?: string;
}

interface Recipe {
  id: string;
  title: string;
  desc: string;
  uses: string[];
  missing: string[];
  time: string;
  difficulty: string;
  rating: string;
  promptKeywords: string;
  estimatedCost?: number;
  servings?: number;
  familyFit?: string;
  prepSteps?: string[];
}

type FamilyRecipe = Recipe & CloudFamilyRecipe;

const normalizeIngredient = (value: string) => value.trim().toLowerCase();

const estimateRecipeCost = (missing: string[]) => {
  if (missing.length === 0) return 0;
  return Math.max(2, Math.round(missing.length * 1.8 * 100) / 100);
};

const readFamilyRecipes = (): FamilyRecipe[] => {
  try {
    const cached = localStorage.getItem('mf_family_recipes');
    const parsed = cached ? JSON.parse(cached) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const EcoChef: React.FC<EcoChefProps> = ({ onAddGroceryItem, formatMoney, isPremium = false, onTriggerPaywall, activeFoyerId, activeMemberName = 'Famille' }) => {
  const [fridgeIngredients, setFridgeIngredients] = useState<Array<{ id: string; name: string; checked: boolean; type: string }>>([]);

  const [generating, setGenerating] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [customIngredient, setCustomIngredient] = useState('');
  const [fallbackMessage, setFallbackMessage] = useState('');

  const [recipeImages, setRecipeImages] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>({});
  const [favoriteRecipes, setFavoriteRecipes] = useState<Recipe[]>(() => {
    try {
      const cached = localStorage.getItem('mf_ecochef_favorites');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [weeklyIdeas, setWeeklyIdeas] = useState<Recipe[]>(() => {
    try {
      const cached = localStorage.getItem('mf_ecochef_weekly_ideas');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [familyRecipes, setFamilyRecipes] = useState<FamilyRecipe[]>(readFamilyRecipes);
  const [recipeNotice, setRecipeNotice] = useState('');

  const activeIngredients = useMemo(() => fridgeIngredients.filter(i => i.checked).map(i => i.name), [fridgeIngredients]);
  const uniqueIngredientCount = useMemo(() => new Set(fridgeIngredients.map(i => normalizeIngredient(i.name))).size, [fridgeIngredients]);
  const savedPotential = useMemo(() => Math.max(0, activeIngredients.length * 1.4), [activeIngredients.length]);
  const favoriteRecipeIds = useMemo(() => new Set(favoriteRecipes.map(r => r.id)), [favoriteRecipes]);
  const familyRecipeIds = useMemo(() => new Set(familyRecipes.map(r => r.id)), [familyRecipes]);

  useEffect(() => {
    if (!activeFoyerId) return;
    let cancelled = false;

    const syncFamilyRecipes = async () => {
      const localRecipes = readFamilyRecipes();
      const cloudRecipes = await familyContentService.fetchRecipes(activeFoyerId);
      if (cancelled) return;

      if (cloudRecipes.length > 0) {
        persistFamilyRecipes(cloudRecipes as FamilyRecipe[], false);
        return;
      }

      if (localRecipes.length > 0) {
        await familyContentService.migrateLocalRecipes(activeFoyerId, localRecipes);
        if (!cancelled) persistFamilyRecipes(localRecipes, false);
      }
    };

    void syncFamilyRecipes();
    return () => {
      cancelled = true;
    };
  }, [activeFoyerId]);

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

  const handleRemoveIngredient = (id: string) => {
    setFridgeIngredients(prev => prev.filter(ing => ing.id !== id));
  };

  const handleQuickAddIngredient = (name: string) => {
    const normalized = normalizeIngredient(name);
    if (fridgeIngredients.some(ing => normalizeIngredient(ing.name) === normalized)) return;
    setFridgeIngredients(prev => [...prev, { id: `quick-${Date.now()}-${normalized}`, name, checked: true, type: 'quick' }]);
  };

  const persistFavoriteRecipes = (next: Recipe[]) => {
    setFavoriteRecipes(next);
    localStorage.setItem('mf_ecochef_favorites', JSON.stringify(next.slice(0, 12)));
  };

  const handleToggleFavoriteRecipe = (recipe: Recipe) => {
    const exists = favoriteRecipeIds.has(recipe.id);
    const next = exists ? favoriteRecipes.filter(r => r.id !== recipe.id) : [recipe, ...favoriteRecipes].slice(0, 12);
    persistFavoriteRecipes(next);
  };

  const handleAddToWeek = (recipe: Recipe) => {
    const next = [recipe, ...weeklyIdeas.filter(r => r.id !== recipe.id)].slice(0, 7);
    setWeeklyIdeas(next);
    localStorage.setItem('mf_ecochef_weekly_ideas', JSON.stringify(next));
    setRecipeNotice(`"${recipe.title}" ajouté aux idées repas de la semaine.`);
  };

  const persistFamilyRecipes = (next: FamilyRecipe[], syncCloud = true) => {
    const limited = next.slice(0, 40);
    setFamilyRecipes(limited);
    localStorage.setItem('mf_family_recipes', JSON.stringify(limited));
    if (syncCloud && activeFoyerId) {
      void Promise.all(limited.map(recipe => familyContentService.upsertRecipe(activeFoyerId, recipe))).catch(console.warn);
    }
  };

  const handleSaveFamilyRecipe = (recipe: Recipe) => {
    const alreadySaved = familyRecipeIds.has(recipe.id);
    const familyRecipe: FamilyRecipe = {
      ...recipe,
      savedAt: new Date().toISOString(),
      authorName: activeMemberName || 'Famille',
      source: recipe.id.startsWith('rec-gem') ? 'ia' : recipe.id.startsWith('rec-') ? 'local' : 'family',
      tags: [
        recipe.time,
        recipe.difficulty,
        recipe.missing.length === 0 ? 'sans courses' : 'liste courses',
        recipe.familyFit || 'familial'
      ].filter(Boolean)
    };
    const next = alreadySaved
      ? familyRecipes.map(r => r.id === recipe.id ? familyRecipe : r)
      : [familyRecipe, ...familyRecipes];
    persistFamilyRecipes(next);
    setRecipeNotice(alreadySaved ? 'Recette familiale mise à jour.' : 'Recette ajoutée au carnet familial.');
  };

  const handleDeleteFamilyRecipe = (recipeId: string) => {
    persistFamilyRecipes(familyRecipes.filter(recipe => recipe.id !== recipeId));
    if (activeFoyerId) void familyContentService.deleteRecipe(activeFoyerId, recipeId).catch(console.warn);
    setRecipeNotice('Recette retirée du carnet familial.');
  };

  const enrichRecipe = (recipe: Recipe, index: number): Recipe => ({
    ...recipe,
    estimatedCost: recipe.estimatedCost ?? estimateRecipeCost(recipe.missing || []),
    servings: recipe.servings ?? 4,
    familyFit: recipe.familyFit ?? (index === 0 ? 'Idéal repas familial' : index === 1 ? 'Bon choix batch cooking' : 'Rapide pour soir pressé'),
    prepSteps: recipe.prepSteps?.length ? recipe.prepSteps : [
      'Préparer et couper les ingrédients disponibles.',
      'Cuire les éléments principaux avec un assaisonnement simple.',
      'Ajouter les ingrédients manquants si vous les avez, puis servir chaud.'
    ]
  });

  const generateRecipes = async () => {
    const activeInFull = fridgeIngredients.filter(i => i.checked).map(i => i.name);
    if (activeInFull.length === 0) {
      setRecipeNotice("Ajoutez au moins un ingrédient pour générer des recettes.");
      return;
    }

    // 1. Contrôle d'accès Premium obligatoire
    if (!aiQuotaService.checkAIPremiumAccess(isPremium, onTriggerPaywall)) {
      return;
    }

    setGenerating(true);
    setRecipes([]);
    setFallbackMessage('');
    let fallbackReason = '';

    // Tente d'utiliser l'IA réelle si le quota est disponible (soit via clé locale VITE_, soit via le proxy serveurless)
    const useRealAI = aiQuotaService.consumeAIQuota(isPremium);

    if (useRealAI) {
      try {
        const prompt = `Tu es l'Éco-Chef IA de MyFamily+, un cuisinier virtuose qui invente des recettes de cuisine merveilleuses pour éviter le gaspillage alimentaire.
Voici les ingrédients disponibles dans mon réfrigérateur : ${activeInFull.join(', ')}.
Génère EXACTEMENT 3 idées de recettes originales sous format JSON uniquement (sans aucun texte explicatif avant ou après, pas de balise markdown, juste un tableau JSON brut et valide).
Chaque recette doit être un objet JSON avec les propriétés suivantes rédigées en français :
- id (string unique ex: 'rec-gem-unique-1')
- title (titre court, moderne et appétissant en français)
- desc (description alléchante et synthétique de la recette en français)
- uses (tableau de strings contenant uniquement les ingrédients de la liste ci-dessus qui sont utilisés)
- missing (tableau de strings d'ingrédients manquants réalistes à acheter pour compléter le plat)
- time (ex: '15 min')
- difficulty (ex: 'Très Facile', 'Facile' ou 'Moyen')
                - rating (avis fictif fun et neutre de la famille ex: 'Famille ⭐️4.8')
- estimatedCost (nombre estimé en euros pour les ingrédients manquants)
- servings (nombre de portions, idéalement 4)
- familyFit (court conseil familial ex: 'Parfait pour un soir d'école')
- prepSteps (tableau de 3 étapes courtes et concrètes)
- promptKeywords (mots-clés très descriptifs en anglais séparés par des virgules pour générer la photo culinaire ex: 'creamy chicken soup with warm bread, hyper detailed food photography, Pixar style 3d')`;

        const geminiEndpoint = import.meta.env.DEV ? 'https://ma-famille-nu.vercel.app/api/gemini' : '/api/gemini';
        const headers = await aiQuotaService.getAIProxyHeaders();

        const response = await fetch(geminiEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.6
            }
          })
        });

        if (!response.ok) {
          throw await aiQuotaService.getAIResponseError(response, 'Gemini');
        }

        const data = await response.json();
        let textResult = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        // Nettoyer d'éventuels marqueurs markdown retournés par le modèle
        textResult = textResult.replace(/```json/g, '').replace(/```/g, '').trim();

        const parsedRecipes = JSON.parse(textResult);
        if (Array.isArray(parsedRecipes) && parsedRecipes.length > 0) {
          const { remaining: remainingCalls, limit: dailyLimit } = aiQuotaService.getQuotaFromResponse(response, isPremium);
          
          const recipesWithQuotaInfo = parsedRecipes.map((rec, index) => enrichRecipe({
            ...rec,
            rating: index === 0 ? `${rec.rating} • IA ${remainingCalls}/${dailyLimit}` : rec.rating
          }, index));

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
        fallbackReason = aiQuotaService.getFallbackLabel(err);
        setFallbackMessage(fallbackReason);
      }
    }

    // Version locale simulée en cas de quota épuisé ou clé absente
    setTimeout(() => {
      const ingNames = [...activeInFull];
      const localFallback = fallbackReason || aiQuotaService.getFallbackLabel();

      const dynamicRecipes = [
        {
          id: 'rec-1',
          title: `Poêlée Express : ${ingNames.slice(0, 2).join(' & ')}`,
          desc: `Une cuisson rapide et savoureuse à la poêle pour sublimer vos restes de ${ingNames.join(', ').toLowerCase()} en quelques minutes. ${localFallback}`,
          uses: activeInFull,
          missing: ['Huile d\'olive', 'Oignon blanc', 'Herbes de Provence'],
          time: '12 min',
          difficulty: 'Très Facile',
          rating: 'Famille ⭐️4.8',
          estimatedCost: 5.4,
          servings: 4,
          familyFit: 'Rapide et facile à adapter aux enfants',
          prepSteps: ['Émincer les ingrédients et l’oignon.', 'Saisir à feu vif avec huile d’olive.', 'Finir avec les herbes et servir avec pain ou riz.'],
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
          rating: 'Famille ⭐️4.9',
          estimatedCost: 5.4,
          servings: 4,
          familyFit: 'Pratique pour préparer un repas complet',
          prepSteps: ['Mélanger les restes dans un plat.', 'Ajouter crème, ail et fromage.', 'Gratiner au four jusqu’à obtenir une belle croûte.'],
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
          estimatedCost: 5.4,
          servings: 3,
          familyFit: 'Parfait pour déjeuner léger ou soir pressé',
          prepSteps: ['Couper les ingrédients en petits morceaux.', 'Assembler dans un bol avec la vinaigrette.', 'Parsemer de graines et servir frais.'],
          promptKeywords: `gourmet healthy salad bowl with ${ingNames.slice(0, 2).join(' and ').toLowerCase()}, aesthetic plating, chef presentation, Pixar style vibrant food 3d`
        }
      ].map((recipe, index) => enrichRecipe(recipe, index));

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
    setRecipeNotice(`${ingredients.join(', ')} ajouté(s) à la liste de courses.`);
  };

  const quickSuggestions = ['oeufs', 'riz cuit', 'pâtes', 'tomates', 'courgettes', 'poulet', 'fromage', 'yaourt', 'pommes', 'carottes'];
  const allMissingCount = recipes.reduce((total, recipe) => total + recipe.missing.length, 0);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="p-3 rounded-2xl bg-[#00D26A]/10 border border-[#00D26A]/20 text-[#00D26A]">
          <ChefHat className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-white">Éco-Chef anti-gaspi</h2>
          <p className="text-xs text-white/50">Transformez les restes en repas, courses et idées de semaine.</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-3">
          <Leaf className="w-4 h-4 text-[#00D26A] mb-2" />
          <p className="text-lg font-extrabold text-white">{activeIngredients.length}</p>
          <p className="text-[9px] text-white/40 font-bold uppercase tracking-wider">à utiliser</p>
        </div>
        <div className="rounded-2xl border border-[#FFB020]/20 bg-[#FFB020]/10 p-3">
          <WalletCards className="w-4 h-4 text-[#FFB020] mb-2" />
          <p className="text-lg font-extrabold text-white">{formatMoney(savedPotential)}</p>
          <p className="text-[9px] text-white/40 font-bold uppercase tracking-wider">potentiel</p>
        </div>
        <div className="rounded-2xl border border-[#6C5CFF]/20 bg-[#6C5CFF]/10 p-3">
          <CalendarPlus className="w-4 h-4 text-[#9D8CFF] mb-2" />
          <p className="text-lg font-extrabold text-white">{weeklyIdeas.length}</p>
          <p className="text-[9px] text-white/40 font-bold uppercase tracking-wider">idées semaine</p>
        </div>
      </div>

      {recipeNotice && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#00D26A]/20 bg-[#00D26A]/10 px-4 py-3">
          <p className="text-xs font-bold text-[#B8FFD8]">{recipeNotice}</p>
          <button type="button" onClick={() => setRecipeNotice('')} className="text-[10px] font-black text-white/45 hover:text-white">
            OK
          </button>
        </div>
      )}

      {fallbackMessage && (
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold leading-relaxed">
          Connexion IA indisponible ou quota atteint : l'Éco-Chef utilise une recette locale fiable pour continuer sans bloquer.
        </div>
      )}

      <div className="glass-panel border border-[#00D26A]/20 rounded-[28px] p-4 space-y-3 bg-[#00D26A]/5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-[#00D26A] uppercase tracking-widest flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              Carnet de recettes familiales
            </span>
            <p className="mt-1 text-[11px] text-white/45 font-semibold">
              Gardez les recettes validées par la famille, puis ajoutez-les à la semaine ou aux courses.
            </p>
          </div>
          <span className="shrink-0 rounded-2xl border border-white/8 bg-white/5 px-3 py-1.5 text-[10px] font-black text-white/55">
            {familyRecipes.length}/40
          </span>
        </div>

        {familyRecipes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {familyRecipes.slice(0, 4).map(recipe => (
              <div key={recipe.id} className="p-2.5 rounded-xl bg-white/[0.04] border border-white/7 space-y-2">
                <button type="button" onClick={() => setSelectedRecipe(recipe)} className="w-full text-left">
                  <p className="text-[11px] font-bold text-white truncate">{recipe.title}</p>
                  <p className="text-[9px] text-white/40">{recipe.time} • {recipe.servings || 4} portions • {recipe.authorName}</p>
                </button>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddToWeek(recipe)}
                    className="flex-1 py-1.5 rounded-lg bg-[#6C5CFF]/12 border border-[#6C5CFF]/20 text-[8px] font-black text-[#9D8CFF]"
                  >
                    Semaine
                  </button>
                  {recipe.missing.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleAddMissing(recipe.missing)}
                      className="flex-1 py-1.5 rounded-lg bg-[#00D26A]/12 border border-[#00D26A]/20 text-[8px] font-black text-[#00D26A]"
                    >
                      Courses
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteFamilyRecipe(recipe.id)}
                    className="p-1.5 rounded-lg bg-white/5 border border-white/8 text-white/35 hover:text-[#FF4D6D]"
                    aria-label="Supprimer la recette"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.03] p-4 text-center">
            <Save className="w-5 h-5 text-white/30 mx-auto mb-2" />
            <p className="text-xs font-bold text-white/55">Aucune recette familiale gardée.</p>
            <p className="mt-1 text-[10px] text-white/35">
              Générez une recette, puis utilisez le bouton “Carnet” ou “Garder en favori” dans le détail.
            </p>
          </div>
        )}
      </div>
      

      {/* Fridge selector */}
      <div className="glass-panel border border-white/8 rounded-[28px] p-5 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Dans mon frigo & placards :</span>
          <span className="text-[9px] text-[#00D26A] font-bold font-sans">{uniqueIngredientCount} ingrédient(s)</span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {quickSuggestions.map(name => (
            <button
              key={name}
              type="button"
              onClick={() => handleQuickAddIngredient(name)}
              className="shrink-0 px-3 py-1.5 rounded-full bg-white/5 border border-white/8 text-[10px] font-bold text-white/55 hover:text-white hover:bg-white/10 transition"
            >
              + {name}
            </button>
          ))}
        </div>
        
        <div className="flex flex-wrap gap-2">
          {fridgeIngredients.length > 0 ? (
            fridgeIngredients.map(ing => (
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
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveIngredient(ing.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleRemoveIngredient(ing.id);
                    }
                  }}
                  className="ml-1 rounded-full hover:bg-black/20 p-0.5"
                  aria-label={`Retirer ${ing.name}`}
                >
                  <X className="w-3 h-3" />
                </span>
              </button>
            ))
          ) : (
            <div className="w-full rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-center">
              <ChefHat className="w-6 h-6 text-white/25 mx-auto mb-2" />
              <p className="text-xs text-white/55 font-bold">Ajoutez les restes ou ingrédients disponibles dans votre cuisine.</p>
              <p className="text-[10px] text-white/35 mt-1">Vos recettes partiront uniquement des ingrédients ajoutés ici.</p>
            </div>
          )}
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
              <span>Préparation des recettes...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 animate-bounce" />
              <span>Générer mes recettes anti-gaspi</span>
            </>
          )}
        </button>
      </div>

      {(weeklyIdeas.length > 0 || favoriteRecipes.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {weeklyIdeas.length > 0 && (
            <div className="glass-panel border border-[#6C5CFF]/20 rounded-[24px] p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#9D8CFF] uppercase tracking-widest">Idées de la semaine</span>
                <button type="button" onClick={() => { setWeeklyIdeas([]); localStorage.removeItem('mf_ecochef_weekly_ideas'); }} className="text-[9px] text-white/35 hover:text-white">vider</button>
              </div>
              {weeklyIdeas.slice(0, 3).map(recipe => (
                <button key={recipe.id} type="button" onClick={() => setSelectedRecipe(recipe)} className="w-full text-left p-2 rounded-xl bg-white/[0.03] border border-white/5">
                  <p className="text-[11px] font-bold text-white truncate">{recipe.title}</p>
                  <p className="text-[9px] text-white/40">{recipe.time} • {recipe.servings || 4} portions</p>
                </button>
              ))}
            </div>
          )}
          {favoriteRecipes.length > 0 && (
            <div className="glass-panel border border-[#FF4D6D]/20 rounded-[24px] p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#FF8BA0] uppercase tracking-widest">Recettes gardées</span>
                <button type="button" onClick={() => { persistFavoriteRecipes([]); }} className="text-[9px] text-white/35 hover:text-white">vider</button>
              </div>
              {favoriteRecipes.slice(0, 3).map(recipe => (
                <button key={recipe.id} type="button" onClick={() => setSelectedRecipe(recipe)} className="w-full text-left p-2 rounded-xl bg-white/[0.03] border border-white/5">
                  <p className="text-[11px] font-bold text-white truncate">{recipe.title}</p>
                  <p className="text-[9px] text-white/40">{recipe.difficulty} • {formatMoney(recipe.estimatedCost || 0)}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Suggested Recipes */}
      {recipes.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Recettes proposées</span>
            <span className="text-[10px] text-white/35">{allMissingCount} ingrédient(s) manquant(s)</span>
          </div>
          
          <div className="space-y-4">
            {recipes.map(recipe => (
              <div key={recipe.id} className="glass-panel border border-white/8 rounded-[28px] overflow-hidden flex flex-col justify-between shadow-lg relative group">
                
                {/* Real-time AI Generated Food Image */}
                <div className="relative w-full h-48 bg-black/40 border-b border-white/5 overflow-hidden flex items-center justify-center">
                  {loadingImages[recipe.id] ? (
                    <div className="absolute inset-0 bg-white/3 flex flex-col items-center justify-center space-y-2 animate-pulse">
                      <RefreshCw className="w-6 h-6 text-[#00D26A] animate-spin" />
                      <span className="text-[8.5px] font-black text-white/50 uppercase tracking-widest font-sans">
                        Préparation du visuel...
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

                  <button
                    type="button"
                    onClick={() => handleToggleFavoriteRecipe(recipe)}
                    className={`absolute bottom-3 right-3 w-9 h-9 rounded-full border flex items-center justify-center backdrop-blur-md transition ${
                      favoriteRecipeIds.has(recipe.id) ? 'bg-[#FF4D6D] border-[#FF4D6D] text-white' : 'bg-black/45 border-white/10 text-white/70 hover:text-white'
                    }`}
                    aria-label="Garder cette recette"
                  >
                    <Heart className={`w-4 h-4 ${favoriteRecipeIds.has(recipe.id) ? 'fill-current' : ''}`} />
                  </button>
                </div>

                {/* Content details */}
                <div className="p-5 space-y-4">
                  <div>
                    <h3 className="text-sm font-black text-white leading-snug">{recipe.title}</h3>
                    <p className="text-[11px] text-white/50 mt-1 leading-relaxed font-sans">{recipe.desc}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-white/[0.04] border border-white/5 p-2">
                      <p className="text-[8px] text-white/30 uppercase font-bold">Budget</p>
                      <p className="text-[11px] text-white font-extrabold">{formatMoney(recipe.estimatedCost || 0)}</p>
                    </div>
                    <div className="rounded-xl bg-white/[0.04] border border-white/5 p-2">
                      <p className="text-[8px] text-white/30 uppercase font-bold">Portions</p>
                      <p className="text-[11px] text-white font-extrabold">{recipe.servings || 4}</p>
                    </div>
                    <div className="rounded-xl bg-white/[0.04] border border-white/5 p-2">
                      <p className="text-[8px] text-white/30 uppercase font-bold">Famille</p>
                      <p className="text-[10px] text-white font-bold truncate">{recipe.familyFit || 'Repas familial'}</p>
                    </div>
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
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleAddToWeek(recipe)}
                        className="px-3 py-2 rounded-xl bg-[#6C5CFF]/10 hover:bg-[#6C5CFF]/20 border border-[#6C5CFF]/20 text-[#9D8CFF] font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-1.5"
                      >
                        <CalendarPlus className="w-3.5 h-3.5" />
                        <span>Semaine</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveFamilyRecipe(recipe)}
                        className={`px-3 py-2 rounded-xl border font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-1.5 ${
                          familyRecipeIds.has(recipe.id)
                            ? 'bg-[#00D26A]/15 border-[#00D26A]/25 text-[#00D26A]'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80'
                        }`}
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{familyRecipeIds.has(recipe.id) ? 'Gardée' : 'Carnet'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedRecipe(recipe)}
                        className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Détails</span>
                      </button>
                    </div>
                  </div>

                  {recipe.missing.length > 0 && (
                    <div className="pt-1">
                      <button
                        onClick={() => handleAddMissing(recipe.missing)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-[#00D26A] hover:text-black border border-white/10 text-white/80 font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>Acheter les manquants</span>
                      </button>
                    </div>
                  )}
                </div>

              </div>
            ))}
          </div>
        </div>
      )}

      {selectedRecipe && (
        <div className="fixed inset-0 z-50 bg-[#07111F]/90 backdrop-blur-md flex items-end sm:items-center justify-center p-4" onClick={() => setSelectedRecipe(null)}>
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#112240] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-white">{selectedRecipe.title}</h3>
                <p className="text-[10px] text-white/45">{selectedRecipe.time} • {selectedRecipe.difficulty} • {formatMoney(selectedRecipe.estimatedCost || 0)}</p>
              </div>
              <button type="button" onClick={() => setSelectedRecipe(null)} className="p-2 rounded-full bg-white/5 hover:bg-white/10">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <p className="text-xs text-white/60 leading-relaxed">{selectedRecipe.desc}</p>
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-white/35 uppercase tracking-widest">Étapes simples</span>
                {(selectedRecipe.prepSteps || []).map((step, index) => (
                  <div key={index} className="flex gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/5">
                    <span className="w-5 h-5 rounded-full bg-[#00D26A]/15 text-[#00D26A] text-[10px] font-black flex items-center justify-center shrink-0">{index + 1}</span>
                    <p className="text-xs text-white/65 leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => handleAddToWeek(selectedRecipe)} className="py-3 rounded-xl bg-[#6C5CFF]/15 border border-[#6C5CFF]/25 text-[#9D8CFF] text-xs font-extrabold">
                  Ajouter à la semaine
                </button>
                <button type="button" onClick={() => handleSaveFamilyRecipe(selectedRecipe)} className="py-3 rounded-xl bg-[#00D26A]/15 border border-[#00D26A]/25 text-[#00D26A] text-xs font-extrabold">
                  {familyRecipeIds.has(selectedRecipe.id) ? 'Mettre à jour' : 'Ajouter au carnet'}
                </button>
              </div>
              <button type="button" onClick={() => handleToggleFavoriteRecipe(selectedRecipe)} className="w-full py-3 rounded-xl bg-[#FF4D6D]/15 border border-[#FF4D6D]/25 text-[#FF8BA0] text-xs font-extrabold">
                {favoriteRecipeIds.has(selectedRecipe.id) ? 'Retirer des recettes gardées' : 'Garder en favori'}
              </button>
              {selectedRecipe.missing.length > 0 && (
                <button type="button" onClick={() => handleAddMissing(selectedRecipe.missing)} className="w-full py-3 rounded-xl bg-[#00D26A] text-black text-xs font-black">
                  Ajouter les ingrédients manquants aux courses
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
