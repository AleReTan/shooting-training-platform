// Короткий код упражнения для ссылок #/d/<код> (поправка к спеке 2026-11-24).
// Полный адрес #/drill/<id> остаётся рабочим. Код детерминирован по id,
// поэтому ссылки не зависят от порядка упражнений в данных.

import type { Drill } from './types';

const ALPHABET = 36;
const LENGTH = 6;

/** 6 знаков [0-9a-z], устойчив для одного и того же id. */
export function shortId(id: string): string {
  let h = 0x811c9dc5; // FNV-1a, 32 бита
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 0x01000193);
  // shortcut: коллизии ловит тест уникальности; удлинять код нельзя — старые ссылки умрут
  return ((h >>> 0) % ALPHABET ** LENGTH).toString(ALPHABET).padStart(LENGTH, '0');
}

/** id упражнения по короткому коду; совпадений нет — undefined. */
export function byShortId(drills: readonly Pick<Drill, 'id'>[], code: string): string | undefined {
  return drills.find((d) => shortId(d.id) === code)?.id;
}
