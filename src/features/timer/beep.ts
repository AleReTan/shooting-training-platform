// Сигналы таймера: Web Audio, без ассетов (спека §8 п.4).
// Тонкая обёртка — ошибки звука не должны ломать таймер.

let ctx: AudioContext | null = null;

const FREQS: Record<'start' | 'par' | 'stop', number> = {
  start: 1200,
  par: 2400,
  stop: 600,
};

/** Короткий бип 150 мс: старт 1200 Гц, пар 2400 Гц, стоп 600 Гц. */
export function beep(kind: 'start' | 'par' | 'stop'): void {
  try {
    const AC: typeof AudioContext | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    if (ctx.state === 'suspended') void ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = FREQS[kind];
    gain.gain.value = 0.15;
    osc.connect(gain);
    gain.connect(ctx.destination);

    const t = ctx.currentTime;
    osc.start(t);
    osc.stop(t + 0.15);
  } catch {
    // Нет звука — не критично.
  }
}
