// CLI: npm run validate:data — читает data/** и валидирует; exit 1 при ошибках.

import { readFileSync, readdirSync } from 'node:fs';
import { validateAll, type FileEntry } from './validate';
import type { Taxonomy } from '../../src/data/types';

const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

const taxonomy = readJson('data/taxonomy.json') as Taxonomy;

const readDir = (dir: string): FileEntry[] =>
  readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort() // стабильный порядок ошибок между запусками
    .map((file) => ({ file, data: readJson(`${dir}/${file}`) }));

const drills = readDir('data/drills');
const courses = readDir('data/courses');

const result = validateAll({ drills, courses }, taxonomy);

if (!result.ok) {
  console.error(`✗ Ошибки данных (${result.errors.length}):\n${result.errors.join('\n')}`);
  process.exit(1);
}

console.log(`✓ Данные валидны: ${drills.length} упражнений, ${courses.length} курсов`);
