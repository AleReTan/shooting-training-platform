import { test, expect } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applyReview, parseDecisions, type ReviewDecision } from './apply-review';

const mk = (dir: string, id: string, extra: Record<string, unknown> = {}) => {
  writeFileSync(
    join(dir, `${id}.json`),
    JSON.stringify({
      schemaVersion: 1,
      id,
      name: { ru: 'Тест' },
      discipline: ['carbine'],
      source: { origin: 'x', kind: 'forum' },
      tags: [],
      difficulty: 3,
      fireMode: ['live'],
      rounds: 10,
      distance: { min: 5, max: 5, unit: 'm' },
      targets: [{ type: 'ipsc-metric', count: 1 }],
      scoring: { type: 'none' },
      goal: { ru: 'Тест' },
      steps: { ru: ['шаг'] },
      equipment: [],
      needsReview: true,
      ...extra,
    }),
  );
};

test('применяет теги/goal/scoring и снимает needsReview, остальные поля не трогает', () => {
  const dir = mkdtempSync(join(tmpdir(), 'proof-'));
  mk(dir, 'x-drill', { goal: { ru: 'Тест' }, rounds: 10 });
  const d: ReviewDecision[] = [
    { id: 'x-drill', tags: ['speed', 'accuracy'], goalRu: 'Реальная цель из текста', needsReview: false },
  ];
  const res = applyReview(dir, d);
  expect(res.errors).toEqual([]);
  const after = JSON.parse(readFileSync(join(dir, 'x-drill.json'), 'utf-8'));
  expect(after.tags).toEqual(['speed', 'accuracy']);
  expect(after.goal.ru).toBe('Реальная цель из текста');
  expect(after.needsReview).toBe(false);
  expect(after.rounds).toBe(10); // не указано в решении — не меняется
  expect(after.scoring).toEqual({ type: 'none' }); // не указано — не меняется
});

test('неизвестный id и тег вне таксономии — ошибки, файл не портится', () => {
  const dir = mkdtempSync(join(tmpdir(), 'proof-'));
  mk(dir, 'x-drill');
  const res = applyReview(dir, [
    { id: 'ghost' },
    { id: 'x-drill', tags: ['lasers'] },
  ] as ReviewDecision[]);
  expect(res.errors).toHaveLength(2);
  expect(res.errors.join('\n')).toContain('ghost');
  expect(res.errors.join('\n')).toContain('lasers');
  const after = JSON.parse(readFileSync(join(dir, 'x-drill.json'), 'utf-8'));
  expect(after.tags).toEqual([]); // файл не изменился
});

test('ошибка в одном решении не блокирует валидные после него', () => {
  const dir = mkdtempSync(join(tmpdir(), 'proof-'));
  mk(dir, 'x-drill');
  const res = applyReview(dir, [
    { id: 'ghost' },
    { id: 'x-drill', tags: ['speed'], needsReview: false },
  ]);
  expect(res.errors.join('\n')).toContain('ghost');
  expect(res.applied).toBe(1);
  const after = JSON.parse(readFileSync(join(dir, 'x-drill.json'), 'utf-8'));
  expect(after.tags).toEqual(['speed']);
  expect(after.needsReview).toBe(false);
});

test('битый JSON одного файла не роняет батч: валидные до и после применяются', () => {
  const dir = mkdtempSync(join(tmpdir(), 'proof-'));
  mk(dir, 'ok-first');
  mk(dir, 'broken');
  mk(dir, 'ok-last');
  writeFileSync(join(dir, 'broken.json'), '{truncated');
  const res = applyReview(dir, [
    { id: 'ok-first', tags: ['speed'] },
    { id: 'broken', tags: ['speed'] },
    { id: 'ok-last', tags: ['speed'] },
  ]);
  expect(res.errors).toHaveLength(1);
  expect(res.errors.join('\n')).toContain('broken');
  expect(res.applied).toBe(2);
  expect(JSON.parse(readFileSync(join(dir, 'ok-last.json'), 'utf-8')).tags).toEqual(['speed']);
});

test('пустое решение (только id) — валидный no-op', () => {
  const dir = mkdtempSync(join(tmpdir(), 'proof-'));
  mkdirSync(dir, { recursive: true });
  mk(dir, 'x-drill');
  const res = applyReview(dir, [{ id: 'x-drill' }]);
  expect(res.errors).toEqual([]);
});

test('файл-массив вместо объекта — ошибка, «применено» не растёт', () => {
  const dir = mkdtempSync(join(tmpdir(), 'proof-'));
  writeFileSync(join(dir, 'arr.json'), '[{"old":true}]');
  const res = applyReview(dir, [{ id: 'arr', tags: ['speed'], needsReview: false }]);
  expect(res.errors.join('\n')).toContain('arr');
  expect(res.applied).toBe(0);
  expect(readFileSync(join(dir, 'arr.json'), 'utf-8')).toBe('[{"old":true}]');
});

test('goalRu правит только ru, не стирая en-перевод', () => {
  const dir = mkdtempSync(join(tmpdir(), 'proof-'));
  mk(dir, 'x-drill', { goal: { ru: 'старый', en: 'old goal' } });
  const res = applyReview(dir, [{ id: 'x-drill', goalRu: 'новый' }]);
  expect(res.errors).toEqual([]);
  const after = JSON.parse(readFileSync(join(dir, 'x-drill.json'), 'utf-8'));
  expect(after.goal).toEqual({ ru: 'новый', en: 'old goal' });
});

test('id с разделителями пути отклоняется — тул не читает и не пишет вне drillsDir', () => {
  const dir = mkdtempSync(join(tmpdir(), 'proof-'));
  mk(dir, 'x-drill');
  const res = applyReview(dir, [{ id: '../taxonomy', tags: ['speed'] }]);
  expect(res.errors.join('\n')).toContain('путь');
  expect(res.applied).toBe(0);
});

test('кривая форма решения (targets не-список, scoring.type мимо) — ошибка, файл нетронут', () => {
  const dir = mkdtempSync(join(tmpdir(), 'proof-'));
  mk(dir, 'x-drill');
  const res = applyReview(dir, [
    { id: 'x-drill', targets: { type: 'a4-paper', count: 3 } as unknown as ReviewDecision['targets'] },
    { id: 'x-drill', scoring: { type: 'point' as never } },
  ]);
  expect(res.errors).toHaveLength(2);
  expect(res.applied).toBe(0);
  const after = JSON.parse(readFileSync(join(dir, 'x-drill.json'), 'utf-8'));
  expect(after.targets).toEqual([{ type: 'ipsc-metric', count: 1 }]); // нетронут
  expect(after.scoring).toEqual({ type: 'none' });
});

test('пустой goalRu — явная ошибка, а не тихий «успех»', () => {
  const dir = mkdtempSync(join(tmpdir(), 'proof-'));
  mk(dir, 'x-drill');
  const res = applyReview(dir, [{ id: 'x-drill', goalRu: '' }]);
  expect(res.errors.join('\n')).toContain('goalRu');
  expect(res.applied).toBe(0);
  const after = JSON.parse(readFileSync(join(dir, 'x-drill.json'), 'utf-8'));
  expect(after.goal.ru).toBe('Тест'); // нетронут
});

test('parseDecisions: кривая строка — в ошибки с номером, валидные строки парсятся', () => {
  const { decisions, errors } = parseDecisions('{"id":"a"}\n{broken\n\n{"id":"b"}');
  expect(decisions.map((d) => d.id)).toEqual(['a', 'b']);
  expect(errors).toHaveLength(1);
  expect(errors[0]).toContain('строка 2');
});
