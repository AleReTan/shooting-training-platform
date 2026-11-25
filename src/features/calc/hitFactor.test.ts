import { test, expect } from 'vitest';
import {
  zonesToPoints,
  hitFactor,
  requiredTime,
  requiredPoints,
  sheetPoints,
  DEFAULT_ZONE_PRICES,
} from './hitFactor';

test('zonesToPoints minor: A=5, C=3, D=1, сталь=5', () => {
  const counts = { A: 5, C: 3, D: 2, steel: 4 };
  expect(zonesToPoints(counts, 'minor')).toBe(25 + 9 + 2 + 20);
});

test('zonesToPoints major: A=5, C=4, D=2, сталь=5', () => {
  const counts = { A: 5, C: 3, D: 2, steel: 4 };
  expect(zonesToPoints(counts, 'major')).toBe(25 + 12 + 4 + 20);
});

test('hitFactor: очки / время', () => {
  expect(hitFactor(36, 9)).toBe(4);
  expect(hitFactor(92, 10)).toBeCloseTo(9.2, 5);
});

test('обратный расчёт: время для целевого HF и очки для целевого HF', () => {
  expect(requiredTime(92, 10)).toBeCloseTo(9.2, 5);
  expect(requiredPoints(9.4, 10)).toBe(94); // округление вверх: 94 очка гарантируют HF ≥ 10
});

test('requiredPoints не завышает из-за ошибки представления float', () => {
  expect(requiredPoints(16.6, 15)).toBe(249); // 16.6×15 = 249.00000000000003
  expect(requiredPoints(2.2, 25)).toBe(55);
  expect(requiredPoints(1.1, 50)).toBe(55);
});

test('sheetPoints: лист подсчёта — попадания по зонам × цены, по всем мишеням', () => {
  const row = (A: number, M = 0, NS = 0) => ({ A, C: 0, D: 0, M, NS });
  // 10 «альф» на мишени = 50 очков
  expect(sheetPoints([row(10)], DEFAULT_ZONE_PRICES)).toBe(50);
  // промах и ношот — штрафы (ношот по умолчанию −10): 2 альфы + промах + ношот = −10
  expect(sheetPoints([row(2, 1), row(0, 0, 1)], DEFAULT_ZONE_PRICES)).toBe(-10);
  // цены упражнения («Средний уровень» T-Rex): A10/C6/D2, ношот −20
  expect(
    sheetPoints(
      [{ A: 1, C: 1, D: 1, M: 1, NS: 1 }],
      { A: 10, C: 6, D: 2, miss: -10, noShoot: -20 },
    ),
  ).toBe(10 + 6 + 2 - 10 - 20);
});
