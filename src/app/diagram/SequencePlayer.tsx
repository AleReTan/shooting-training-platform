// Проигрывание упражнения поверх схемы: Play/Стоп/Шаг.
// prefers-reduced-motion не прячет «Проиграть» (анимация инициирована
// пользователем и несёт информацию) — стрелок просто скачет, а не скользит.

import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Layout } from '../../data/types';
import type { PlaybackState } from './types';
import { LayoutDiagram } from './render';
import { computeTimeline, stateAt, stepStates } from './sequence';

// Планировщик кадра: rAF, а в средах без него (jsdom) — setTimeout.
const nextFrame = (cb: FrameRequestCallback): number =>
  typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame(cb)
    : (setTimeout(() => cb(performance.now()), 50) as unknown as number);

const cancelFrame = (handle: number) => {
  if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(handle);
  else clearTimeout(handle as unknown as ReturnType<typeof setTimeout>);
};

export function SequencePlayer(props: { layout: Layout; reducedMotion?: boolean }) {
  const { layout } = props;
  const timeline = useMemo(() => computeTimeline(layout.sequence ?? []), [layout.sequence]);
  const states = useMemo(() => stepStates(timeline), [timeline]);

  const prefersReduced =
    props.reducedMotion ??
    (typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [stepIndex, setStepIndex] = useState(-1); // пошаговый курсор
  const startRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => () => cancelFrame(rafRef.current), []);

  const stop = () => {
    setPlaying(false);
    cancelFrame(rafRef.current);
    setT(0);
    setStepIndex(-1);
  };

  const play = () => {
    // Паузы нет: каждый запуск — с нуля (иначе после естественного конца
    // первый же кадр считался бы «уже закончилось»).
    setStepIndex(-1);
    setT(0);
    setPlaying(true);
    startRef.current = performance.now();
    const loop = (now: number) => {
      const elapsed = now - startRef.current;
      if (elapsed >= timeline.total) {
        setT(timeline.total);
        setPlaying(false);
        return;
      }
      setT(elapsed);
      rafRef.current = nextFrame(loop);
    };
    rafRef.current = nextFrame(loop);
  };

  const playback: PlaybackState | undefined = playing
    ? stateAt(timeline, t, { snapMoves: prefersReduced })
    : stepIndex >= 0 && stepIndex < states.length
      ? states[stepIndex]
      : undefined;

  return (
    <div class="sequence-player">
      <LayoutDiagram layout={layout} playback={playback} />
      <div class="sequence-player__controls">
        <button type="button" class="btn btn--primary" onClick={playing ? stop : play}>
          {playing ? 'Стоп' : 'Проиграть'}
        </button>
        <button
          type="button"
          class="btn"
          onClick={() => setStepIndex((i) => Math.min(i + 1, states.length - 1))}
        >
          Шаг вперёд
        </button>
        <button
          type="button"
          class="btn"
          onClick={() => setStepIndex((i) => Math.max(i - 1, -1))}
        >
          Шаг назад
        </button>
        <button type="button" class="btn" onClick={stop}>
          Сброс
        </button>
        {stepIndex >= 0 && (
          <span class="sequence-player__counter">
            шаг {stepIndex + 1}/{states.length}
          </span>
        )}
      </div>
    </div>
  );
}
