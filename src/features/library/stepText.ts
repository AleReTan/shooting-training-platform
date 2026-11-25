// Оформление текстов упражнения для чтения с телефона: не сплошная масса,
// а заголовок и строки. Строки — по переносу автора, «;» и границе предложения.
// Чистая разметка готового текста — данные упражнений не меняются.

export interface PresentedText {
  /** Заголовок до двоеточия: место серии, короткая подпись («Старт», «Счёт»). */
  title?: string;
  /** Номер серии, если текст начинается с «Серия N»; само «Серия N» в title не входит. */
  series?: number;
  lines: string[];
  /** Текст распался на отдельные пункты — по переносу строки или «;». Граница
   *  предложения даёт просто новые строки, без маркеров пункта. */
  listed: boolean;
}

// серия — до 80 знаков до двоеточия в первой строке; подпись — до 24 знаков,
// без «;», скобок и переносов строк, после неё стоит «: »
const SERIES = /^(?:Серия|String) (\d+)([^:\n]{0,80}?): (\S[\s\S]*)$/;
const LABEL = /^([^:;()\n]{2,24}?): (\S[\s\S]*)$/;

// точка после инициала или короткого сокращения («Дж.», «U.S.», «См.»)
const ABBREVIATION = /(?:^|[\s(«".])[А-ЯЁA-Z]{1,3}[а-яёa-z]{0,2}\.$/;

/** Делит по границам предложений: «. », «! », «? » перед заглавной или цифрой.
 *  Инициал («Дж. Купер»), незакрытая скобка и дробь без пробела («4.0+») не рвутся. */
export function splitSentences(text: string): string[] {
  const out: string[] = [];
  let start = 0;
  for (const m of text.matchAll(/(.)([.!?])\s+(?=[A-ZА-ЯЁ0-9«])/g)) {
    const at = m.index ?? 0;
    const chunk = text.slice(start, at + 2);
    const openParen = chunk.split('(').length - chunk.split(')').length;
    if (openParen > 0 || (m[2] === '.' && ABBREVIATION.test(chunk))) continue;
    out.push(chunk);
    start = at + m[0].length;
  }
  out.push(text.slice(start));
  return out;
}

// shortcut: «;» в скобках не щадится — в данных упражнений таких нет (проверено 2026-11-25); учесть, если появятся
function splitRows(text: string): Pick<PresentedText, 'lines' | 'listed'> {
  const rows = text.split(/\r?\n/);
  const parts = rows.flatMap((row) => row.split(';'));
  return {
    listed: rows.length > 1 || parts.length > rows.length,
    lines: parts.flatMap(splitSentences).map((s) => s.trim()).filter(Boolean),
  };
}

/** title: false — заголовок не искать (цель упражнения — связный текст). */
export function presentText(text: string, opts: { title?: boolean } = {}): PresentedText {
  const series = opts.title === false ? null : SERIES.exec(text);
  if (series) {
    const place = (series[2] ?? '').replace(/^[\s·,—-]+/, '');
    return { series: Number(series[1]), title: place || undefined, ...splitRows(series[3] ?? '') };
  }
  const label = opts.title === false ? null : LABEL.exec(text);
  if (label) return { title: label[1], ...splitRows(label[2] ?? '') };
  return splitRows(text);
}
