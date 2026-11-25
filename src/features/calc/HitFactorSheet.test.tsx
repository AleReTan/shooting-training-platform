import { test, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/preact';
import { HitFactorSheet } from './HitFactorSheet';
import type { Drill } from '../../data/types';

afterEach(cleanup);

// Упражнение вроде «The Wall»: 3 серии, 2 мишени, ношот −20
const drill = (o: Partial<Drill> = {}): Drill => ({
  schemaVersion: 1,
  id: 'x',
  name: { ru: 'X' },
  discipline: ['carbine'],
  source: { origin: 'test', kind: 'classic' },
  tags: [],
  difficulty: 3,
  fireMode: ['live'],
  rounds: 48,
  distance: { min: 5, max: 25, unit: 'm' },
  targets: [{ type: 'ipsc-metric', count: 2 }],
  scoring: {
    type: 'hit-factor',
    points: 5,
    zones: { A: 5, C: 3, D: 1, miss: -10, noShoot: -20 },
    strings: 3,
  },
  goal: { ru: 'x' },
  steps: { ru: ['x'] },
  equipment: [],
  ...o,
});

const text = (sel: string) => document.querySelector(sel)?.textContent ?? '';

test('лист подсчёта: времена серий суммируются, очки и хит-фактор считаются сами', () => {
  render(<HitFactorSheet drill={drill()} />);
  fireEvent.input(screen.getByLabelText('Серия 1, время, с'), { target: { value: '1.25' } });
  fireEvent.input(screen.getByLabelText('Серия 2, время, с'), { target: { value: '1' } });
  fireEvent.input(screen.getByLabelText('Серия 3, время, с'), { target: { value: '0.75' } });
  expect(text('.hfsheet__time')).toContain('3.00'); // общее время

  // строка на каждую мишень, 10 «альф» на первой
  expect(screen.getByLabelText('Мишень 1, зона A')).toBeTruthy();
  expect(screen.getByLabelText('Мишень 2, зона A')).toBeTruthy();
  fireEvent.input(screen.getByLabelText('Мишень 1, зона A'), { target: { value: '10' } });
  expect(text('.hfsheet__points')).toBe('Очки: 50');
  expect(text('.hfsheet__hf')).toBe('Хит-фактор: 16.67'); // 50 / 3
});

test('лист подсчёта: колонка NS есть всегда; без цен упражнения — значения по умолчанию', () => {
  render(<HitFactorSheet drill={drill({ scoring: { type: 'hit-factor', points: 5 } })} />);
  // одна серия — поле называется просто «Время»
  fireEvent.input(screen.getByLabelText('Время, с'), { target: { value: '2' } });
  fireEvent.input(screen.getByLabelText('Мишень 1, зона NS'), { target: { value: '1' } });
  expect(text('.hfsheet__points')).toBe('Очки: -10'); // ношот по умолчанию −10
  expect(text('.hfsheet__hf')).toBe('Хит-фактор: -5.00');
  // цены зон — в полях под таблицей
  expect(price('ношот')).toBe('-10');
});

const price = (zone: string) => (screen.getByLabelText(`Цена: ${zone}`) as HTMLInputElement).value;

test('свои цены зон: вводятся на месте и сразу пересчитывают очки', () => {
  render(<HitFactorSheet drill={drill()} />);
  fireEvent.input(screen.getByLabelText('Мишень 1, зона A'), { target: { value: '10' } });
  expect(text('.hfsheet__points')).toBe('Очки: 50');
  // в бланке упражнения ношот −20 — поле показывает цену бланка, а не общую
  expect(price('ношот')).toBe('-20');

  fireEvent.input(screen.getByLabelText('Цена: A'), { target: { value: '10' } });
  expect(text('.hfsheet__points')).toBe('Очки: 100');
  // штраф — отрицательное число; менять можно и его
  fireEvent.input(screen.getByLabelText('Цена: ношот'), { target: { value: '-25' } });
  fireEvent.input(screen.getByLabelText('Мишень 1, зона NS'), { target: { value: '1' } });
  expect(text('.hfsheet__points')).toBe('Очки: 75');
});
