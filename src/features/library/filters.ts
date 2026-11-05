// Чистая логика фильтрации каталога (спека §8 п.1).
// Семантика: заполненные поля сужают (AND); внутри tags — OR;
// query — без учёта регистра по имени/цели/шагам (ru, затем en).

import type { Discipline, Drill, FireMode } from '../../data/types';

export interface CatalogFilters {
  query: string;
  tags: string[];
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

/** UI-состояние фильтров каталога: ''/пустое = фильтр не задан.
 *  Один объект вместо дюжины useState: новое поле здесь + контрол в
 *  CatalogPage — сброс/подпись/проверка активности работают сами. */
export interface CatalogState {
  query: string;
  tags: string[];
  fireMode: '' | FireMode;
  discipline: '' | Discipline;
  difficultyMin: number;
  difficultyMax: number;
  maxRounds: number | '';
  distanceMax: number | '';
  review: '' | 'yes' | 'no';
  source: string;
  favOnly: boolean;
}

export const INITIAL_CATALOG_STATE: CatalogState = {
  query: '',
  tags: [],
  fireMode: '',
  discipline: '',
  difficultyMin: 1,
  difficultyMax: 5,
  maxRounds: '',
  distanceMax: '',
  review: '',
  source: '',
  favOnly: false,
};

/** UI-состояние → фильтры для filterDrills ('' → не задано). */
export function toCatalogFilters(s: CatalogState, favorites: string[]): CatalogFilters {
  return {
    query: s.query,
    tags: s.tags,
    difficultyMin: s.difficultyMin,
    difficultyMax: s.difficultyMax,
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
    if (f.difficultyMin != null && d.difficulty < f.difficultyMin) return false;
    if (f.difficultyMax != null && d.difficulty > f.difficultyMax) return false;
    if (f.fireMode != null && !d.fireMode.includes(f.fireMode)) return false;
    if (f.discipline != null && !d.discipline.includes(f.discipline)) return false;
    if (f.maxRounds != null && d.rounds > f.maxRounds) return false;
    if (f.distanceMax != null && d.distance.min > f.distanceMax) return false;
    if (f.needsReview != null && !!d.needsReview !== f.needsReview) return false;
    if (f.source != null && d.source.origin !== f.source) return false;
    if (f.favoritesOnly && !(f.favorites ?? []).includes(d.id)) return false;
    return matchesQuery(d, f.query);
  });
}
