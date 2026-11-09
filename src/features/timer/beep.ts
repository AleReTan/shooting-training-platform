// Сигналы таймера: <audio> с wav-ассетами.
// Web Audio на iPhone глушится переключателем «без звука», медиа-канал
// audio-элемента — нет. Плэй вне жеста требует разблокировки (unlockAudio),
// поэтому элементы живут в документе и переиспользуются: разблокированная
// тройка не должна пересоздаваться перед сигналом.

import startUrl from './beep-start.wav';
import parUrl from './beep-par.wav';
import stopUrl from './beep-stop.wav';
import silenceUrl from './beep-silence.wav';

type Kind = 'start' | 'par' | 'stop';

const SRCS: Record<Kind, string> = { start: startUrl, par: parUrl, stop: stopUrl };

let els: Record<Kind, HTMLAudioElement> | null = null;

function mk(src: string): HTMLAudioElement {
  const a = document.createElement('audio');
  a.src = src;
  a.preload = 'auto';
  // В документе — иначе isConnected всегда false и кэш пересоздаётся,
  // теряя разблокировку жеста.
  document.body.appendChild(a);
  return a;
}

/** Ленивые элементы; пересоздаются, если тесты почистили DOM. */
function ensure(): Record<Kind, HTMLAudioElement> {
  if (els && Object.values(els).every((a) => a.isConnected)) return els;
  els = { start: mk(SRCS.start), par: mk(SRCS.par), stop: mk(SRCS.stop) };
  return els;
}

/** Разблокировка звука по жесту (iOS): без неё play() вне тапа молчит. */
export function unlockAudio(): void {
  try {
    for (const a of Object.values(ensure())) {
      a.muted = true;
      a.play()
        .then(() => {
          a.pause();
          a.currentTime = 0;
          a.muted = false;
        })
        .catch(() => {
          a.muted = false;
        });
    }
  } catch {
    // Нет звука — не критично.
  }
}

/** Короткий сигнал: старт 1200 Гц, пар 2400 Гц, стоп 600 Гц. */
export function beep(kind: Kind): void {
  try {
    const a = ensure()[kind];
    a.currentTime = 0;
    void a.play().catch(() => {});
  } catch {
    // Нет звука — не критично.
  }
}

// iOS усыпляет медиа-тракт за секунды тишины и будит его ~0,7 с: без
// держателя сигнал старта звучал бы заметно позже «время идёт».
let keeper: HTMLAudioElement | null = null;

/** Держит медиа-канал горячим закольцованным неслышимым треком (±1/32767,
 * не цифровой ноль — абсолютную тишину iOS может не считать звуком). */
export function keepAudioAwake(): void {
  try {
    if (!keeper || !keeper.isConnected) keeper = mk(silenceUrl);
    keeper.loop = true;
    keeper.volume = 0.01;
    void keeper.play().catch(() => {});
  } catch {
    // Нет звука — не критично.
  }
}

/** Гасит держатель — на Стопе/уходе со страницы канал больше не нужен. */
export function releaseAudioAwake(): void {
  try {
    keeper?.pause();
  } catch {
    // Нет звука — не критично.
  }
}
