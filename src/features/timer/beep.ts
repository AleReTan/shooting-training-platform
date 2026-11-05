// Сигналы таймера: <audio> с wav-ассетами (спека §8 п.4).
// Web Audio на iPhone глушится переключателем «без звука», медиа-канал
// audio-элемента — нет. Плеи вне жеста требует разблокировки (unlockAudio).

import startUrl from './beep-start.wav';
import parUrl from './beep-par.wav';
import stopUrl from './beep-stop.wav';

type Kind = 'start' | 'par' | 'stop';

const SRCS: Record<Kind, string> = { start: startUrl, par: parUrl, stop: stopUrl };

let els: Record<Kind, HTMLAudioElement> | null = null;

function mk(src: string): HTMLAudioElement {
  const a = document.createElement('audio');
  a.src = src;
  a.preload = 'auto';
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
