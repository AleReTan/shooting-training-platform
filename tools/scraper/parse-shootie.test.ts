import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseShootieHtml, uniqueImportId, skippedFileName, extractTargetsFromText } from './parse-shootie';

test('CLI доходит до main(): без аргументов печатает usage и выходит не 0', () => {
  // ловит падения бутстрапа модуля (например __dirname в ESM)
  const r = spawnSync('npx tsx tools/scraper/parse-shootie.ts', {
    shell: true,
    encoding: 'utf-8',
    timeout: 60_000,
  });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  expect(r.status).not.toBe(0);
  expect(out).toContain('Использование');
}, 90_000);

const FIXTURES = join(__dirname, 'fixtures');
const read = (name: string) => readFileSync(join(FIXTURES, name), 'utf-8');

test('страница этапа (Inertia JSON) → Drill с needsReview', () => {
  const res = parseShootieHtml('stage-show.html', read('stage-show.html'));
  const d = res.drill!;
  expect(d.id).toBe('import-shootie-v-drill');
  expect(d.name.ru).toBe('V-Drill');
  expect(d.needsReview).toBe(true);
  expect(d.source).toEqual({
    origin: 'shootie.pro · Камешек',
    kind: 'forum',
    url: 'https://shootie.pro/stages/60',
  });
  expect(d.discipline).toEqual(['carbine']);
  expect(d.rounds).toBe(18);
  expect(d.distance).toEqual({ min: 6, max: 6, unit: 'm' });
  expect(d.difficulty).toBe(4); // «Сложная» → 4
  expect(d.scoring).toEqual({ type: 'none' });
  expect(d.steps.ru[0]).toContain('Мишени расставляются клином');
  expect(d.goal.ru).toBe('V-Drill'); // фоллбек до вычитки
});

test('пистолетный этап → Drill с discipline [pistol-traumatic]', () => {
  const res = parseShootieHtml('stage-pistol.html', read('stage-pistol.html'));
  expect(res.drill?.discipline).toEqual(['pistol-traumatic']);
  expect(res.skipped).toEqual([]);
});

test('ружейный этап → Drill с discipline [shotgun]', () => {
  const res = parseShootieHtml('stage-shotgun.html', read('stage-shotgun.html'));
  expect(res.drill?.discipline).toEqual(['shotgun']);
  expect(res.skipped).toEqual([]);
});

test('смешанное оружие (rifle+pistol) → обе дисциплины сразу', () => {
  const res = parseShootieHtml('stage-mixed.html', read('stage-mixed.html'));
  expect(res.drill?.discipline).toEqual(['carbine', 'pistol-traumatic']);
});

test('страница каталога (Stages/Index) → skipped, не карточка этапа', () => {
  const res = parseShootieHtml('catalog-index.html', read('catalog-index.html'));
  expect(res.drill).toBeNull();
  expect(res.skipped).toHaveLength(1);
  expect(res.skipped[0]?.reason).toBe('страница каталога — не карточка этапа');
});

test('uniqueImportId: коллизия одинаковых названий получает суффикс -2/-3', () => {
  const used = new Set<string>();
  expect(uniqueImportId('Тестовый этап', used)).toBe('import-shootie-testovyj-etap');
  expect(uniqueImportId('Тестовый этап', used)).toBe('import-shootie-testovyj-etap-2');
  expect(uniqueImportId('Тестовый этап', used)).toBe('import-shootie-testovyj-etap-3');
  expect(uniqueImportId('Другой этап', used)).toBe('import-shootie-drugoj-etap');
});

test('skippedFileName: имя дампа без регексп-суффикса (Node basename требует string)', () => {
  expect(skippedFileName('stages-2.html')).toBe('stages-2-untitled');
  expect(skippedFileName('stages-3.htm')).toBe('stages-3-untitled');
});

test('extractTargetsFromText: счёт и тип мишеней из текста описания', () => {
  // разные типы с сохранением порядка первого появления
  expect(extractTargetsFromText('Поражает 5 тарелок и 3 бумажные мишени')).toEqual([
    { type: 'steel-circle', count: 5 },
    { type: 'ipsc-metric', count: 3 },
  ]);
  // «поппер» с двойной «п» (как в текстах shootie), одиночная — тоже
  expect(extractTargetsFromText('4 поппера и 2 попера')).toEqual([
    { type: 'steel-popper', count: 4 },
  ]);
  expect(extractTargetsFromText('14 картонных мишеней')).toEqual([
    { type: 'ipsc-metric', count: 14 },
  ]);
  expect(extractTargetsFromText('4 стальных круга')).toEqual([{ type: 'steel-circle', count: 4 }]);
  expect(extractTargetsFromText('2 листа А4')).toEqual([{ type: 'a4-paper', count: 2 }]);
});

test('extractTargetsFromText: повторное упоминание не раздувает счёт', () => {
  // описания shootie часто повторяют счёт в разных секциях — берём максимум
  expect(extractTargetsFromText('Поразить все 14 мишеней. Дострел 14 мишеней разрешен.')).toEqual([
    { type: 'ipsc-metric', count: 14 },
  ]);
  expect(extractTargetsFromText('3 мишени, потом ещё 6 мишеней')).toEqual([
    { type: 'ipsc-metric', count: 6 },
  ]);
});

test('extractTargetsFromText: не путает выстрелы и метры с мишенями', () => {
  expect(extractTargetsFromText('по 2 выстрела в каждую мишень')).toEqual([]);
  expect(extractTargetsFromText('мишень на 25 м')).toEqual([]);
  expect(extractTargetsFromText('5 метров до попера')).toEqual([]); // число относится к метрам
});

test('extractTargetsFromText: пусто → плейсхолдер остаётся в Drill', () => {
  const res = parseShootieHtml('stage-show.html', read('stage-show.html'));
  expect(res.drill!.targets).toEqual([{ type: 'ipsc-metric', count: 1 }]);
});
