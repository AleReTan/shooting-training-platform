import { test, expect } from 'vitest';
import { filterDrills, type CatalogFilters } from './filters';
import seed1to5 from '../../../data/drills/seed-1-to-5.json';
import seedBill from '../../../data/drills/seed-bill-drill-carbine.json';
import seedWall from '../../../data/drills/seed-wall-dry.json';
import type { Drill } from '../../data/types';

const drills = [seed1to5, seedBill, seedWall] as Drill[];
const run = (f: Partial<CatalogFilters>) =>
  filterDrills(drills, { query: '', tags: [], ...f });

test('пустые фильтры → все упражнения', () => {
  expect(run({ query: '', tags: [] })).toHaveLength(3);
});

test('фильтр по одному тегу', () => {
  const res = run({ query: '', tags: ['recoil-control'] });
  expect(res.map((d) => d.id)).toEqual(['seed-bill-drill-carbine']);
});

test('OR внутри тегов', () => {
  const res = run({ query: '', tags: ['recoil-control', 'first-shot'] });
  expect(res.map((d) => d.id).sort()).toEqual(['seed-1-to-5', 'seed-bill-drill-carbine']);
});

test('AND: тег + fireMode', () => {
  const res = run({ query: '', tags: ['accuracy'], fireMode: 'dry' });
  expect(res.map((d) => d.id)).toEqual(['seed-wall-dry']);
});

test('query по имени (без учёта регистра)', () => {
  const res = run({ query: 'билл', tags: [] });
  expect(res.map((d) => d.id)).toEqual(['seed-bill-drill-carbine']);
});

test('query по английскому имени', () => {
  const res = run({ query: 'wall', tags: [] });
  expect(res.map((d) => d.id)).toEqual(['seed-wall-dry']);
});

test('query по тексту шага', () => {
  const res = run({ query: 'в зону «А»', tags: [] });
  expect(res.map((d) => d.id)).toEqual(['seed-bill-drill-carbine']);
});

test('maxRounds: только упражнения с расходом ≤ порога', () => {
  const res = run({ query: '', tags: [], maxRounds: 6 });
  expect(res.map((d) => d.id).sort()).toEqual(['seed-bill-drill-carbine', 'seed-wall-dry']);
});

test('distanceMax: ближняя граница упражнения ≤ порога', () => {
  const res = run({ query: '', tags: [], distanceMax: 10 });
  expect(res.map((d) => d.id).sort()).toEqual(['seed-bill-drill-carbine', 'seed-wall-dry']);
});

test('диапазон сложности', () => {
  const res = run({ query: '', tags: [], difficultyMin: 2, difficultyMax: 2 });
  expect(res.map((d) => d.id)).toEqual(['seed-bill-drill-carbine']);
});
