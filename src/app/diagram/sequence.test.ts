import { test, expect } from 'vitest';
import {
  computeTimeline,
  stateAt,
  stepStates,
  STEP_DURATIONS,
} from './sequence';
import type { SequenceStep } from '../../data/types';

// Из seed Билл Дрилла: engage T1 ×2, move P1→P2, reload, engage T2 ×5
const sequence: SequenceStep[] = [
  { action: 'engage', target: 'T1', shots: 2 },
  { action: 'move', from: 'P1', to: 'P2' },
  { action: 'reload' },
  { action: 'engage', target: 'T2', shots: 5 },
];

test('таймлайн: длительности и старты арифметически верны', () => {
  const tl = computeTimeline(sequence);
  // engage×2 = 1200 + 400*2 = 2000; move = 1800; reload = 2200; engage×5 = 1200 + 400*5 = 3200
  const step = (i: number) => {
    const s = tl.steps[i];
    if (!s) throw new Error(`нет шага #${i}`);
    return s;
  };
  const a = step(0);
  const b = step(1);
  const c = step(2);
  const d = step(3);
  expect(a.start).toBe(0);
  expect(a.duration).toBe(STEP_DURATIONS.engageBase + 2 * STEP_DURATIONS.engagePerShot);
  expect(b.start).toBe(2000);
  expect(b.duration).toBe(1800);
  expect(c.start).toBe(3800);
  expect(c.duration).toBe(2200);
  expect(d.start).toBe(6000);
  expect(d.duration).toBe(3200);
  expect(tl.total).toBe(9200);
});

test('stateAt внутри engage: активная мишень и счёт выстрелов', () => {
  const tl = computeTimeline(sequence);
  const st = stateAt(tl, 1000); // середина первого engage (2 выстрела за 2000 мс)
  expect(st.phase).toBe('playing');
  expect(st.activeTarget).toBe('T1');
  expect(st.shotsDone.T1).toBe(1);
});

test('stateAt: повторный engage той же мишени накапливает счётчик', () => {
  // el presidente-паттерн: T1 ×2, затем снова T1 ×2
  const tl = computeTimeline([
    { action: 'engage', target: 'T1', shots: 2 },
    { action: 'engage', target: 'T1', shots: 2 },
  ]);
  const first = 2000; // engage×2 = 2000 мс
  const st = stateAt(tl, first + 1000); // середина второй серии: 2 + 1 выстрел
  expect(st.shotsDone.T1).toBe(3);
});

test('stateAt внутри move: интерполяция прогресса', () => {
  const tl = computeTimeline(sequence);
  const st = stateAt(tl, 2000 + 900); // середина move
  expect(st.activeMove?.from).toBe('P1');
  expect(st.activeMove?.to).toBe('P2');
  expect(st.activeMove?.progress).toBeCloseTo(0.5, 5);
  expect(st.activeTarget).toBeUndefined();
});

test('stateAt внутри reload', () => {
  const tl = computeTimeline(sequence);
  const st = stateAt(tl, 4000);
  expect(st.reloading).toBe(true);
  expect(st.shotsDone.T1).toBe(2);
});

test('stateAt за пределами: done, все выстрелы сделаны', () => {
  const tl = computeTimeline(sequence);
  const st = stateAt(tl, 99999);
  expect(st.phase).toBe('done');
  expect(st.shotsDone).toEqual({ T1: 2, T2: 5 });
});

test('stateAt до старта: idle', () => {
  const tl = computeTimeline(sequence);
  const st = stateAt(tl, -1);
  expect(st.phase).toBe('idle');
  expect(st.shotsDone).toEqual({});
});

test('stepStates: по состоянию на шаг, канонические значения', () => {
  const tl = computeTimeline(sequence);
  const states = stepStates(tl);
  expect(states).toHaveLength(4);
  expect(states[0]?.activeTarget).toBe('T1');
  expect(states[0]?.shotsDone.T1).toBe(2);
  expect(states[1]?.activeMove?.progress).toBe(1);
  expect(states[2]?.reloading).toBe(true);
  expect(states[3]?.activeTarget).toBe('T2');
  expect(states[3]?.shotsDone).toEqual({ T1: 2, T2: 5 });
});

test('stateAt со snapMoves: прогресс перемещения только 0 или 1', () => {
  const tl = computeTimeline(sequence);
  const first = stateAt(tl, 2000 + 100, { snapMoves: true }); // начало move
  expect(first.activeMove?.progress).toBe(0);
  const mid = stateAt(tl, 2000 + 900, { snapMoves: true }); // после середины move
  expect(mid.activeMove?.progress).toBe(1);
});
