import { getSupabaseClient } from '../utils/supabase';

export type CloudFamilyMemo = {
  id: string;
  text: string;
  priority: 'normal' | 'important' | 'urgent';
  assignedTo: string;
  createdBy: string;
  createdAt: string;
  done: boolean;
  color?: string;
};

export type CloudFamilyRecipe = {
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
  savedAt: string;
  authorName: string;
  tags: string[];
  source: 'ia' | 'local' | 'family';
};

type MemoDbRow = {
  id: string;
  text: string;
  priority: CloudFamilyMemo['priority'];
  assigned_to: string;
  created_by: string;
  done: boolean;
  color?: string | null;
  created_at: string;
};

type RecipeDbRow = {
  id: string;
  title: string;
  description?: string | null;
  uses?: string[] | null;
  missing?: string[] | null;
  time?: string | null;
  difficulty?: string | null;
  rating?: string | null;
  prompt_keywords?: string | null;
  estimated_cost?: number | null;
  servings?: number | null;
  family_fit?: string | null;
  prep_steps?: string[] | null;
  saved_at: string;
  author_name?: string | null;
  tags?: string[] | null;
  source?: CloudFamilyRecipe['source'] | null;
};

const mapMemoFromDb = (row: MemoDbRow): CloudFamilyMemo => ({
  id: row.id,
  text: row.text,
  priority: row.priority || 'normal',
  assignedTo: row.assigned_to || 'all',
  createdBy: row.created_by || 'Famille',
  createdAt: row.created_at,
  done: !!row.done,
  color: row.color || undefined
});

const mapMemoToDb = (foyerId: string, memo: CloudFamilyMemo) => ({
  id: memo.id,
  foyer_id: foyerId,
  text: memo.text,
  priority: memo.priority,
  assigned_to: memo.assignedTo || 'all',
  created_by: memo.createdBy || 'Famille',
  done: !!memo.done,
  color: memo.color || null,
  created_at: memo.createdAt,
  updated_at: new Date().toISOString()
});

const asStringArray = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const mapRecipeFromDb = (row: RecipeDbRow): CloudFamilyRecipe => ({
  id: row.id,
  title: row.title,
  desc: row.description || '',
  uses: asStringArray(row.uses),
  missing: asStringArray(row.missing),
  time: row.time || '30 min',
  difficulty: row.difficulty || 'Facile',
  rating: row.rating || '4.8',
  promptKeywords: row.prompt_keywords || row.title,
  estimatedCost: row.estimated_cost ?? undefined,
  servings: row.servings ?? undefined,
  familyFit: row.family_fit || undefined,
  prepSteps: asStringArray(row.prep_steps),
  savedAt: row.saved_at,
  authorName: row.author_name || 'Famille',
  tags: asStringArray(row.tags),
  source: row.source || 'family'
});

const mapRecipeToDb = (foyerId: string, recipe: CloudFamilyRecipe) => ({
  id: recipe.id,
  foyer_id: foyerId,
  title: recipe.title,
  description: recipe.desc || '',
  uses: recipe.uses || [],
  missing: recipe.missing || [],
  time: recipe.time || null,
  difficulty: recipe.difficulty || null,
  rating: recipe.rating || null,
  prompt_keywords: recipe.promptKeywords || null,
  estimated_cost: recipe.estimatedCost ?? null,
  servings: recipe.servings ?? null,
  family_fit: recipe.familyFit || null,
  prep_steps: recipe.prepSteps || [],
  saved_at: recipe.savedAt,
  author_name: recipe.authorName || 'Famille',
  tags: recipe.tags || [],
  source: recipe.source || 'family',
  updated_at: new Date().toISOString()
});

export const familyContentService = {
  async fetchMemos(foyerId: string): Promise<CloudFamilyMemo[]> {
    const supabase = getSupabaseClient();
    if (!supabase || !foyerId) return [];

    const { data, error } = await supabase
      .from('family_memos')
      .select('id, text, priority, assigned_to, created_by, done, color, created_at')
      .eq('foyer_id', foyerId)
      .order('created_at', { ascending: false })
      .limit(40);

    if (error) {
      console.warn('[familyContentService] family_memos unavailable, local fallback used:', error.message);
      return [];
    }
    return (data || []).map((row) => mapMemoFromDb(row as MemoDbRow));
  },

  async upsertMemo(foyerId: string, memo: CloudFamilyMemo): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase || !foyerId) return;
    const { error } = await supabase.from('family_memos').upsert(mapMemoToDb(foyerId, memo));
    if (error) throw error;
  },

  async deleteMemo(foyerId: string, memoId: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase || !foyerId) return;
    const { error } = await supabase.from('family_memos').delete().eq('foyer_id', foyerId).eq('id', memoId);
    if (error) throw error;
  },

  async migrateLocalMemos(foyerId: string, memos: CloudFamilyMemo[]): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase || !foyerId || memos.length === 0) return;
    const { error } = await supabase.from('family_memos').upsert(memos.map((memo) => mapMemoToDb(foyerId, memo)));
    if (error) console.warn('[familyContentService] Local memo migration skipped:', error.message);
  },

  async fetchRecipes(foyerId: string): Promise<CloudFamilyRecipe[]> {
    const supabase = getSupabaseClient();
    if (!supabase || !foyerId) return [];

    const { data, error } = await supabase
      .from('family_recipes')
      .select('id, title, description, uses, missing, time, difficulty, rating, prompt_keywords, estimated_cost, servings, family_fit, prep_steps, saved_at, author_name, tags, source')
      .eq('foyer_id', foyerId)
      .order('saved_at', { ascending: false })
      .limit(40);

    if (error) {
      console.warn('[familyContentService] family_recipes unavailable, local fallback used:', error.message);
      return [];
    }
    return (data || []).map((row) => mapRecipeFromDb(row as RecipeDbRow));
  },

  async upsertRecipe(foyerId: string, recipe: CloudFamilyRecipe): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase || !foyerId) return;
    const { error } = await supabase.from('family_recipes').upsert(mapRecipeToDb(foyerId, recipe));
    if (error) throw error;
  },

  async deleteRecipe(foyerId: string, recipeId: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase || !foyerId) return;
    const { error } = await supabase.from('family_recipes').delete().eq('foyer_id', foyerId).eq('id', recipeId);
    if (error) throw error;
  },

  async migrateLocalRecipes(foyerId: string, recipes: CloudFamilyRecipe[]): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase || !foyerId || recipes.length === 0) return;
    const { error } = await supabase.from('family_recipes').upsert(recipes.map((recipe) => mapRecipeToDb(foyerId, recipe)));
    if (error) console.warn('[familyContentService] Local recipe migration skipped:', error.message);
  }
};
