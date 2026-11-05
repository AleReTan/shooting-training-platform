// RU первичен, EN — fallback (спека §1, §8).

import type { FireMode, Localized, LocalizedList, ParLevel } from '../data/types';

/** Подписи уровней пар-таймов — одни на карточку упражнения и таймер. */
export const PAR_LABELS: Record<ParLevel, string> = {
  novice: 'новичок',
  intermediate: 'продолжающий',
  advanced: 'продвинутый',
  master: 'мастер',
};

/** Тип тренировки, единственное число (карточка упражнения). */
export const FIRE_LABELS: Record<FireMode, string> = {
  live: 'огневая',
  dry: 'холостая',
};

/** Тип тренировки, множественное число (фильтр каталога). */
export const FIRE_LABELS_PLURAL: Record<FireMode, string> = {
  live: 'огневые',
  dry: 'холостые',
};

/** Возвращает ru, иначе en, иначе пустую строку. */
export function localized(field: Localized | undefined): string {
  return field?.ru || field?.en || '';
}

/** Возвращает список ru, иначе en, иначе пустой список. */
export function localizedList(field: LocalizedList | undefined): string[] {
  if (field?.ru?.length) return field.ru;
  return field?.en ?? [];
}
