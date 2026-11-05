// Логика обновления PWA (Task 12): чистая, без обращения к браузеру.

/** Показывать ли тост «Доступна новая версия»: только когда новый воркер ждёт активации. */
export function shouldShowUpdate(regWaiting: boolean): boolean {
  return regWaiting;
}
