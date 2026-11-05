import { test, expect } from 'vitest';
import { timerReducer, initialTimerState } from './timerEngine';

// rand=0.5 → задержка 1000 + 0.5*2000 = 2000 мс
const start = (now: number, parMs?: number) =>
  timerReducer(initialTimerState(), { type: 'start', parMs, now }, () => 0.5);

const tick = (s: ReturnType<typeof initialTimerState>, now: number) =>
  timerReducer(s, { type: 'tick', now });

test('задержка старта: rand() фиксирует длительность, 1000 + rand()*2000', () => {
  let s = start(0);
  expect(s.phase).toBe('delay');
  expect(s.elapsed).toBe(0);

  s = tick(s, 1999);
  expect(s.phase).toBe('delay');
  expect(s.elapsed).toBe(0);

  s = tick(s, 2000);
  expect(s.phase).toBe('running');
  expect(s.elapsed).toBe(0);
});

test('running: elapsed строго из now − startedAt, включая прыжок времени на 10 с', () => {
  let s = tick(start(0), 2000); // задержка кончилась
  s = tick(s, 12000); // экран был заблокирован — тика не было 10 с
  expect(s.phase).toBe('running');
  expect(s.elapsed).toBe(10000);
});

test('пар-тайм: parAt достигнут → phase par, счёт продолжает расти', () => {
  let s = start(0, 5000); // пар через 5 с после старта бегущего времени
  s = tick(s, 2000); // running
  s = tick(s, 7000); // startedAt=2000 + 5000 = parAt
  expect(s.phase).toBe('par');
  expect(s.elapsed).toBe(5000);

  s = tick(s, 9000);
  expect(s.phase).toBe('par');
  expect(s.elapsed).toBe(7000);
});

test('стоп из running фиксирует elapsed, из задержки — ноль', () => {
  let s = tick(tick(start(0), 2000), 6000);
  const stopped = timerReducer(s, { type: 'stop', now: 6100 });
  expect(stopped.phase).toBe('stopped');
  expect(stopped.elapsed).toBe(4100);

  const fromDelay = timerReducer(start(0), { type: 'stop', now: 500 });
  expect(fromDelay.phase).toBe('stopped');
  expect(fromDelay.elapsed).toBe(0);
});
