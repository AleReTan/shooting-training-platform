import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseShootieHtml } from './parse-shootie';

const FIXTURES = join(__dirname, 'fixtures');
const FIXTURE_HTML = readFileSync(join(FIXTURES, 'stages-page.html'), 'utf-8');

test('парсит карабинный этап в объект схемы с needsReview', () => {
  const res = parseShootieHtml('stages-page.html', FIXTURE_HTML);

  expect(res.drill).toBeTruthy();
  const d = res.drill!;
  expect(d.id).toBe('import-shootie-testovyj-etap-perenos-ognya');
  expect(d.name.ru).toBe('Тестовый этап: перенос огня');
  expect(d.needsReview).toBe(true);
  expect(d.source).toEqual({
    origin: 'shootie.pro · Иван Петров',
    kind: 'forum',
    url: 'https://shootie.pro/stages/123',
  });
  expect(d.discipline).toEqual(['carbine']);
  expect(d.scoring).toEqual({ type: 'hit-factor', points: 5 });
  expect(d.distance).toEqual({ min: 10, max: 25, unit: 'm' });
  expect(d.rounds).toBe(24);
  expect(d.targets).toEqual([{ type: 'ipsc-metric', count: 4 }]);
  expect(d.steps.ru).toHaveLength(3);
  // goal = предложение после маркера «Цель упражнения — » в описании
  expect(d.goal.ru).toBe('быстрые переносы между четырьмя мишенями без потери зоны.');
});

test('не-карабинные и безымянные блоки попадают в skipped с причиной', () => {
  const res = parseShootieHtml('stages-page.html', FIXTURE_HTML);

  expect(res.drill).toBeTruthy();
  expect(res.extraDrills).toHaveLength(0);
  expect(res.skipped.length).toBe(2);
  expect(res.skipped.map((s) => s.reason).sort()).toEqual([
    'блок без заголовка — мусор',
    'дисциплина pistol — вне MVP (карабин)',
  ]);
});
