// Хит-фактор: очки за секунду. Чистые функции для калькулятора (спека §8, расширение)
// и листа подсчёта в карточке упражнения.

import type { ZonePrices } from '../../data/types';

export type Power = 'minor' | 'major';

export type Zone = 'A' | 'C' | 'D' | 'steel';

export type ZoneCounts = Record<Zone, number>;

/** Цена зоны по мощности: minor — карабин, major — тяжёлый пистолетный. Сталь всегда 5. */
const ZONE_POINTS: Record<Power, Record<Zone, number>> = {
  minor: { A: 5, C: 3, D: 1, steel: 5 },
  major: { A: 5, C: 4, D: 2, steel: 5 },
};

/** Суммарные очки за попадания по зонам. */
export function zonesToPoints(counts: ZoneCounts, power: Power): number {
  const price = ZONE_POINTS[power];
  return (Object.keys(counts) as Zone[]).reduce((s, z) => s + counts[z] * price[z], 0);
}

/** Хит-фактор: очки / время, с. */
export function hitFactor(points: number, timeSec: number): number {
  return points / timeSec;
}

/** Время (с), за которое очки дадут целевой HF. */
export function requiredTime(points: number, targetHf: number): number {
  return points / targetHf;
}

/** Очки, которые за это время дадут целевой HF (вверх — гарантия ≥ цели). */
export function requiredPoints(timeSec: number, targetHf: number): number {
  // ε против ошибки представления: 16.6×15 = 249.00000000000003 → 249, не 250
  return Math.ceil(timeSec * targetHf - 1e-9);
}

/** Колонки листа подсчёта: A / C / D / промах / «ношот». */
export type SheetColumn = 'A' | 'C' | 'D' | 'M' | 'NS';

export type SheetRow = Record<SheetColumn, number>;

/** Цены зон по умолчанию (USPSA-стиль); ношот — как в Range Day. */
export const DEFAULT_ZONE_PRICES: Required<ZonePrices> = { A: 5, C: 3, D: 1, miss: -10, noShoot: -10 };

/** Очки листа подсчёта: по каждой мишени попадания × цена зоны (штрафы — отрицательные). */
export function sheetPoints(rows: readonly SheetRow[], prices: ZonePrices = DEFAULT_ZONE_PRICES): number {
  const p: Required<ZonePrices> = { ...DEFAULT_ZONE_PRICES, ...prices };
  return rows.reduce(
    (sum, r) => sum + r.A * p.A + r.C * p.C + r.D * p.D + r.M * p.miss + r.NS * p.noShoot,
    0,
  );
}
