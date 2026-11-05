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
    return matchesQuery(d, f.query);
  });
}
