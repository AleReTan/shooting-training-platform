// Чистый движок таймера: задержка старта, бегущее время, пар-тайм (спека §8 п.4).
// Время передаётся событиями — редьюсер не ходит в часы, тесты без fake timers.

export type TimerPhase = 'idle' | 'delay' | 'running' | 'par' | 'stopped';

export interface TimerState {
  phase: TimerPhase;
  /** Момент начала бегущего времени (конец задержки), той же шкале, что `now` событий. */
  startedAt?: number;
  /** Абсолютный момент достижения пар-тайма, той же шкале. */
  parAt?: number;
  /** Мс от начала бегущего времени. */
  elapsed: number;
}

export type TimerEvent =
  | { type: 'start'; parMs?: number; now: number }
  | { type: 'stop'; now: number }
  | { type: 'tick'; now: number };

export const DELAY_BASE_MS = 1000;
export const DELAY_SPREAD_MS = 2000;

export function initialTimerState(): TimerState {
  return { phase: 'idle', elapsed: 0 };
}

export function timerReducer(
  state: TimerState,
  ev: TimerEvent,
  rand: () => number = Math.random,
): TimerState {
  switch (ev.type) {
    case 'start': {
      // Случайная задержка 1000–3000 мс: startedAt — момент, когда задержка кончится.
      const delayMs = DELAY_BASE_MS + rand() * DELAY_SPREAD_MS;
      const startedAt = ev.now + delayMs;
      return {
        phase: 'delay',
        startedAt,
        parAt: ev.parMs !== undefined ? startedAt + ev.parMs : undefined,
        elapsed: 0,
      };
    }

    case 'tick': {
      const { phase, startedAt, parAt } = state;
      if (startedAt === undefined) return state;
      if (phase !== 'delay' && phase !== 'running' && phase !== 'par') return state;

      // Прошедшее время — только из now − startedAt: пропущенные кадры не теряются.
      const elapsed = Math.max(0, ev.now - startedAt);

      if (phase === 'delay') {
        if (ev.now < startedAt) return state;
        return { ...state, phase: 'running', elapsed };
      }
      if (phase === 'running' && parAt !== undefined && ev.now >= parAt) {
        return { ...state, phase: 'par', elapsed };
      }
      return { ...state, elapsed };
    }

    case 'stop': {
      if (state.phase === 'idle' || state.phase === 'stopped') return state;
      const elapsed =
        state.phase === 'delay' || state.startedAt === undefined
          ? 0
          : Math.max(0, ev.now - state.startedAt);
      return { ...state, phase: 'stopped', elapsed };
    }
  }
}
