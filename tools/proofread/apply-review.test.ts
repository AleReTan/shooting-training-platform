import { test, expect } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applyReview, type ReviewDecision } from './apply-review';

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

test('пустое решение (только id) — валидный no-op', () => {
  const dir = mkdtempSync(join(tmpdir(), 'proof-'));
  mkdirSync(dir, { recursive: true });
  mk(dir, 'x-drill');
  const res = applyReview(dir, [{ id: 'x-drill' }]);
  expect(res.errors).toEqual([]);
});
