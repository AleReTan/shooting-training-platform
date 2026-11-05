// Парсер сохранённых страниц shootie.pro/stages (dump-based импорт, Task 17).
// Формат: Laravel + Inertia — данные страницы в <script data-page="app"
// type="application/json">. Дампы собирает пользователь из залогиненного
// браузера (или одноразовым авторизованным обходом по явной просьбе);
// автоматический обход логина сам по себе запрещён брифом.
// Структура зафиксирована по реальным страницам (fixtures/*.html).

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Discipline, Drill, TargetSpec } from '../../src/data/types';

export interface SkipRecord {
  file: string;
  id?: string;
  reason: string;
}

export interface ScrapeResult {
  drill: Drill | null; // этап страницы (Stages/Show) или null
  extraDrills: Drill[]; // зарезервировано: несколько этапов в одном файле
  skipped: SkipRecord[];
}

// --- транслитерация для kebab-case id -----------------------------------

const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'j', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

export function slugify(ru: string): string {
  return ru
    .toLowerCase()
    .split('')
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** id для записи; один и тот же этап на двух страницах пагинации получает -2/-3. */
export function uniqueImportId(title: string, used: Set<string>): string {
  const base = `import-shootie-${slugify(title)}`;
  let id = base;
  for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
  used.add(id);
  return id;
}

/** Имя skipped-файла для безымянного блока: расширение срезаем регекспом
 *  (path.basename принимает только string-суффикс). */
export function skippedFileName(file: string): string {
  return `${file.replace(/\.html?$/i, '')}-untitled`;
}

// --- разбор Inertia-страницы ---------------------------------------------

interface InertiaStage {
  id: number;
  title: string;
  descriptionHtml?: string | null;
  sections?: { title?: string; descriptionHtml?: string | null }[] | null;
  weaponTypes?: { value: string; label: string }[] | null;
  params?: {
    shotsCount?: number | null;
    distance?: number | null;
    difficulty?: string | null;
  } | null;
  author?: { name?: string } | null;
}

/** HTML-фрагмент (Tiptap) → читаемый текст с переносами строк. */
function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// «Лёгкая» → 2, «Средняя» → 3, «Сложная» → 4; остальное/нет → 3 до вычитки
const DIFFICULTY: Record<string, 1 | 2 | 3 | 4 | 5> = {
  'Лёгкая': 2,
  'Средняя': 3,
  'Сложная': 4,
};

// Тип оружия shootie → дисциплина приложения. Смешанные этапы дают
// несколько дисциплин (упражнение доступно в обоих фильтрах каталога).
const WEAPON_MAP: Record<string, Discipline> = {
  rifle: 'carbine',
  pistol: 'pistol-traumatic',
  shotgun: 'shotgun',
};

// --- мишени из текста описания --------------------------------------------

const TARGET_RE =
  /(\d+)\s*(?:шт\.?\s*)?(?:(лист[а-яё]*\s+)?а4|попп?ер[а-яё]*|тарел[а-яё]*|стальн[а-яё]*|круг[а-яё]*|картонн[а-яё]*|бумажн[а-яё]*|метрическ[а-яё]*|классическ[а-яё]*|ipsc|мишен[а-яё]*)/gi;

function targetKind(match: string): string {
  if (/а4/i.test(match)) return 'a4-paper';
  if (/попп?ер/i.test(match)) return 'steel-popper';
  if (/тарел|стальн|круг/i.test(match)) return 'steel-circle';
  return 'ipsc-metric'; // картонн/бумажн/метрическ/классическ/ipsc/мишен
}

/** Счёт и тип мишеней из текста описания («5 тарелок и 3 бумажные мишени»).
 *  Число должно стоять сразу перед словом — «по 2 выстрела в мишень»
 *  не считается. Повторные упоминания того же типа не суммируются:
 *  описания shootie часто повторяют счёт в разных секциях — берём максимум. */
export function extractTargetsFromText(text: string): TargetSpec[] {
  const byType = new Map<string, number>();
  for (const m of text.matchAll(TARGET_RE)) {
    const count = Number(m[1]);
    const kind = targetKind(m[0]);
    byType.set(kind, Math.max(byType.get(kind) ?? 0, count));
  }
  return [...byType].map(([type, count]) => ({ type, count }));
}

const INERTIA_RE = /<script data-page="app" type="application\/json">([\s\S]*?)<\/script>/;

export function parseShootieHtml(file: string, html: string): ScrapeResult {
  const m = html.match(INERTIA_RE);
  if (!m) {
    return { drill: null, extraDrills: [], skipped: [{ file, reason: 'нет Inertia-данных (data-page)' }] };
  }

  let stage: InertiaStage | undefined;
  let component = '';
  try {
    const page = JSON.parse(m[1] ?? '') as { component?: string; props?: { stage?: InertiaStage } };
    component = page.component ?? '';
    stage = page.props?.stage;
  } catch {
    return { drill: null, extraDrills: [], skipped: [{ file, reason: 'битый JSON data-page' }] };
  }

  if (component !== 'Stages/Show' || !stage) {
    return {
      drill: null,
      extraDrills: [],
      skipped: [{ file, reason: 'страница каталога — не карточка этапа' }],
    };
  }

  const title = stage.title?.trim() ?? '';
  if (!title) {
    return { drill: null, extraDrills: [], skipped: [{ file, reason: 'этап без названия' }] };
  }

  // оружие → дисциплины; неизвестный тип оружия → skip (разбирается вручную)
  const weapons = new Set((stage.weaponTypes ?? []).map((w) => w.value));
  const unknown = [...weapons].filter((w) => !(w in WEAPON_MAP));
  if (unknown.length > 0) {
    return {
      drill: null,
      extraDrills: [],
      skipped: [
        {
          file,
          id: `import-shootie-${slugify(title)}`,
          reason: `неизвестный тип оружия ${unknown.sort().join('/')} — проверить вручную`,
        },
      ],
    };
  }
  // пустой weaponTypes → ['carbine'] (как в MVP); смешанные → все дисциплины
  const discipline: Discipline[] =
    weapons.size > 0
      ? [...new Set([...weapons].map((w) => WEAPON_MAP[w] ?? 'carbine'))].sort()
      : ['carbine'];

  const description = htmlToText(stage.descriptionHtml ?? '');
  const sectionTexts = (stage.sections ?? [])
    .map((s) => htmlToText(s.descriptionHtml ?? ''))
    .filter(Boolean);
  const steps = sectionTexts.length ? sectionTexts : description ? [description] : [title];

  const v = typeof stage.params?.distance === 'number' ? stage.params.distance : 0;
  const difficulty = DIFFICULTY[stage.params?.difficulty ?? ''] ?? 3;
  const extractedTargets = extractTargetsFromText(steps.join('\n'));

  const drill: Drill = {
    schemaVersion: 1,
    id: `import-shootie-${slugify(title)}`,
    name: { ru: title },
    discipline,
    source: {
      origin: stage.author?.name ? `shootie.pro · ${stage.author.name}` : 'shootie.pro',
      kind: 'forum',
      url: `https://shootie.pro/stages/${stage.id}`,
    },
    tags: [], // расставляются вручную при вычитке (Task 17 Step 6)
    difficulty,
    fireMode: ['live'],
    rounds: typeof stage.params?.shotsCount === 'number' ? stage.params.shotsCount : 0,
    distance: { min: v, max: v, unit: 'm' },
    // структурированных мишеней в источнике нет — извлекаем счёт из текста
    // описания; упоминаний нет → плейсхолдер до вычитки
    targets: extractedTargets.length ? extractedTargets : [{ type: 'ipsc-metric', count: 1 }],
    scoring: { type: 'none' }, // тип скоринга в источнике не указан
    goal: { ru: title }, // фоллбек до вычитки
    steps: { ru: steps },
    equipment: [],
    needsReview: true,
  };

  return { drill, extraDrills: [], skipped: [] };
}

// --- CLI: npm run scrape:shootie -- <dumps-dir> ---------------------------

function main(): void {
  const here = dirname(fileURLToPath(import.meta.url)); // ESM: __dirname нет
  const dumpsDir = process.argv[2];
  if (!dumpsDir) {
    console.error('Использование: npm run scrape:shootie -- <dumps-dir>');
    process.exit(1);
  }

  const files = readdirSync(dumpsDir).filter((f) => /\.html?$/i.test(f)).sort();
  if (!files.length) {
    console.error(`В ${dumpsDir} нет .html/.htm файлов`);
    process.exit(1);
  }

  const drillsDir = join(here, '../../data/drills');
  const skippedDir = join(here, 'skipped');
  mkdirSync(drillsDir, { recursive: true });
  mkdirSync(skippedDir, { recursive: true });

  const usedDrillIds = new Set<string>();
  const usedSkippedNames = new Set<string>();
  let imported = 0;
  for (const f of files) {
    const res = parseShootieHtml(f, readFileSync(join(dumpsDir, f), 'utf-8'));
    const d = res.drill;
    if (d) {
      // id = имя файла (валидатор); коллизия названий → суффикс
      d.id = uniqueImportId(d.name.ru, usedDrillIds);
      writeFileSync(join(drillsDir, `${d.id}.json`), JSON.stringify(d, null, 2) + '\n');
      imported++;
    }
    for (const s of res.skipped) {
      let name = s.id ?? skippedFileName(f);
      while (usedSkippedNames.has(name)) name += '-2';
      usedSkippedNames.add(name);
      writeFileSync(join(skippedDir, `${name}.md`), `# ${s.reason}\n\nИсточник: ${s.file}\n`);
    }
  }

  console.log(`\nГотово: ${imported} JSON в data/drills/ (needsReview: true), skipped в tools/scraper/skipped/.`);
  console.log('Дальше: npm run validate:data → вычитка тегов → снять needsReview.');
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('parse-shootie.ts')) {
  main();
}
