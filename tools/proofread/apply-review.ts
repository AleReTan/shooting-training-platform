// Применяет решения вычитки (теги, цель, скоринг, needsReview) к import-файлам.
// Решения живут в tools/proofread/decisions/*.jsonl — это аудиторский след
// ручной вычитки: одна строка = одно упражнение (Task 17 Step 6).

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import taxonomyJson from '../../data/taxonomy.json';
import type { ScoringType, Taxonomy } from '../../src/data/types';

const taxonomy = taxonomyJson as Taxonomy;
const TAG_IDS = new Set(taxonomy.tags.map((t) => t.id));
const SCORING_TYPES = new Set<ScoringType>(['par-time', 'hit-factor', 'points', 'none']);

/** Решение по одному упражнению; отсутствующие поля не меняются. */
export interface ReviewDecision {
  id: string;
  tags?: string[];
  goalRu?: string;
  scoring?: { type: ScoringType; points?: number };
  targets?: { type: string; count: number }[];
  needsReview?: boolean;
}

export interface ApplyResult {
  applied: number;
  errors: string[];
}

export function applyReview(drillsDir: string, decisions: ReviewDecision[]): ApplyResult {
  const errors: string[] = [];
  let applied = 0;

  for (const d of decisions) {
    let bad = false;
    // id строит путь к файлу — разделители или «..» выводят запись за пределы drillsDir
    if (/[\\/]|\.\./.test(d.id)) {
      errors.push(`${d.id}: id не должен содержать путь`);
      bad = true;
    }
    if (d.goalRu === '') {
      errors.push(`${d.id}: пустой goalRu`);
      bad = true;
    }
    if (d.targets != null && !Array.isArray(d.targets)) {
      errors.push(`${d.id}: targets — не список`);
      bad = true;
    }
    if (d.scoring != null && !SCORING_TYPES.has(d.scoring.type)) {
      errors.push(`${d.id}: неизвестный scoring.type "${d.scoring.type}"`);
      bad = true;
    }
    for (const tag of d.tags ?? []) {
      if (!TAG_IDS.has(tag)) {
        errors.push(`${d.id}: тег "${tag}" вне таксономии`);
        bad = true;
      }
    }
    if (bad) continue; // это решение пропускаем, следующие — нет

    const file = join(drillsDir, `${d.id}.json`);
    if (!existsSync(file)) {
      errors.push(`${d.id}: файла нет`);
      continue;
    }

    try {
      const drill = JSON.parse(readFileSync(file, 'utf-8'));
      // массив/примитив «применится» без единого поля и пройдёт как успех
      if (!drill || typeof drill !== 'object' || Array.isArray(drill)) {
        throw new Error('файл — не объект упражнения');
      }
      if (d.tags) drill.tags = d.tags;
      if (d.goalRu) drill.goal = { ...drill.goal, ru: d.goalRu };
      if (d.scoring) drill.scoring = d.scoring;
      if (d.targets) drill.targets = d.targets;
      if (d.needsReview != null) drill.needsReview = d.needsReview;
      writeFileSync(file, JSON.stringify(drill, null, 2) + '\n');
      applied++;
    } catch (e) {
      // битый JSON одного файла не должен ронять весь батч
      errors.push(`${d.id}: ${(e as Error).message}`);
    }
  }

  return { applied, errors };
}

/** Строки JSONL по одной: кривая строка — ошибка с номером, не краш батча. */
export function parseDecisions(text: string): { decisions: ReviewDecision[]; errors: string[] } {
  const decisions: ReviewDecision[] = [];
  const errors: string[] = [];
  text.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    try {
      decisions.push(JSON.parse(line) as ReviewDecision);
    } catch (e) {
      errors.push(`строка ${i + 1}: ${(e as Error).message}`);
    }
  });
  return { decisions, errors };
}

// --- CLI: npm run proofread:apply -- decisions/batch-01.jsonl ---------------

function main(): void {
  const input = process.argv[2];
  if (!input) {
    console.error('Использование: npm run proofread:apply -- tools/proofread/decisions/<batch>.jsonl');
    process.exit(1);
  }
  const { decisions, errors: parseErrors } = parseDecisions(readFileSync(input, 'utf-8'));
  for (const e of parseErrors) console.error(e);
  if (parseErrors.length) process.exit(1); // батч валиден целиком или не применяется ничего
  const here = dirname(fileURLToPath(import.meta.url)); // ESM: __dirname нет
  const res = applyReview(join(here, '../../data/drills'), decisions);
  for (const e of res.errors) console.error(e);
  console.log(`Применено: ${res.applied}, ошибок: ${res.errors.length}`);
  if (res.errors.length) process.exit(1);
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('apply-review.ts')) {
  main();
}
