import { test, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/preact';
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

test('звезда избранного: клик переключает, состояние видно', () => {
  const onToggle = vi.fn();
  const off = render(
    <DrillCard drill={billDrill as Drill} tagLabels={tagLabels} favorite={false} onToggleFavorite={onToggle} />,
  );
  const star = off.container.querySelector('.drill-card__star') as HTMLElement;
  expect(star.getAttribute('aria-pressed')).toBe('false');
  fireEvent.click(star);
  expect(onToggle).toHaveBeenCalledTimes(1);

  const on = render(
    <DrillCard drill={billDrill as Drill} tagLabels={tagLabels} favorite onToggleFavorite={onToggle} />,
  );
  expect((on.container.querySelector('.drill-card__star') as HTMLElement).getAttribute('aria-pressed')).toBe('true');
});

test('без обработчика звезды нет', () => {
  const { container } = render(<DrillCard drill={billDrill as Drill} tagLabels={tagLabels} />);
  expect(container.querySelector('.drill-card__star')).toBeNull();
});
