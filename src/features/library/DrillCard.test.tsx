import { test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/preact';
import billDrill from '../../../data/drills/bill-drill-carbine.json';
import { DrillCard } from './DrillCard';
import type { Drill } from '../../data/types';

afterEach(cleanup);

const tagLabels = new Map<string, string>();

test('карточка без needsReview: пометки «на проверке» нет', () => {
  const { container } = render(
    <DrillCard drill={billDrill as Drill} tagLabels={tagLabels} />,
  );
  expect(container.textContent).not.toContain('на проверке');
});

test('карточка с needsReview: видна пометка «на проверке»', () => {
  const drill = { ...(billDrill as Drill), needsReview: true };
  const { container } = render(<DrillCard drill={drill} tagLabels={tagLabels} />);
  expect(container.querySelector('.drill-card__review')?.textContent).toBe('на проверке');
});

test('сложность показана рисками с доступной подписью', () => {
  const { container } = render(<DrillCard drill={billDrill as Drill} tagLabels={tagLabels} />);
  const ticks = container.querySelector('.drill-card__ticks');
  expect(ticks?.getAttribute('role')).toBe('img');
  expect(ticks?.getAttribute('aria-label')).toBe('сложность 2 из 5');
  expect(container.querySelectorAll('.tick--on').length).toBe(2);
  expect(container.querySelectorAll('.tick').length).toBe(5);
});

test('холостая без патронов: в мета-строке «холостая», не «0 патр.»', () => {
  const drill = { ...(billDrill as Drill), rounds: 0, fireMode: ['dry'] as Drill['fireMode'] };
  const { container } = render(<DrillCard drill={drill} tagLabels={tagLabels} />);
  expect(container.textContent).toContain('холостая');
  expect(container.textContent).not.toContain('0 патр.');
});
