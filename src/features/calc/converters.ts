// Константы и функции конвертеров: дистанция, вес пули, угловые поправки.

export const YARD_M = 0.9144;
export const GRAIN_G = 0.06479891;

export const mToYd = (m: number) => m / YARD_M;
export const ydToM = (yd: number) => yd * YARD_M;
export const gnToG = (gn: number) => gn * GRAIN_G;
export const gToGn = (g: number) => g / GRAIN_G;

// MOA = 1/60° = π/10800 рад; MIL (мрад) = 0.001 рад. Длина дуги на дистанции — в см.
export const angleToCm = (value: number, unit: 'moa' | 'mil', distanceM: number) =>
  value * (unit === 'moa' ? Math.PI / 10800 : 0.001) * distanceM * 100;
