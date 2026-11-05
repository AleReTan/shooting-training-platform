// Слой данных: загружает JSON из data/** на этапе сборки, строит индексы.
// Модуль-синглтон: loadData() кешируется.

import type { Course, Drill, Taxonomy } from './types';

export interface AppData {
  drills: Drill[];
  drillById: Map<string, Drill>;
  courses: Course[];
  courseById: Map<string, Course>;
  coursesByDrillId: Map<string, Course[]>;
  taxonomy: Taxonomy;
}

const drillModules = import.meta.glob<Drill>('/data/drills/*.json', {
  eager: true,
  import: 'default',
});

const courseModules = import.meta.glob<Course>('/data/courses/*.json', {
  eager: true,
  import: 'default',
});

const taxonomyModules = import.meta.glob<Taxonomy>('/data/taxonomy.json', {
  eager: true,
  import: 'default',
});

let cache: AppData | null = null;

export function loadData(): AppData {
  if (cache) return cache;

  const drills = Object.values(drillModules).sort((a, b) => a.id.localeCompare(b.id, 'ru'));
  const courses = Object.values(courseModules);
  const taxonomy = Object.values(taxonomyModules)[0] as Taxonomy;

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

  cache = { drills, drillById, courses, courseById, coursesByDrillId, taxonomy };
  return cache;
}
