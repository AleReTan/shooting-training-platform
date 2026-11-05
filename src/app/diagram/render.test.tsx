import { test, expect } from 'vitest';
import { render } from '@testing-library/preact';
import { multiTargetLayout as layout } from './testFixtures';
import type { Layout } from '../../data/types';
import { LayoutDiagram } from './render';

test('схема содержит svg, позиции и мишени', () => {
  const { container } = render(<LayoutDiagram layout={layout} />);
  expect(container.querySelector('svg')).toBeTruthy();
  expect(container.textContent).toContain('P1');
  expect(container.textContent).toContain('T1');
  expect(container.textContent).toContain('T2');
  const targets = container.querySelectorAll('[data-target]');
  expect(targets.length).toBe(layout.targets.length);
});

test('подписи дистанций: евклид по координатам, округлённые метры', () => {
  const { container } = render(<LayoutDiagram layout={layout} />);
  const text = container.textContent ?? '';
  // T1→ближайшая позиция P2: hypot(2,10) ≈ 10.2 → «10 м»; T2→P2: 13.4 → «13 м»
  expect(text).toContain('T1 · 10 м');
  expect(text).toContain('T2 · 13 м');
});

test('барьер и стрелка движения рендерятся', () => {
  const { container } = render(<LayoutDiagram layout={layout} />);
  expect(container.textContent).toContain('barrel');
  expect(container.textContent).toContain('Движение P1→P2');
});

test('сжатый переход подписан реальной дистанцией (спринт 50 м)', () => {
  const { container } = render(<LayoutDiagram layout={layout} />);
  expect(container.textContent).toContain('50 м');
});

test('переход без distance подписан округлённой длиной отрезка', () => {
  const noDistance = { ...layout, movement: [{ from: 'P1', to: 'P2', style: 'advance' as const }] };
  const { container } = render(<LayoutDiagram layout={noDistance} />);
  // P1(4,1)→P2(6,3): hypot(2,2) ≈ 2.8 → «3 м»
  expect(container.textContent).toContain('3 м');
});

test('придвинутая дальняя мишень подписана реальной дистанцией', () => {
  // ось сжата: мишень нарисована в 20 м, реально — 200 м
  const far: Layout = {
    unit: 'm',
    width: 8,
    depth: 24,
    positions: [{ id: 'P1', x: 4, y: 1 }],
    targets: [{ id: 'T1', x: 4, y: 21, type: 'ipsc-classic', distance: 200 }],
  };
  const { container } = render(<LayoutDiagram layout={far} />);
  expect(container.textContent).toContain('T1 · 200 м');
});

test('playback подсвечивает активную мишень и счёт выстрелов', () => {
  const { container } = render(
    <LayoutDiagram
      layout={layout}
      playback={{
        phase: 'playing',
        activeTarget: 'T2',
        reloading: false,
        shotsDone: { T2: 3 },
      }}
    />,
  );
  const active = container.querySelector('[data-target="T2"]');
  expect(active?.getAttribute('class')).toContain('diagram-target--active');
  expect(container.textContent).toContain('×3');
});
