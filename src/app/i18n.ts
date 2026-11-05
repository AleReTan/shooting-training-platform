// RU первичен, EN — fallback (спека §1, §8).

import type { Localized, LocalizedList } from '../data/types';

/** Возвращает ru, иначе en, иначе пустую строку. */
export function localized(field: Localized | undefined): string {
  return field?.ru || field?.en || '';
}

/** Возвращает список ru, иначе en, иначе пустой список. */
export function localizedList(field: LocalizedList | undefined): string[] {
  if (field?.ru?.length) return field.ru;
  return field?.en ?? [];
}
