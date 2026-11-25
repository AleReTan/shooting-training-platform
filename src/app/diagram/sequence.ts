// Проигрыватель упражнения: таймлайн по sequence и состояние на момент t (спека §7).
// Чистые функции; анимация и reduced-motion — в компоненте SequencePlayer.tsx.

import type { SequenceStep } from '../../data/types';
import type { PlaybackState } from './types';

export const STEP_DURATIONS = {
  engageBase: 1200, // мс на серию выстрелов
  engagePerShot: 400, // мс на каждый выстрел
  move: 1800, // мс на перемещение
  reload: 2200, // мс на перезарядку
} as const;

export interface TimelineStep {
  step: SequenceStep;
  start: number; // мс от начала
  duration: number; // мс
}

export interface Timeline {
  steps: TimelineStep[];
  total: number;
}

const idleState = (): PlaybackState => ({
  phase: 'idle',
  reloading: false,
  shotsDone: {},
});

/** Длительность одного шага, мс. */
export function stepDuration(step: SequenceStep): number {
  switch (step.action) {
    case 'engage':
      return STEP_DURATIONS.engageBase + step.shots * STEP_DURATIONS.engagePerShot;
    case 'move':
      // стрельба в движении: каждый выстрел удлиняет переход
      return STEP_DURATIONS.move + moveShots(step) * STEP_DURATIONS.engagePerShot;
    case 'reload':
      return STEP_DURATIONS.reload;
  }
}

const moveShots = (step: Extract<SequenceStep, { action: 'move' }>): number =>
  (step.engage ?? []).reduce((sum, e) => sum + e.shots, 0);

export function computeTimeline(sequence: SequenceStep[]): Timeline {
  let t = 0;
  const steps = sequence.map((step) => {
    const duration = stepDuration(step);
    const entry = { step, start: t, duration };
    t += duration;
    return entry;
  });
  return { steps, total: t };
}

/** Опции состояния на момент t. */
export interface StateAtOpts {
  /** Перемещение стрелка скачком (0/1), без интерполяции — для reduced-motion. */
  snapMoves?: boolean;
}

/** Состояние проигрывания на момент t (мс). shotsDone — завершённые выстрелы. */
export function stateAt(timeline: Timeline, t: number, opts: StateAtOpts = {}): PlaybackState {
  if (t < 0) return idleState();

  const state = idleState();

  for (const { step, start, duration } of timeline.steps) {
    const done = Math.min(duration, Math.max(0, t - start)); // прогресс внутри шага
    if (step.action === 'engage') {
      const progress = duration === 0 ? 1 : done / duration;
      const shotsFired = Math.floor(progress * step.shots + 1e-9);
      state.shotsDone[step.target] = (state.shotsDone[step.target] ?? 0) + shotsFired;
      if (t >= start && t < start + duration) {
        state.phase = 'playing';
        state.activeTarget = step.target;
      }
    } else if (step.action === 'move') {
      const raw = duration === 0 ? 1 : done / duration;
      const active = t >= start && t < start + duration;
      if (step.engage?.length) {
        // выстрелы в движении распределены по переходу равномерно и идут по порядку
        const total = moveShots(step);
        const fired = Math.floor(raw * total + 1e-9); // сколько сделано = индекс идущего
        let left = fired;
        for (const e of step.engage) {
          const n = Math.min(left, e.shots);
          if (n) state.shotsDone[e.target] = (state.shotsDone[e.target] ?? 0) + n;
          left -= n;
        }
        if (active) {
          let i = fired;
          const current = step.engage.find((e) => (i -= e.shots) < 0);
          state.activeTarget = (current ?? step.engage[step.engage.length - 1])?.target;
        }
      }
      if (active) {
        state.phase = 'playing';
        state.activeMove = {
          from: step.from,
          to: step.to,
          progress: opts.snapMoves ? (raw >= 0.5 ? 1 : 0) : raw,
        };
      }
    } else if (step.action === 'reload') {
      if (t >= start && t < start + duration) {
        state.phase = 'playing';
        state.reloading = true;
      }
    }
  }

  if (t >= timeline.total) {
    state.phase = 'done';
    state.activeTarget = undefined;
    state.activeMove = undefined;
    state.reloading = false;
  }

  return state;
}

/** Каноническое состояние каждого шага — для пошагового режима. */
export function stepStates(timeline: Timeline): PlaybackState[] {
  const out: PlaybackState[] = [];
  const carried: Record<string, number> = {};

  for (const { step } of timeline.steps) {
    const state = idleState();
    state.phase = 'playing';
    if (step.action === 'engage') {
      state.activeTarget = step.target;
      carried[step.target] = (carried[step.target] ?? 0) + step.shots;
      state.shotsDone = { ...carried };
    } else if (step.action === 'move') {
      state.activeMove = { from: step.from, to: step.to, progress: 1 };
      for (const e of step.engage ?? []) {
        carried[e.target] = (carried[e.target] ?? 0) + e.shots;
        state.activeTarget = e.target; // в пошаговом режиме подсвечена последняя мишень перехода
      }
      state.shotsDone = { ...carried };
    } else {
      state.reloading = true;
      state.shotsDone = { ...carried };
    }
    out.push(state);
  }

  return out;
}

/** Серия многосерийного упражнения: её шаги и позиции, которых она касается. */
export interface DrillString {
  steps: SequenceStep[];
  positions: Set<string>;
}

const isMove = (s: SequenceStep): s is Extract<SequenceStep, { action: 'move' }> =>
  s.action === 'move';

/** Режет sequence на серии по меткам string. positions — путь стрелка серии:
 *  откуда стартует и куда переходит; остальное на схеме бледнеет. */
export function splitStrings(sequence: SequenceStep[]): DrillString[] {
  const strings: DrillString[] = [];
  // до первого перехода стрелок стоит там, откуда тот начнётся
  let at = sequence.find(isMove)?.from;
  for (const step of sequence) {
    const first = strings.length === 0 || step.string != null;
    if (first) strings.push({ steps: [], positions: new Set() });
    const cur = strings[strings.length - 1];
    if (!cur) continue;
    cur.steps.push(step);
    if (first) {
      // серия с перехода стартует от него; иначе — там, где стоит (at или конец предыдущей)
      at = step.at ?? (isMove(step) ? step.from : at);
      if (at) cur.positions.add(at);
    }
    if (isMove(step)) {
      at = step.to;
      cur.positions.add(step.to);
    }
  }
  return strings;
}
