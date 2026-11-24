import { test, expect } from 'vitest';
import { loadData } from './load';
import { shortId, byShortId } from './shortId';

test('shortId: 6 знаков [0-9a-z], устойчив для одного id и различен для разных', () => {
  expect(shortId('trex-50-round-cof')).toMatch(/^[0-9a-z]{6}$/);
  expect(shortId('trex-50-round-cof')).toBe(shortId('trex-50-round-cof'));
  expect(shortId('trex-50-round-cof')).not.toBe(shortId('trex-50-round-pistol'));
});

test('короткие коды уникальны по всем упражнениям: коллизия сломала бы ссылку #/d/<код>', async () => {
  const { drills } = await loadData();
  const codes = drills.map((d) => shortId(d.id));
  expect(new Set(codes).size).toBe(drills.length);
  expect(byShortId(drills, shortId('bill-drill-carbine'))).toBe('bill-drill-carbine');
  expect(byShortId(drills, 'zzzzzz')).toBeUndefined();
});
