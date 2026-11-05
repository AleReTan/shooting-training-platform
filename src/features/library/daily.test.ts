import { test, expect } from 'vitest';
import { dailyDrillId, todayKey } from './daily';

const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

test('детерминирован по дате и всегда из списка', () => {
  expect(dailyDrillId(ids, '2026-11-05')).toBe(dailyDrillId(ids, '2026-11-05'));
  expect(ids).toContain(dailyDrillId(ids, '2026-11-05'));
});

test('пустой список — null', () => {
  expect(dailyDrillId([], '2026-11-05')).toBeNull();
});

test('ключ дня — локальная дата: полночь уже новый день, а не 03:00', () => {
  expect(todayKey(new Date(2026, 10, 7, 0, 30))).toBe('2026-11-07');
  expect(todayKey(new Date(2026, 10, 6, 23, 30))).toBe('2026-11-06');
});

test('разные даты дают разный выбор', () => {
  const days = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'];
  const picks = new Set(days.map((d) => dailyDrillId(ids, d)));
  expect(picks.size).toBeGreaterThan(1);
});
