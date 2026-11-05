// «Тренировка дня»: детерминированный по дате выбор упражнения.

/** Ключ дня вида YYYY-MM-DD. */
export function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Выбор дня: стабильный хеш даты → индекс списка. Пустой список — null. */
export function dailyDrillId(ids: string[], dateKey: string): string | null {
  if (ids.length === 0) return null;
  let h = 0;
  for (const ch of dateKey) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return ids[h % ids.length] ?? null;
}
