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
