import { test, expect } from 'vitest';
import {
  filterDrills,
  INITIAL_CATALOG_STATE,
  toCatalogFilters,
  hasActiveFilters,
  type CatalogFilters,
  type CatalogState,
} from './filters';
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

test('фильтр по дисциплине; смешанные входят в каждую из своих', () => {
  const list: Drill[] = [
    ...drills,
    { ...oneTo5, id: 'x-pistol', discipline: ['pistol-traumatic'] } as Drill,
    { ...oneTo5, id: 'x-mixed', discipline: ['carbine', 'shotgun'] } as Drill,
  ];
  const by = (discipline: CatalogFilters['discipline']) =>
    filterDrills(list, { query: '', tags: [], discipline }).map((d) => d.id);
  expect(by('pistol-traumatic')).toEqual(['x-pistol']);
  expect(by('shotgun')).toEqual(['x-mixed']);
  expect(by('carbine').sort()).toEqual(['bill-drill-carbine', 'one-to-five', 'wall-dry', 'x-mixed']);
});

test('needsReview: true → только на проверке; false → только проверенные', () => {
  const list: Drill[] = [
    ...drills,
    { ...oneTo5, id: 'x-review', needsReview: true } as Drill,
  ];
  const by = (needsReview: boolean) =>
    filterDrills(list, { query: '', tags: [], needsReview }).map((d) => d.id);
  expect(by(true)).toEqual(['x-review']);
  expect(by(false).sort()).toEqual(['bill-drill-carbine', 'one-to-five', 'wall-dry']);
});

test('source: точное совпадение origin', () => {
  const res = run({ query: '', tags: [], source: 'Kyle Lamb' });
  expect(res.map((d) => d.id)).toEqual(['one-to-five']);
});

test('favoritesOnly: только отмеченные упражнения', () => {
  const res = run({ query: '', tags: [], favoritesOnly: true, favorites: ['one-to-five'] });
  expect(res.map((d) => d.id)).toEqual(['one-to-five']);
});

test('toCatalogFilters: пустые значения UI не становятся фильтрами', () => {
  const f = toCatalogFilters(INITIAL_CATALOG_STATE, ['x']);
  expect(f).toEqual({
    query: '',
    tags: [],
    difficultyMin: 1,
    difficultyMax: 5,
    favorites: ['x'],
  });
  expect(f.fireMode).toBeUndefined();
  expect(f.source).toBeUndefined();
  expect(f.favoritesOnly).toBeUndefined();

  const filled: CatalogState = {
    ...INITIAL_CATALOG_STATE,
    fireMode: 'dry',
    discipline: 'carbine',
    maxRounds: 10,
    distanceMax: 25,
    review: 'yes',
    source: 'Kyle Lamb',
    favOnly: true,
  };
  expect(toCatalogFilters(filled, [])).toMatchObject({
    fireMode: 'dry',
    discipline: 'carbine',
    maxRounds: 10,
    distanceMax: 25,
    needsReview: true,
    source: 'Kyle Lamb',
    favoritesOnly: true,
  });
});

test('hasActiveFilters: любое отличие от начального состояния — активные фильтры', () => {
  expect(hasActiveFilters(INITIAL_CATALOG_STATE)).toBe(false);
  // пустой массив тегов после снятия выбора — фильтров нет
  expect(hasActiveFilters({ ...INITIAL_CATALOG_STATE, tags: [] })).toBe(false);

  expect(hasActiveFilters({ ...INITIAL_CATALOG_STATE, query: 'билл' })).toBe(true);
  expect(hasActiveFilters({ ...INITIAL_CATALOG_STATE, tags: ['accuracy'] })).toBe(true);
  expect(hasActiveFilters({ ...INITIAL_CATALOG_STATE, difficultyMax: 1 })).toBe(true);
  expect(hasActiveFilters({ ...INITIAL_CATALOG_STATE, favOnly: true })).toBe(true);
});
