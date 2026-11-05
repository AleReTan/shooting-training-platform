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
      return STEP_DURATIONS.move;
    case 'reload':
      return STEP_DURATIONS.reload;
  }
}

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

/** Состояние проигрывания на момент t (мс). shotsDone — завершённые выстрелы. */
export function stateAt(timeline: Timeline, t: number): PlaybackState {
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
        // счётчик внутри шага — только завершённые выстрела этого шага
        state.shotsDone[step.target] = shotsFired;
      }
    } else if (step.action === 'move') {
      if (t >= start && t < start + duration) {
        state.phase = 'playing';
        state.activeMove = {
          from: step.from,
          to: step.to,
          progress: duration === 0 ? 1 : done / duration,
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
      state.shotsDone = { ...carried };
    } else {
      state.reloading = true;
      state.shotsDone = { ...carried };
    }
    out.push(state);
  }

  return out;
}

/** Разрешено ли автопроигрывание (prefers-reduced-motion — только шаги). */
export function allowsAutoplay(prefersReducedMotion: { matches: boolean }): boolean {
  return !prefersReducedMotion.matches;
}
