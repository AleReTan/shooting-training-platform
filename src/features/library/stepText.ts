// Оформление шагов «Выполнения» для чтения с телефона: не сплошной текст,
// а заголовок шага («Серия 1 · метка 5 м», «Старт», «Счёт») и действия построчно.
// Чистая разметка готового текста — данные упражнений не меняются.

/** Шаг с заголовком: серия (до 80 знаков до двоеточия) либо короткая подпись без
 *  «;», скобок и переносов строк, после которой стоит «: ». */
const TITLED = /^(?:(?:Серия|String) \d+[^:\n]{0,80}?|[^:;()\n]{2,24}?): (\S.*)$/;

export interface PresentedStep {
  title?: string;
  lines: string[];
}

// shortcut: «;» в скобках не щадится — в данных упражнений таких нет (проверено 2026-11-25); учесть, если появятся
const splitActions = (text: string): string[] =>
  text.split(';').map((s) => s.trim()).filter(Boolean);

export function presentStep(text: string): PresentedStep {
  const body = TITLED.exec(text)?.[1];
  if (body == null) return { lines: splitActions(text) };
  return { title: text.slice(0, text.length - body.length - 2), lines: splitActions(body) };
}
