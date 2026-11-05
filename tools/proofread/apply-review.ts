// Применяет решения вычитки (теги, цель, скоринг, needsReview) к import-файлам.
// Решения живут в tools/proofread/decisions/*.jsonl — это аудиторский след
// ручной вычитки: одна строка = одно упражнение (Task 17 Step 6).

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import taxonomyJson from '../../data/taxonomy.json';
import type { Taxonomy } from '../../src/data/types';

const taxonomy = taxonomyJson as Taxonomy;
const TAG_IDS = new Set(taxonomy.tags.map((t) => t.id));

/** Решение по одному упражнению; отсутствующие поля не меняются. */
export interface ReviewDecision {
  id: string;
  tags?: string[];
  goalRu?: string;
  scoring?: { type: 'par-time' | 'hit-factor' | 'points' | 'none'; points?: number };
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
    const file = join(drillsDir, `${d.id}.json`);
    if (!existsSync(file)) {
      errors.push(`${d.id}: файла нет`);
      continue;
    }
    for (const tag of d.tags ?? []) {
      if (!TAG_IDS.has(tag)) errors.push(`${d.id}: тег "${tag}" вне таксономии`);
    }
    if (errors.length) continue; // не портим файл при ошибочных решениях

    const drill = JSON.parse(readFileSync(file, 'utf-8'));
    if (d.tags) drill.tags = d.tags;
    if (d.goalRu) drill.goal = { ru: d.goalRu };
    if (d.scoring) drill.scoring = d.scoring;
    if (d.targets) drill.targets = d.targets;
    if (d.needsReview != null) drill.needsReview = d.needsReview;
    writeFileSync(file, JSON.stringify(drill, null, 2) + '\n');
    applied++;
  }

  return { applied, errors };
}

// --- CLI: npm run proofread:apply -- decisions/batch-01.jsonl ---------------

function main(): void {
  const input = process.argv[2];
  if (!input) {
    console.error('Использование: npm run proofread:apply -- tools/proofread/decisions/<batch>.jsonl');
    process.exit(1);
  }
  const decisions = readFileSync(input, 'utf-8')
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as ReviewDecision);
  const here = dirname(fileURLToPath(import.meta.url)); // ESM: __dirname нет
  const res = applyReview(join(here, '../../data/drills'), decisions);
  for (const e of res.errors) console.error(e);
  console.log(`Применено: ${res.applied}, ошибок: ${res.errors.length}`);
  if (res.errors.length) process.exit(1);
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('apply-review.ts')) {
  main();
}
