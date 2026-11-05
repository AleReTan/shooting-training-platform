// Избранные упражнения: localStorage, без бэкенда (спека §1 — офлайн-first).

import { useState } from 'preact/hooks';

const KEY = 'shooting-favorites-v1';

/** Загружает список id; битые данные → пустой список. */
export function loadFavorites(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** Сохраняет список id; приватный режим Safari и т.п. — молча. */
export function saveFavorites(ids: string[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // нет хранилища — не критично
  }
}

/** Чистое переключение id в списке. */
export function toggleFavorite(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

/** Избранное в компоненте: [список, переключить]. Перед записью перечитывает
 *  хранилище — соседняя вкладка могла изменить список, её не затираем. */
export function useFavorites(): [string[], (id: string) => void] {
  const [favorites, setFavorites] = useState<string[]>(() => loadFavorites());
  const toggleFav = (id: string) => {
    const next = toggleFavorite(loadFavorites(), id);
    saveFavorites(next);
    setFavorites(next);
  };
  return [favorites, toggleFav];
}
