import { test, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/preact';
import billDrill from '../../../data/drills/bill-drill-carbine.json';
import type { Layout } from '../../data/types';
import { SequencePlayer } from './SequencePlayer';

afterEach(cleanup);

const layout = (billDrill as { layout: Layout }).layout;

test('пошаговый режим: «Шаг вперёд» подсвечивает мишень T1', () => {
  render(<SequencePlayer layout={layout} reducedMotion />);
  expect(document.querySelector('[data-target="T1"]')?.getAttribute('class')).not.toContain(
    'diagram-target--active',
  );
  fireEvent.click(screen.getByText('Шаг вперёд'));
  expect(
    document.querySelector('[data-target="T1"]')?.getAttribute('class'),
  ).toContain('diagram-target--active');
  expect(document.body.textContent).toContain('×2');
});

test('при reducedMotion кнопки автопроигрывания скрыты', () => {
  render(<SequencePlayer layout={layout} reducedMotion />);
  expect(screen.queryByText('Играть')).toBeNull();
  expect(screen.getByText('Шаг вперёд')).toBeTruthy();
});

test('игра: Стоп возвращает в начало', async () => {
  render(<SequencePlayer layout={layout} />);
  fireEvent.click(screen.getByText('Играть'));
  await new Promise((r) => setTimeout(r, 80));
  fireEvent.click(screen.getByText('Стоп'));
  expect(screen.getByText('Играть')).toBeTruthy();
});
