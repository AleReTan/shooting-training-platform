// Чистая логика фильтрации каталога (спека §8 п.1).
// Семантика: заполненные поля сужают (AND); внутри tags — OR;
// query — без учёта регистра по имени/цели/шагам (ru, затем en).

import type { Discipline, Drill, FireMode } from '../../data/types';

export interface CatalogFilters {
  query: string;
  tags: string[];
  /** Теги-исключения: drill с любым из них скрыт (условия места — «не бегаю в плитнике»). */
  excludedTags?: string[];
  difficultyMin?: number;
  difficultyMax?: number;
  fireMode?: FireMode;
  discipline?: Discipline;
  maxRounds?: number;
  distanceMax?: number;
  needsReview?: boolean;
  source?: string;
  favoritesOnly?: boolean;
  favorites?: string[];
}

/** Сложность корзинами: диапазон 1–5 дробить «от/до» неудобно с телефона,
 *  а люди думают словами «лёгкая/средняя/сложная», не «3+». */
export type DifficultyBucket = '' | 'easy' | 'mid' | 'hard';

const DIFFICULTY_RANGE: Record<Exclude<DifficultyBucket, ''>, [number, number]> = {
  easy: [1, 2],
  mid: [3, 3],
  hard: [4, 5],
};

/** UI-состояние фильтров каталога: ''/пустое = фильтр не задан.
 *  Один объект вместо дюжины useState: новое поле здесь + контрол в
 *  CatalogPage — сброс/подпись/проверка активности работают сами. */
export interface CatalogState {
  query: string;
  tags: string[];
  excludedTags: string[];
  fireMode: '' | FireMode;
  discipline: '' | Discipline;
  difficulty: DifficultyBucket;
  maxRounds: number | '';
  distanceMax: number | '';
  review: '' | 'yes' | 'no';
  source: string;
  favOnly: boolean;
}

export const INITIAL_CATALOG_STATE: CatalogState = {
  query: '',
  tags: [],
  excludedTags: [],
  fireMode: '',
  discipline: '',
  difficulty: '',
  maxRounds: '',
  distanceMax: '',
  review: '',
  source: '',
  favOnly: false,
};

const STORAGE_KEY = 'shooting-catalog-filters-v1';

/** Загружает фильтры из sessionStorage: каталог размонтируется при уходе в
 *  упражнение, а фильтры не должны сбрасываться на «назад в каталог».
 *  session, а не local: фильтры — контекст тренировки, не долгосрочные данные.
 *  Битые данные → начальное состояние. */
/** Значение поля-выбора из хранилища: только допустимое, иначе «не задано». */
const pick = <T extends string>(v: unknown, allowed: readonly T[]): T =>
  allowed.find((a) => a === v) ?? allowed[0] ?? ('' as T);
const finite = (v: unknown): number | '' => (typeof v === 'number' && Number.isFinite(v) ? v : '');

export function loadCatalogState(): CatalogState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const v = raw ? (JSON.parse(raw) as Partial<CatalogState>) : null;
    if (!v) return INITIAL_CATALOG_STATE;
    const tags = Array.isArray(v.tags) ? v.tags.filter((t): t is string => typeof t === 'string') : [];
    // один тег не может быть и фильтром, и исключением — цикл чипа этого не
    // допускает, битое хранилище может; включение важнее
    const excludedTags = (
      Array.isArray(v.excludedTags) ? v.excludedTags.filter((t): t is string => typeof t === 'string') : []
    ).filter((t) => !tags.includes(t));
    // каждая запись проверяется: чужой формат в хранилище не должен ронять каталог
    // (ошибку рисования в приложении никто не перехватывает)
    return {
      query: typeof v.query === 'string' ? v.query : '',
      tags,
      excludedTags,
      fireMode: pick(v.fireMode, ['', 'live', 'dry'] as const),
      discipline: pick(v.discipline, ['', 'carbine', 'shotgun', 'pistol-traumatic'] as const),
      difficulty: pick(v.difficulty, ['', 'easy', 'mid', 'hard'] as const),
      maxRounds: finite(v.maxRounds),
      distanceMax: finite(v.distanceMax),
      review: pick(v.review, ['', 'yes', 'no'] as const),
      source: typeof v.source === 'string' ? v.source : '',
      favOnly: v.favOnly === true,
    };
  } catch {
    return INITIAL_CATALOG_STATE;
  }
}

/** Сохраняет фильтры; приватный режим Safari и т.п. — молча. */
export function saveCatalogState(s: CatalogState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // нет хранилища — не критично
  }
}

/** UI-состояние → фильтры для filterDrills ('' → не задано). */
export function toCatalogFilters(s: CatalogState, favorites: string[]): CatalogFilters {
  const [difficultyMin, difficultyMax] = s.difficulty ? DIFFICULTY_RANGE[s.difficulty] : [1, 5];
  return {
    query: s.query,
    tags: s.tags,
    excludedTags: s.excludedTags,
    difficultyMin,
    difficultyMax,
    fireMode: s.fireMode || undefined,
    discipline: s.discipline || undefined,
    maxRounds: s.maxRounds === '' ? undefined : s.maxRounds,
    distanceMax: s.distanceMax === '' ? undefined : s.distanceMax,
    needsReview: s.review === '' ? undefined : s.review === 'yes',
    source: s.source || undefined,
    favoritesOnly: s.favOnly || undefined,
    favorites,
  };
}

/** Есть ли отличия от начального состояния (кнопка «сбросить фильтры»). */
export function hasActiveFilters(s: CatalogState): boolean {
  return (Object.keys(INITIAL_CATALOG_STATE) as (keyof CatalogState)[]).some((k) => {
    const v = s[k];
    if (Array.isArray(v)) return v.length > 0;
    return v !== INITIAL_CATALOG_STATE[k];
  });
}

function matchesQuery(drill: Drill, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    drill.name.ru,
    drill.name.en ?? '',
    drill.goal.ru,
    drill.goal.en ?? '',
    ...(drill.steps?.ru ?? []),
    ...(drill.steps?.en ?? []),
  ]
    .join('\n')
    .toLowerCase();
  return haystack.includes(q);
}

export function filterDrills(drills: Drill[], f: CatalogFilters): Drill[] {
  return drills.filter((d) => {
    if (f.tags.length > 0 && !f.tags.some((t) => d.tags.includes(t))) return false;
    if (f.excludedTags?.length && f.excludedTags.some((t) => d.tags.includes(t))) return false;
    if (f.difficultyMin != null && d.difficulty < f.difficultyMin) return false;
    if (f.difficultyMax != null && d.difficulty > f.difficultyMax) return false;
    if (f.fireMode != null && !d.fireMode.includes(f.fireMode)) return false;
    if (f.discipline != null && !d.discipline.includes(f.discipline)) return false;
    if (f.maxRounds != null && d.rounds > f.maxRounds) return false;
    // «дистанция до» — по ближней границе: упражнение можно начать на этом рубеже
    // (решение владельца 2026-11-26: Билл Дрилл 3–23 м стреляется и на коротке)
    if (f.distanceMax != null && d.distance.min > f.distanceMax) return false;
    if (f.needsReview != null && !!d.needsReview !== f.needsReview) return false;
    if (f.source != null && d.source.origin !== f.source) return false;
    if (f.favoritesOnly && !(f.favorites ?? []).includes(d.id)) return false;
    return matchesQuery(d, f.query);
  });
}
