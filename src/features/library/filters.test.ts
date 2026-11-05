import { test, expect } from 'vitest';
import { filterDrills, type CatalogFilters } from './filters';
import oneTo5 from '../../../data/drills/one-to-five.json';
import billDrill from '../../../data/drills/bill-drill-carbine.json';
import wallDry from '../../../data/drills/wall-dry.json';
import type { Drill } from '../../data/types';

const drills = [oneTo5, billDrill, wallDry] as Drill[];
const run = (f: Partial<CatalogFilters>) =>
  filterDrills(drills, { query: '', tags: [], ...f });

test('пустые фильтры → все упражнения', () => {
  expect(run({ query: '', tags: [] })).toHaveLength(3);
});

test('фильтр по одному тегу', () => {
  const res = run({ query: '', tags: ['recoil-control'] });
  expect(res.map((d) => d.id)).toEqual(['bill-drill-carbine']);
});

test('OR внутри тегов', () => {
  const res = run({ query: '', tags: ['recoil-control', 'first-shot'] });
  expect(res.map((d) => d.id).sort()).toEqual(['bill-drill-carbine', 'one-to-five']);
});

test('AND: тег + fireMode', () => {
  const res = run({ query: '', tags: ['accuracy'], fireMode: 'dry' });
  expect(res.map((d) => d.id)).toEqual(['wall-dry']);
});

test('query по имени (без учёта регистра)', () => {
  const res = run({ query: 'билл', tags: [] });
  expect(res.map((d) => d.id)).toEqual(['bill-drill-carbine']);
});

test('query по английскому имени', () => {
  const res = run({ query: 'wall', tags: [] });
  expect(res.map((d) => d.id)).toEqual(['wall-dry']);
});

test('query по тексту шага', () => {
  const res = run({ query: 'в зону «А»', tags: [] });
  expect(res.map((d) => d.id)).toEqual(['bill-drill-carbine']);
});

test('maxRounds: только упражнения с расходом ≤ порога', () => {
  const res = run({ query: '', tags: [], maxRounds: 6 });
  expect(res.map((d) => d.id).sort()).toEqual(['bill-drill-carbine', 'wall-dry']);
});

test('distanceMax: ближняя граница упражнения ≤ порога', () => {
  const res = run({ query: '', tags: [], distanceMax: 10 });
  expect(res.map((d) => d.id).sort()).toEqual(['bill-drill-carbine', 'wall-dry']);
});

test('диапазон сложности', () => {
  const res = run({ query: '', tags: [], difficultyMin: 2, difficultyMax: 2 });
  expect(res.map((d) => d.id)).toEqual(['bill-drill-carbine']);
});
