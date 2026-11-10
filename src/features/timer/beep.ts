// Сигналы таймера: два канала.
// Основной — Web Audio: у медиа-элемента на iOS ~0,5 с собственной задержки
// запуска плеера (держатель сессии это не лечит). Но беззвучный режим глушит
// Web Audio; пока играет медиа-элемент (держатель), сессия в режиме
// воспроизведения и переключатель осциллятор не глушит.
// Запасной — <audio> c wav-ассетами: медленнее, но звучит всегда.

import startUrl from './beep-start.wav';
import parUrl from './beep-par.wav';
import stopUrl from './beep-stop.wav';
import keeperUrl from './beep-keeper.wav';

type Kind = 'start' | 'par' | 'stop';

const SRCS: Record<Kind, string> = { start: startUrl, par: parUrl, stop: stopUrl };
const FREQ: Record<Kind, number> = { start: 1200, par: 2400, stop: 600 };
const BEEP_SEC = 0.15; // как у прежних wav-сигналов

let ctx: AudioContext | null = null;

/** Заводит Web Audio-контекст по жесту (вызывается из unlockAudio):
 *  без жеста iOS оставит его suspended навсегда. */
function ensureCtx(): void {
  try {
    const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const AC = w.AudioContext ?? w.webkitAudioContext;
    if (!AC) return;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
  } catch {
    // нет Web Audio — остаётся медиа-канал
  }
}

/** Синтез сигнала осциллятором — миллисекунды вместо ~0,5 с медиа-плеера. */
function oscBeep(kind: Kind): void {
  const c = ctx!;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'sine';
  osc.frequency.value = FREQ[kind];
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.9, t + 0.005);
  g.gain.setValueAtTime(0.9, t + BEEP_SEC - 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, t + BEEP_SEC);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(t);
  osc.stop(t + BEEP_SEC);
}

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
  ensureCtx();
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
    // Мгновенный путь — только когда контекст жив И держатель играет:
    // без играющего медиа-элемента беззвучный режим заглушит осциллятор.
    if (ctx && ctx.state === 'running' && keeper && !keeper.paused && !keeper.ended) {
      oscBeep(kind);
      return;
    }
  } catch {
    // падаем в медиа-канал
  }
  try {
    const a = ensure()[kind];
    // Seek только если реально ушёл с нуля: на iOS лишний currentTime=0
    // перед play() добавляет задержку синхронизации декодера.
    if (a.currentTime !== 0) a.currentTime = 0;
    void a.play().catch(() => {});
  } catch {
    // Нет звука — не критично.
  }
}

// iOS усыпляет медиа-тракт за секунды тишины и будит его ~0,7 с. Почти
// цифровой ноль (±1/32767) iOS тишиной считает и тракт всё равно гасит —
// держит горячим только настоящий шум (порог — в beep-keeper.test.ts).
// volume не трогаем: iOS игнорирует свойство, уровень несёт сам файл.
let keeper: HTMLAudioElement | null = null;

/** Держит медиа-канал горячим закольцованным неслышимым шумом. */
export function keepAudioAwake(): void {
  try {
    if (!keeper || !keeper.isConnected) keeper = mk(keeperUrl);
    keeper.loop = true;
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
