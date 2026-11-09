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
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // Приложение с рабочего стола iOS часто возобновляется из памяти без
      // перезагрузки страницы — браузер тогда сам не проверяет обновление.
      // Проверяем сами: на возврат в foreground и раз в час.
      const check = () => void registration.update().catch(() => {});
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
      setInterval(check, 60 * 60 * 1000);
    },
  });
}
