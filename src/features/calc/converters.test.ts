import { test, expect } from 'vitest';
import { mToYd, ydToM, gnToG, gToGn, angleToCm } from './converters';

test('м↔ярды: 100 м = 109.36 ярд; 100 ярд = 91.44 м', () => {
  expect(mToYd(100)).toBeCloseTo(109.36, 1);
  expect(ydToM(100)).toBeCloseTo(91.44, 2);
});

test('вес пули: граны↔граммы', () => {
  expect(gnToG(125)).toBeCloseTo(8.1, 2); // 125 gn ≈ 8.1 г
  expect(gToGn(9.6)).toBeCloseTo(148.15, 1); // 9.6 г ≈ 148 gn
});

test('поправка: MOA/MIL → см на дистанции', () => {
  expect(angleToCm(1, 'moa', 100)).toBeCloseTo(2.91, 2);
  expect(angleToCm(1, 'mil', 100)).toBeCloseTo(10, 5); // 1 mil @ 100 м = 10 см
  expect(angleToCm(2, 'mil', 300)).toBeCloseTo(60, 5);
});
