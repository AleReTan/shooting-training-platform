import { test, expect } from 'vitest';
import { render } from '@testing-library/preact';
import seedBill from '../../../data/drills/seed-bill-drill-carbine.json';
import type { Layout } from '../../data/types';
import { LayoutDiagram } from './render';

const layout = (seedBill as { layout: Layout }).layout;

test('схема содержит svg, позиции и мишени', () => {
  const { container } = render(<LayoutDiagram layout={layout} />);
  expect(container.querySelector('svg')).toBeTruthy();
  expect(container.textContent).toContain('P1');
  expect(container.textContent).toContain('T1');
  expect(container.textContent).toContain('T2');
  const targets = container.querySelectorAll('[data-target]');
  expect(targets.length).toBe(layout.targets.length);
});

test('подписи дистанций рассчитаны по координатам (евклид, метры)', () => {
  const { container } = render(<LayoutDiagram layout={layout} />);
  const text = container.textContent ?? '';
  // T1→ближайшая позиция P2: hypot(2,10) ≈ 10.2; T2→P2: hypot(6,12) ≈ 13.4
  expect(text).toMatch(/10\.\d+ м/);
  expect(text).toMatch(/13\.\d+ м/);
});

test('барьер и стрелка движения рендерятся', () => {
  const { container } = render(<LayoutDiagram layout={layout} />);
  expect(container.textContent).toContain('barrel');
  expect(container.textContent).toContain('Движение P1→P2');
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
