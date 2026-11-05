import { test, expect } from 'vitest';
import { loadData } from './load';
import { localized, localizedList } from '../app/i18n';
import type { Localized } from './types';

test('loadData находит данные и строит индексы', async () => {
  const data = await loadData();
  expect(data.drills.length).toBeGreaterThanOrEqual(3);
  expect(data.drillById.get('one-to-five')?.name.ru).toBe('От 1 до 5');
  expect(data.courses.length).toBeGreaterThanOrEqual(1);
  expect(data.taxonomy.tags.length).toBeGreaterThan(10);
  expect(data.taxonomy.parLevels).toContain('master');
});

test('coursesByDrillId связывает упражнение с курсом', async () => {
  const data = await loadData();
  const courses = data.coursesByDrillId.get('bill-drill-carbine');
  expect(courses?.map((c) => c.id)).toContain('trex-carbine');
});

test('loadData кешируется: повторный вызов — тот же объект', async () => {
  const a = await loadData();
  const b = await loadData();
  expect(b).toBe(a);
});

test('localized: ru первично, en fallback, undefined → пусто', () => {
  expect(localized({ ru: 'А', en: 'B' })).toBe('А');
  expect(localized({ en: 'X' } as unknown as Localized)).toBe('X');
  expect(localized(undefined)).toBe('');
});

test('localizedList: ru первично, undefined → пусто', () => {
  expect(localizedList({ ru: ['а'], en: ['b'] })).toEqual(['а']);
  expect(localizedList(undefined)).toEqual([]);
});
