import { test, expect } from 'vitest';
import { dailyDrillId } from './daily';

const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

test('детерминирован по дате и всегда из списка', () => {
  expect(dailyDrillId(ids, '2026-11-05')).toBe(dailyDrillId(ids, '2026-11-05'));
  expect(ids).toContain(dailyDrillId(ids, '2026-11-05'));
});

test('пустой список — null', () => {
  expect(dailyDrillId([], '2026-11-05')).toBeNull();
});

test('разные даты дают разный выбор', () => {
  const days = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'];
  const picks = new Set(days.map((d) => dailyDrillId(ids, d)));
  expect(picks.size).toBeGreaterThan(1);
});
