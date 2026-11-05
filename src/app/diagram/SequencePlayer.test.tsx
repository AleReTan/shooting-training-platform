import { test, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/preact';
import { multiTargetLayout as layout } from './testFixtures';
import type { Layout } from '../../data/types';
import { SequencePlayer } from './SequencePlayer';

afterEach(cleanup);

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

test('при reducedMotion «Проиграть» доступна: стрелок скачет, а не скользит', () => {
  render(<SequencePlayer layout={layout} reducedMotion />);
  fireEvent.click(screen.getByText('Проиграть'));
  expect(screen.getByText('Стоп')).toBeTruthy();
});

test('игра: Стоп возвращает в начало', async () => {
  render(<SequencePlayer layout={layout} />);
  fireEvent.click(screen.getByText('Проиграть'));
  await new Promise((r) => setTimeout(r, 80));
  fireEvent.click(screen.getByText('Стоп'));
  expect(screen.getByText('Проиграть')).toBeTruthy();
});

// Минимальная схема: одна мишень, один выстрел — 1600 мс проигрывания.
const tinyLayout: Layout = {
  unit: 'm',
  width: 8,
  depth: 10,
  positions: [{ id: 'P1', x: 4, y: 1 }],
  targets: [{ id: 'T1', x: 4, y: 9, type: 'ipsc-metric' }],
  sequence: [{ action: 'engage', target: 'T1', shots: 1 }],
};

test('после конца проигрывания «Проиграть» запускает заново', async () => {
  render(<SequencePlayer layout={tinyLayout} />);
  fireEvent.click(screen.getByText('Проиграть'));

  // Дожидаемся естественного конца: кнопка снова станет «Проиграть»
  // (в jsdom кадры редкие — ждём событие, а не фиксированные мс).
  await screen.findByText('Проиграть', undefined, { timeout: 5000 });
  expect(
    document.querySelector('[data-target="T1"]')?.getAttribute('class'),
  ).not.toContain('diagram-target--active');

  // Повторный запуск должен начаться с нуля, а не мгновенно закончиться.
  fireEvent.click(screen.getByText('Проиграть'));
  await waitFor(() =>
    expect(
      document.querySelector('[data-target="T1"]')?.getAttribute('class'),
    ).toContain('diagram-target--active'),
  );
});
