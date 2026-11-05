import { test, expect } from 'vitest';
import { zonesToPoints, hitFactor, requiredTime, requiredPoints } from './hitFactor';

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
