import { test, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, act, within } from '@testing-library/preact';
import { multiTargetLayout as layout } from './testFixtures';
import type { Layout } from '../../data/types';
import { SequencePlayer } from './SequencePlayer';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

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

test('несколько позиций — под схемой легенда с их подписями', () => {
  const { container } = render(<SequencePlayer layout={layout} reducedMotion />);
  const legend = container.querySelector('.sequence-player__legend');
  expect(legend?.textContent).toContain('P1 — старт');
  expect(legend?.textContent).toContain('P2'); // без подписи — только id
});

test('одна позиция — легенды нет', () => {
  const { container } = render(<SequencePlayer layout={tinyLayout} reducedMotion />);
  expect(container.querySelector('.sequence-player__legend')).toBeNull();
});

test('без sequence — только схема, без кнопок проигрывания', () => {
  const { container } = render(<SequencePlayer layout={{ ...layout, sequence: [] }} reducedMotion />);
  expect(container.querySelector('svg.diagram')).toBeTruthy();
  expect(screen.queryByText('Проиграть')).toBeNull();
});

test('при reducedMotion «Проиграть» доступна: стрелок скачет, а не скользит', () => {
  render(<SequencePlayer layout={layout} reducedMotion />);
  fireEvent.click(screen.getByText('Проиграть'));
  expect(screen.getByText('Стоп')).toBeTruthy();
});

test('игра: Стоп ставит на паузу («Продолжить»), Сброс — в начало', () => {
  const { tick } = manualClock();
  render(<SequencePlayer layout={layout} />);
  fireEvent.click(screen.getByText('Проиграть'));
  tick(50);
  fireEvent.click(screen.getByText('Стоп'));
  expect(screen.getByText('Продолжить')).toBeTruthy();
  fireEvent.click(screen.getByText('Сброс'));
  expect(screen.getByText('Проиграть')).toBeTruthy();
});

/** Часы — вручную и в такт фейковым таймерам: кадры детерминированы
 *  (на настоящих часах jsdom метка кадра и performance.now расходятся). */
function manualClock() {
  let now = 0;
  vi.useFakeTimers();
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  return {
    tick: (ms: number) => {
      now += ms;
      act(() => {
        vi.advanceTimersByTime(ms);
      });
    },
  };
}

test('пауза: картинка замирает на месте, «Продолжить» идёт дальше, а не с нуля', () => {
  const { tick } = manualClock();
  const active = () => document.querySelector('.diagram-target--active')?.getAttribute('data-target') ?? null;

  render(<SequencePlayer layout={twoShotsLayout} />);
  fireEvent.click(screen.getByText('Проиграть'));
  for (let t = 0; t < 1700; t += 50) tick(50);
  expect(active()).toBe('T2');

  fireEvent.click(screen.getByText('Стоп'));
  expect(screen.getByText('Продолжить')).toBeTruthy();
  expect(active()).toBe('T2'); // замирает: подсветка не гаснет

  fireEvent.click(screen.getByText('Продолжить'));
  tick(50);
  expect(active()).toBe('T2'); // с нуля была бы уже T1

  // после естественного конца — снова «Проиграть» и с нуля
  for (let t = 0; t < 1600; t += 50) tick(50);
  expect(screen.getByText('Проиграть')).toBeTruthy();
  fireEvent.click(screen.getByText('Проиграть'));
  tick(50);
  expect(active()).toBe('T1');

  // «Сброс» — в начало: подсветка гаснет, снова «Проиграть»
  fireEvent.click(screen.getByText('Стоп'));
  fireEvent.click(screen.getByText('Сброс'));
  expect(active()).toBeNull();
  expect(screen.getByText('Проиграть')).toBeTruthy();
});

test('«Проиграть» после пошагового режима стартует с выбранного шага', () => {
  const { tick } = manualClock();
  render(<SequencePlayer layout={twoShotsLayout} />);
  fireEvent.click(screen.getByText('Шаг вперёд')); // шаг 1 — T1
  fireEvent.click(screen.getByText('Шаг вперёд')); // шаг 2 — T2
  fireEvent.click(screen.getByText('Проиграть'));
  tick(50); // с нуля на 50-й мс была бы активна T1
  expect(document.querySelector('.diagram-target--active')?.getAttribute('data-target')).toBe('T2');
});

// Три серии в духе «The Wall»: от декорации к 5 м; на 5 м; с 10 м
const stringsLayout: Layout = {
  unit: 'm',
  width: 8,
  depth: 10,
  positions: [
    { id: 'P25', x: 4, y: 1 },
    { id: 'P5', x: 4, y: 8, label: { ru: 'отметка 5 м' } },
    { id: 'P10', x: 2, y: 5, label: { ru: 'отметка 10 м' } },
  ],
  targets: [{ id: 'T1', x: 4, y: 9, type: 'ipsc-metric' }],
  sequence: [
    { action: 'engage', target: 'T1', shots: 4 },
    { action: 'move', from: 'P25', to: 'P5' },
    { action: 'engage', target: 'T1', shots: 3, string: 2 },
    { action: 'engage', target: 'T1', shots: 3, string: 3, at: 'P10' },
  ],
};

test('многосерийное: переключатель серий — играется только выбранная, чужие позиции бледнеют', () => {
  const { container } = render(<SequencePlayer layout={stringsLayout} reducedMotion />);
  const options = within(screen.getByRole('radiogroup', { name: 'Серия' })).getAllByRole('radio');
  expect(options.map((o) => o.textContent)).toEqual(['1', '2', '3']);
  expect(options[0]?.getAttribute('aria-checked')).toBe('true');

  const dim = (id: string) =>
    (container.querySelector(`[data-position="${id}"]`)?.getAttribute('class') ?? '').includes('diagram--dim');
  // серия 1: от декорации к 5 м — 10-я отметка не при делах и в легенде её нет
  expect([dim('P25'), dim('P5'), dim('P10')]).toEqual([false, false, true]);
  expect(container.querySelector('.sequence-player__legend')?.textContent).not.toContain('P10');
  fireEvent.click(screen.getByText('Шаг вперёд'));
  expect(container.textContent).toContain('шаг 1/2');

  fireEvent.click(options[2]!); // серия 3 — целиком с 10 м
  expect(options[2]?.getAttribute('aria-checked')).toBe('true');
  expect([dim('P25'), dim('P5'), dim('P10')]).toEqual([true, true, false]);
  // счётчик шагов и подсветка — заново и только по шагам этой серии
  expect(container.textContent).not.toContain('шаг ');
  fireEvent.click(screen.getByText('Шаг вперёд'));
  expect(container.textContent).toContain('шаг 1/1');
  expect(document.querySelector('[data-target="T1"]')?.getAttribute('class')).toContain('diagram-target--active');
});

test('одна серия — переключателя нет, все позиции яркие', () => {
  render(<SequencePlayer layout={layout} reducedMotion />);
  expect(screen.queryByRole('radiogroup', { name: 'Серия' })).toBeNull();
  expect(document.querySelector('.diagram--dim')).toBeNull();
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

// Две одиночные мишени по 1600 мс: на 1700-й мс активна вторая.
const twoShotsLayout: Layout = {
  ...tinyLayout,
  targets: [
    { id: 'T1', x: 2, y: 9, type: 'ipsc-metric' },
    { id: 'T2', x: 6, y: 9, type: 'ipsc-metric' },
  ],
  sequence: [
    { action: 'engage', target: 'T1', shots: 1 },
    { action: 'engage', target: 'T2', shots: 1 },
  ],
};
