// Панель таймера: Старт со случайной задержкой, пар-тайм, Wake Lock (спека §8 п.4).

import { useEffect, useRef, useState } from 'preact/hooks';
import type { ParTime } from '../../data/types';
import { PAR_LABELS } from '../../app/i18n';
import { beep, unlockAudio } from './beep';
import { initialTimerState, timerReducer, type TimerPhase } from './timerEngine';

const PHASE_LABELS: Record<TimerPhase, string> = {
  idle: 'готов',
  delay: 'ожидание сигнала…',
  running: 'время идёт',
  par: 'пар-тайм!',
  stopped: 'стоп',
};

type WakeLockSentinel = { release: () => Promise<void> };

/** Запрашивает блокировку экрана; не везде доступна — ошибки молча игнорируются. */
async function acquireWakeLock(): Promise<WakeLockSentinel | null> {
  try {
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<WakeLockSentinel> } };
    return (await nav.wakeLock?.request('screen')) ?? null;
  } catch {
    return null;
  }
}

export function TimerPanel(props: { parTimes?: ParTime[] }) {
  const { parTimes } = props;
  const [state, setState] = useState(initialTimerState);
  const [parSec, setParSec] = useState<number | ''>(parTimes?.[0]?.time ?? '');
  const wakeRef = useRef<WakeLockSentinel | null>(null);
  const prevPhase = useRef<TimerPhase>('idle');

  // Уход со страницы во время работы таймера тоже отпускает лок:
  // иначе экран телефона не гаснет до перезагрузки страницы.
  useEffect(() => {
    return () => {
      wakeRef.current?.release().catch(() => {});
    };
  }, []);

  // Тиканье: только активные фазы; elapsed считается из now − startedAt (движок).
  useEffect(() => {
    if (state.phase !== 'delay' && state.phase !== 'running' && state.phase !== 'par') return;
    const id = setInterval(() => setState((s) => timerReducer(s, { type: 'tick', now: performance.now() })), 100);
    return () => clearInterval(id);
  }, [state.phase]);

  // Сигналы на переходах фаз.
  useEffect(() => {
    if (prevPhase.current !== state.phase) {
      if (state.phase === 'running') beep('start');
      else if (state.phase === 'par') beep('par');
      prevPhase.current = state.phase;
    }
  }, [state.phase]);

  const running = state.phase === 'delay' || state.phase === 'running' || state.phase === 'par';

  const start = () => {
    unlockAudio(); // жест пользователя: без этого iOS молчит при сигнале
    setState((s) =>
      timerReducer(s, {
        type: 'start',
        parMs: parSec === '' ? undefined : parSec * 1000,
        now: performance.now(),
      }),
    );
    prevPhase.current = 'delay';
    wakeRef.current = null;
    void acquireWakeLock().then((lock) => (wakeRef.current = lock));
  };

  const stop = () => {
    beep('stop');
    setState((s) => timerReducer(s, { type: 'stop', now: performance.now() }));
    prevPhase.current = 'stopped';
    wakeRef.current?.release().catch(() => {});
    wakeRef.current = null;
  };

  return (
    <div class="timer">
      <p class="timer__phase" role="status">
        {PHASE_LABELS[state.phase]}
      </p>
      <p class="timer__clock">{(state.elapsed / 1000).toFixed(1)} с</p>

      <div class="timer__controls">
        {running ? (
          <button type="button" class="btn btn--primary timer__stop" onClick={stop}>
            Стоп
          </button>
        ) : (
          <button type="button" class="btn btn--primary timer__start" onClick={start}>
            Старт
          </button>
        )}
      </div>

      <label class="timer__par">
        Пар, с
        <input
          type="number"
          min="0"
          step="0.1"
          value={parSec}
          disabled={running}
          onInput={(e) => {
            const v = (e.target as HTMLInputElement).value;
            if (v === '') {
              setParSec('');
              return;
            }
            // min="0" действует не везде — зажимаем вручную.
            const n = Number(v);
            setParSec(Number.isNaN(n) ? '' : Math.max(0, n));
          }}
        />
      </label>

      {parTimes?.length ? (
        <div class="timer__pars">
          {parTimes.map((p) => (
            <button key={p.level} type="button" class="tag-chip" disabled={running} onClick={() => setParSec(p.time)}>
              {PAR_LABELS[p.level] ?? p.level}: {p.time} с
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
