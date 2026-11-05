// Слой данных: строит индексы из контентного чанка content.ts (динамический
// импорт — данные не едут в энтри-чанке, см. комментарий там). Промис
// кешируется: параллельные вызовы ждут одну загрузку.

import type { Course, Drill, Taxonomy } from './types';

export interface AppData {
  drills: Drill[];
  drillById: Map<string, Drill>;
  courses: Course[];
  courseById: Map<string, Course>;
  coursesByDrillId: Map<string, Course[]>;
  taxonomy: Taxonomy;
}

function buildIndexes(
  rawDrills: Drill[],
  rawCourses: Course[],
  taxonomy: Taxonomy,
): AppData {
  const drills = [...rawDrills].sort((a, b) => a.id.localeCompare(b.id, 'ru'));
  const courses = [...rawCourses];

  const drillById = new Map(drills.map((d) => [d.id, d]));
  const courseById = new Map(courses.map((c) => [c.id, c]));

  const coursesByDrillId = new Map<string, Course[]>();
  for (const course of courses) {
    for (const item of course.items) {
      const list = coursesByDrillId.get(item.drillId) ?? [];
      list.push(course);
      coursesByDrillId.set(item.drillId, list);
    }
  }

  return { drills, drillById, courses, courseById, coursesByDrillId, taxonomy };
}

let cache: AppData | null = null;
let pending: Promise<AppData> | null = null;

export function loadData(): Promise<AppData> {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = import('./content').then((c) => {
      cache = buildIndexes(c.rawDrills, c.rawCourses, c.rawTaxonomy);
      return cache;
    });
  }
  return pending;
}
