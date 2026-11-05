// Контентный чанк: все JSON данных eagerly. Этот модуль импортируется
// ТОЛЬКО динамически из load.ts — vite выносит его (и данные) из энтри-чанка
// в отдельный асинхронный чанк: JS первого экрана остаётся меньше 50 КБ gzip,
// данные ≈200–300 КБ приезжают следом и прекешатся Service Worker'ом.

import type { Course, Drill, Taxonomy } from './types';

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

export const rawDrills: Drill[] = Object.values(drillModules);
export const rawCourses: Course[] = Object.values(courseModules);
export const rawTaxonomy: Taxonomy = Object.values(taxonomyModules)[0] as Taxonomy;
