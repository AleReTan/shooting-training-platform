// RU первичен, EN — fallback (спека §1, §8).

import type { FireMode, Localized, LocalizedList, ParLevel, SourceKind } from '../data/types';

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

/** Тип источника упражнения (фильтр каталога, группы в select). */
export const SOURCE_KIND_LABELS: Record<SourceKind, string> = {
  classic: 'классика',
  'uspsa-classifier': 'USPSA классифаер',
  'steel-challenge': 'Steel Challenge',
  book: 'книга',
  forum: 'форум',
  adaptation: 'адаптация',
  course: 'курс',
};

/** Русская плюрализация: plural(2, 'фаза', 'фазы', 'фаз'). */
export function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

/** Возвращает ru, иначе en, иначе пустую строку. */
export function localized(field: Localized | undefined): string {
  return field?.ru || field?.en || '';
}

/** Возвращает список ru, иначе en, иначе пустой список. */
export function localizedList(field: LocalizedList | undefined): string[] {
  if (field?.ru?.length) return field.ru;
  return field?.en ?? [];
}
