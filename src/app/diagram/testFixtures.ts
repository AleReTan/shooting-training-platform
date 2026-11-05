import type { Layout } from '../../data/types';

// Синтетическая схема (две мишени, бочка, движение) для тестов рендера
// и плеера последовательности: тесты не должны зависеть от
// содержания реальных файлов данных.
export const multiTargetLayout: Layout = {
  unit: 'm',
  width: 16,
  depth: 16,
  positions: [
    { id: 'P1', x: 4, y: 1, label: { ru: 'старт' } },
    { id: 'P2', x: 6, y: 3 },
  ],
  targets: [
    { id: 'T1', x: 8, y: 13, type: 'ipsc-metric' },
    { id: 'T2', x: 12, y: 15, type: 'ipsc-metric' },
  ],
  barriers: [{ x: 6, y: 9, kind: 'barrel' }],
  movement: [{ from: 'P1', to: 'P2', style: 'advance', distance: 50 }],
  sequence: [
    { action: 'engage', target: 'T1', shots: 2 },
    { action: 'engage', target: 'T2', shots: 2 },
    { action: 'move', from: 'P1', to: 'P2' },
    { action: 'engage', target: 'T1', shots: 2 },
  ],
};
