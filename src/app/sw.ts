// Регистрация сервис-воркера (vite-plugin-pwa, prompt-режим).
// Отдельно от pwa.ts: этот модуль тянет virtual:pwa-register и не тестируется.

import { registerSW } from 'virtual:pwa-register';

/** Регистрирует SW; onNeedRefresh зовётся, когда новый воркер ждёт активации. */
export function registerServiceWorker(
  onNeedRefresh: (applyUpdate: () => void) => void,
): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  // applyUpdate — функция, возвращённая registerSW: активирует ждущий воркер.
  const updateSW = registerSW({
    onNeedRefresh: () => onNeedRefresh(updateSW),
  });
}
