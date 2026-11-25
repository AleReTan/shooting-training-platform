// Проигрывание упражнения поверх схемы: серии → Проиграть/Стоп (пауза)/Шаг/Сброс.
// Многосерийное упражнение играется по одной серии — переключателем над схемой;
// позиции и линии других серий бледнеют. Упражнение целиком шло бы минуту
// (The Wall — 26 шагов), и посмотреть порядок одной серии было нельзя.
// prefers-reduced-motion не прячет «Проиграть» (анимация инициирована
// пользователем и несёт информацию) — стрелок просто скачет, а не скользит.

import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Layout, SequenceStep } from '../../data/types';
import type { PlaybackState } from './types';
import { localized } from '../i18n';
import { Segmented } from '../../ui/Segmented';
import { LayoutDiagram } from './render';
import { computeTimeline, stateAt, stepStates, splitStrings } from './sequence';

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
  const strings = useMemo(() => splitStrings(layout.sequence ?? []), [layout.sequence]);
  const [picked, setPicked] = useState(0);
  const reducedMotion =
    props.reducedMotion ??
    (typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const idx = Math.min(picked, strings.length - 1);
  const str = strings[idx];
  const multi = strings.length > 1;

  return (
    <div class="sequence-player">
      {multi && (
        <p class="sequence-player__strings">
          Серия
          <Segmented
            ariaLabel="Серия"
            value={idx}
            options={strings.map((_, i) => ({ value: i, label: String(i + 1) }))}
            onChange={setPicked}
          />
        </p>
      )}
      {/* key: другая серия — с начала. Без позиций серии (нет переходов и at) ничего не бледнеет */}
      <StringPlayer
        key={idx}
        layout={layout}
        steps={str?.steps ?? []}
        focus={multi && str?.positions.size ? str.positions : undefined}
        reducedMotion={reducedMotion}
      />
    </div>
  );
}

/** Одна серия: таймлайн по её шагам, кнопки проигрывания — те же. */
function StringPlayer(props: {
  layout: Layout;
  steps: SequenceStep[];
  focus?: ReadonlySet<string>;
  reducedMotion: boolean;
}) {
  const { layout, steps, focus, reducedMotion } = props;
  const timeline = useMemo(() => computeTimeline(steps), [steps]);
  const states = useMemo(() => stepStates(timeline), [timeline]);

  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [stepIndex, setStepIndex] = useState(-1); // пошаговый курсор
  const startRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => () => cancelFrame(rafRef.current), []);

  // пауза — только посреди таймлайна: после конца или сброса t стоит на краю
  const paused = !playing && t > 0 && t < timeline.total;
  const resume = paused && stepIndex < 0; // на паузе, а не на выбранном шаге

  const stop = () => {
    setPlaying(false);
    cancelFrame(rafRef.current);
  };

  const reset = () => {
    stop();
    setT(0);
    setStepIndex(-1);
  };

  const play = () => {
    // старт — то, что на экране: пауза — с места, шаг — с начала шага, иначе с нуля.
    // После естественного конца тоже с нуля: иначе первый же кадр считался бы
    // «уже закончилось».
    const from = stepIndex >= 0 ? (timeline.steps[stepIndex]?.start ?? 0) : resume ? t : 0;
    setStepIndex(-1);
    setT(from);
    setPlaying(true);
    startRef.current = performance.now() - from;
    const loop = (now: number) => {
      // метка кадра может чуть отставать от performance.now() в обработчике тапа
      const elapsed = Math.max(0, now - startRef.current);
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

  // по часам — пока играем и на паузе (картинка замирает); иначе — выбранный шаг
  const onClock = playing || resume;
  const playback: PlaybackState | undefined = onClock
    ? stateAt(timeline, t, { snapMoves: reducedMotion })
    : states[stepIndex];

  return (
    <>
      <LayoutDiagram layout={layout} playback={playback} focus={focus} />
      {/* Легенда позиций: на схеме только id, расшифровка — здесь */}
      {layout.positions.length > 1 && (
        <ul class="sequence-player__legend">
          {layout.positions
            .filter((p) => !focus || focus.has(p.id))
            .map((p) => (
              <li key={p.id}>
                <b>{p.id}</b>
                {p.label ? ` — ${localized(p.label)}` : ''}
              </li>
            ))}
        </ul>
      )}
      {states.length > 0 && (
        <div class="sequence-player__controls">
          <button type="button" class="btn btn--primary" onClick={playing ? stop : play}>
            {playing ? 'Стоп' : resume ? 'Продолжить' : 'Проиграть'}
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
          <button type="button" class="btn" onClick={reset}>
            Сброс
          </button>
          {stepIndex >= 0 && (
            <span class="sequence-player__counter">
              шаг {stepIndex + 1}/{states.length}
            </span>
          )}
        </div>
      )}
    </>
  );
}
