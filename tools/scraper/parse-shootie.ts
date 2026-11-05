// Парсер сохранённых страниц shootie.pro/stages (dump-based импорт, Task 17).
// Регексы вместо DOM-парсера: зависимостей минимум. Структура карточки этапа
// зафиксирована по фикстуре fixtures/stages-page.html и описана в README.md;
// при расхождении с реальным дампом структуру правим здесь + в фикстуре.
// Автоматический обход логина запрещён брифом — только файлы, сохранённые
// пользователем из залогиненного браузера.

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Drill, Scoring, TargetSpec } from '../../src/data/types';

export interface SkipRecord {
  file: string;
  id?: string;
  reason: string;
}

export interface ScrapeResult {
  drill: Drill | null; // первый валидный карабинный этап файла
  extraDrills: Drill[]; // остальные валидные этапы того же файла
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

// --- разбор полей карточки ------------------------------------------------

const TARGET_MAP: [RegExp, string][] = [
  [/ipsc\s*metric/i, 'ipsc-metric'],
  [/ipsc\s*classic/i, 'ipsc-classic'],
  [/попер/i, 'steel-popper'],
  [/а4|a4/i, 'a4-paper'],
  [/сталь|стальн|steel/i, 'steel-circle'],
];

function parseTargets(raw: string): TargetSpec[] {
  // "4 × IPSC Metric" → { type: 'ipsc-metric', count: 4 }
  const m = raw.match(/(\d+)\s*[×xX]\s*(.+)/);
  if (!m) return [{ type: 'ipsc-metric', count: 1 }];
  const count = Number(m[1]) || 1;
  const name = (m[2] ?? '').trim();
  const type = TARGET_MAP.find(([re]) => re.test(name))?.[1] ?? 'ipsc-metric';
  return [{ type, count }];
}

function parseDistance(raw: string): { min: number; max: number; unit: 'm' } {
  // "10–25 м" | "25 м" → диапазон или точка
  const range = raw.match(/(\d+)\s*[–—−-]\s*(\d+)/);
  if (range) return { min: Number(range[1]), max: Number(range[2]), unit: 'm' };
  const single = raw.match(/(\d+)/);
  const v = single ? Number(single[1]) : 0;
  return { min: v, max: v, unit: 'm' };
}

function parseScoring(raw: string): Scoring {
  const s = raw.toLowerCase();
  if (s.includes('хит')) return { type: 'hit-factor', points: 5 };
  if (s.includes('пар') || s.includes('время')) return { type: 'par-time' };
  return { type: 'none' };
}

function textAfter(raw: string, marker: string): string {
  const idx = raw.indexOf(marker);
  return idx === -1 ? '' : raw.slice(idx + marker.length).trim();
}

// --- парсинг одного HTML-файла -------------------------------------------

const CARD_RE = /<article class="stage-card"[^>]*data-discipline="([^"]*)"[^>]*>([\s\S]*?)<\/article>/g;

export function parseShootieHtml(file: string, html: string): ScrapeResult {
  const extraDrills: Drill[] = [];
  const skipped: SkipRecord[] = [];
  let drill: Drill | null = null;

  for (const m of html.matchAll(CARD_RE)) {
    const discipline = m[1] ?? '';
    const body = m[2] ?? '';

    const titleM = body.match(/<h2 class="stage-title"[^>]*>(?:\s*<a[^>]*href="([^"]*)"[^>]*>)?([^<]*)/);
    const title = (titleM?.[2] ?? '').trim();
    const url = titleM?.[1] || undefined;

    if (!title) {
      skipped.push({ file, reason: 'блок без заголовка — мусор' });
      continue;
    }

    if (discipline !== 'carbine') {
      skipped.push({
        file,
        id: `import-shootie-${slugify(title)}`,
        reason: `дисциплина ${discipline || '?'} — вне MVP (карабин)`,
      });
      continue;
    }

    const author = body.match(/class="stage-author"[^>]*>\s*Автор:\s*([^<]+)/i)?.[1]?.trim();
    const meta = new Map<string, string>();
    for (const li of body.matchAll(/<li data-key="(\w+)">([^<]*)<\/li>/g)) {
      meta.set(li[1] ?? '', (li[2] ?? '').trim());
    }
    const description =
      body.match(/class="stage-description"[^>]*>([^<]*)/)?.[1]?.trim() ?? '';

    const stepsHtml = body.match(/class="stage-steps"[^>]*>([\s\S]*?)<\/ol>/)?.[1] ?? '';
    const steps = [...stepsHtml.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((s) =>
      (s[1] ?? '').trim(),
    );

    const d: Drill = {
      schemaVersion: 1,
      id: `import-shootie-${slugify(title)}`,
      name: { ru: title },
      discipline: ['carbine'],
      source: {
        origin: author ? `shootie.pro · ${author}` : 'shootie.pro',
        kind: 'forum',
        ...(url ? { url } : {}),
      },
      tags: [], // расставляются вручную при вычитке (Step 6)
      difficulty: 3, // дефолт до вычитки
      fireMode: ['live'],
      rounds: Number(meta.get('rounds')?.match(/\d+/)?.[0] ?? 0),
      distance: parseDistance(meta.get('distance') ?? ''),
      targets: parseTargets(meta.get('targets') ?? ''),
      scoring: parseScoring(meta.get('scoring') ?? ''),
      goal: { ru: textAfter(description, 'Цель упражнения — ') || title },
      steps: { ru: steps.length ? steps : [description || title] },
      equipment: [],
      needsReview: true,
    };

    if (!drill) drill = d;
    else extraDrills.push(d);
  }

  return { drill, extraDrills, skipped };
}

// --- CLI: npm run scrape:shootie -- <dumps-dir> ---------------------------

function main(): void {
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

  const drillsDir = join(__dirname, '../../data/drills');
  const skippedDir = join(__dirname, 'skipped');
  mkdirSync(drillsDir, { recursive: true });
  mkdirSync(skippedDir, { recursive: true });

  const usedDrillIds = new Set<string>();
  const usedSkippedNames = new Set<string>();
  let imported = 0;
  for (const f of files) {
    const res = parseShootieHtml(f, readFileSync(join(dumpsDir, f), 'utf-8'));
    const valid = [res.drill, ...res.extraDrills];
    for (const d of valid) {
      if (!d) continue;
      // id = имя файла (валидатор); коллизия между страницами → суффикс
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
    console.log(`${f}: ${valid.filter(Boolean).length} импортировано, ${res.skipped.length} пропущено`);
  }

  console.log(`\nГотово: ${imported} JSON в data/drills/ (needsReview: true).`);
  console.log('Дальше: npm run validate:data → вычитка тегов → снять needsReview.');
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('parse-shootie.ts')) {
  main();
}
