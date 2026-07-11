export type BedtimeAgeBand = '3-5' | '6-8' | '9-12';

export interface BedtimeStoryChapter {
  title: string;
  content: string[];
}

export interface BedtimeStory {
  id: string;
  title: string;
  chapters: BedtimeStoryChapter[];
  hero: string;
  heroMemberId?: string;
  companion?: string;
  universeId: string;
  moralId: string;
  ageBand: BedtimeAgeBand;
  personalTheme?: string;
  bgGlow: string;
  emoji: string;
  themeColor: string;
  coverUrl: string;
  createdAt: string;
  updatedAt: string;
  currentChapter: number;
  favorite: boolean;
  completed: boolean;
  isRealAI?: boolean;
}

export interface BedtimePreferences {
  speechRate: number;
  speechPitch: number;
  selectedVoiceName: string;
  fontSize: 'sm' | 'base' | 'lg' | 'xl';
  ambientSound: 'none' | 'rain' | 'crickets' | 'lullaby' | 'ocean' | 'wind' | 'stream';
  ambientVolume: number;
  continuousReading: boolean;
  ritualEnabled: boolean;
}

const LIBRARY_KEY = 'mf_bedtime_story_library_v2';
const ACTIVE_KEY = 'mf_bedtime_story_active_v2';
const PREFERENCES_KEY = 'mf_bedtime_story_preferences_v2';
const MAX_LOCAL_STORIES = 30;

const DEFAULT_PREFERENCES: BedtimePreferences = {
  speechRate: 0.85,
  speechPitch: 1.05,
  selectedVoiceName: '',
  fontSize: 'xl',
  ambientSound: 'none',
  ambientVolume: 0.15,
  continuousReading: true,
  ritualEnabled: false
};

const safeParse = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
};

const normalizeText = (value: unknown, maxLength: number): string => String(value || '')
  .replace(/[<>]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, maxLength);

const unsafeBedtimeTerms = /\b(suicide|pornographie|torture|d[ée]capit|massacre|drogue dure|viol sexuel)\b/iu;

export const calculateAge = (birthDate?: string, fallbackAge?: string): number | null => {
  if (birthDate) {
    const normalized = birthDate.includes('/')
      ? birthDate.split('/').reverse().join('-')
      : birthDate;
    const date = new Date(normalized);
    if (!Number.isNaN(date.getTime())) {
      const now = new Date();
      let age = now.getFullYear() - date.getFullYear();
      const birthdayPassed = now.getMonth() > date.getMonth()
        || (now.getMonth() === date.getMonth() && now.getDate() >= date.getDate());
      if (!birthdayPassed) age -= 1;
      if (age >= 0 && age < 120) return age;
    }
  }
  const parsed = Number.parseInt(fallbackAge || '', 10);
  return Number.isFinite(parsed) ? parsed : null;
};

export const ageBandFor = (age: number | null): BedtimeAgeBand => {
  if (age !== null && age <= 5) return '3-5';
  if (age !== null && age <= 8) return '6-8';
  return '9-12';
};

export const ageGuidance = (band: BedtimeAgeBand): string => {
  if (band === '3-5') return 'phrases courtes, vocabulaire très simple, aucune tension, répétitions rassurantes';
  if (band === '6-8') return 'vocabulaire accessible, aventure douce, humour léger et résolution rassurante';
  return 'récit plus riche, émotions nuancées, mystère sans peur et conclusion apaisante';
};

export const validateAndSanitizeStory = (input: unknown): BedtimeStoryChapter[] | null => {
  if (!input || !Array.isArray(input)) return null;
  const chapters = input.slice(0, 4).map((chapter: unknown, index) => {
    const candidate = chapter as { title?: unknown; content?: unknown };
    const content = Array.isArray(candidate?.content)
      ? candidate.content.slice(0, 5).map(value => normalizeText(value, 2200)).filter(Boolean)
      : [];
    return {
      title: normalizeText(candidate?.title, 120) || `Chapitre ${index + 1}`,
      content
    };
  }).filter(chapter => chapter.content.length > 0);
  const allText = chapters.flatMap(chapter => chapter.content).join(' ');
  if (chapters.length < 3 || unsafeBedtimeTerms.test(allText) || allText.length < 500) return null;
  return chapters;
};

export const createStoryRecord = (story: Omit<BedtimeStory, 'id' | 'createdAt' | 'updatedAt' | 'currentChapter' | 'favorite' | 'completed'>): BedtimeStory => {
  const now = new Date().toISOString();
  return {
    ...story,
    id: globalThis.crypto?.randomUUID?.() || `story-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: now,
    updatedAt: now,
    currentChapter: 0,
    favorite: false,
    completed: false
  };
};

export const getStoryLibrary = (): BedtimeStory[] => safeParse<BedtimeStory[]>(LIBRARY_KEY, [])
  .filter(story => story?.id && Array.isArray(story.chapters))
  .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

export const saveStory = (story: BedtimeStory): BedtimeStory[] => {
  const nextStory = { ...story, updatedAt: new Date().toISOString() };
  const current = getStoryLibrary().filter(item => item.id !== story.id);
  const favorites = current.filter(item => item.favorite);
  const others = current.filter(item => !item.favorite);
  const next = [nextStory, ...favorites, ...others].slice(0, MAX_LOCAL_STORIES);
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(next));
  localStorage.setItem(ACTIVE_KEY, nextStory.id);
  return next;
};

export const removeStory = (id: string): BedtimeStory[] => {
  const next = getStoryLibrary().filter(story => story.id !== id);
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(next));
  if (localStorage.getItem(ACTIVE_KEY) === id) localStorage.removeItem(ACTIVE_KEY);
  return next;
};

export const getActiveStory = (): BedtimeStory | null => {
  const activeId = localStorage.getItem(ACTIVE_KEY);
  return getStoryLibrary().find(story => story.id === activeId) || null;
};

export const clearActiveStory = (): void => {
  localStorage.removeItem(ACTIVE_KEY);
};

export const getBedtimePreferences = (): BedtimePreferences => ({
  ...DEFAULT_PREFERENCES,
  ...safeParse<Partial<BedtimePreferences>>(PREFERENCES_KEY, {})
});

export const saveBedtimePreferences = (preferences: BedtimePreferences): void => {
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
};
