// Валидация данных упражнений и курсов — правила из спеки §4, §4.1, §5, §7.
// Чистая функция без побочных эффектов; используется тестами и CLI (CI).

import type { Course, Discipline, Drill, Layout, Taxonomy } from '../../src/data/types';

// Доступные дисциплины (спека §8: MVP был только карабин; расширение —
// решение владельца, shotgun/pistol-traumatic разрешены с 2026-11-05)
const DISCIPLINES = new Set<Discipline>(['carbine', 'shotgun', 'pistol-traumatic']);

export interface FileEntry<T = unknown> {
  file: string; // имя файла, напр. "x-drill.json"
  data: T;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

const TAGS_OF = (taxonomy: Taxonomy) => new Set(taxonomy.tags.map((t) => t.id));

function validateDrill(entry: FileEntry, tagIds: Set<string>, errors: string[]): Drill {
  const { file, data } = entry;
  const d = data as Drill;
  const base = file.replace(/\.json$/, '');

  if (base !== d.id) {
    errors.push(`${file}: имя файла должно совпадать с id ("${d.id}")`);
  }
  if (!d.name?.ru) errors.push(`${file}: пустое name.ru`);
  if (!d.steps?.ru?.length) errors.push(`${file}: пустые steps.ru`);
  if (!d.goal?.ru) errors.push(`${file}: пустой goal.ru`);
  if (!d.source?.origin) errors.push(`${file}: пустой source.origin`);

  for (const tag of d.tags ?? []) {
    if (!tagIds.has(tag)) errors.push(`${file}: тег "${tag}" вне таксономии`);
  }

  if (!Array.isArray(d.discipline) || d.discipline.length === 0) {
    errors.push(`${file}: discipline — непустой список (carbine/shotgun/pistol-traumatic)`);
  } else {
    for (const disc of d.discipline) {
      if (!DISCIPLINES.has(disc)) {
        errors.push(`${file}: неизвестная discipline "${disc}"`);
      }
    }
  }
  if (!Number.isInteger(d.difficulty) || d.difficulty < 1 || d.difficulty > 5) {
    errors.push(`${file}: difficulty должен быть целым 1–5`);
  }
  if (d.distance?.unit !== 'm') errors.push(`${file}: distance.unit должен быть "m"`);
  if (d.distance && d.distance.min > d.distance.max) {
    errors.push(`${file}: distance.min > distance.max`);
  }
  if (d.scoring?.type === 'hit-factor' && d.scoring.points == null) {
    errors.push(`${file}: scoring.type "hit-factor" требует scoring.points`);
  }

  if (d.layout) validateLayout(file, d.layout, errors);

  return d;
}

function validateLayout(file: string, layout: Layout, errors: string[]): void {
  const posIds = new Set(layout.positions.map((p) => p.id));
  const tgtIds = new Set(layout.targets.map((t) => t.id));
  const inBounds = (x: number, y: number) =>
    x >= 0 && x <= layout.width && y >= 0 && y <= layout.depth;

  for (const p of layout.positions) {
    if (!inBounds(p.x, p.y)) errors.push(`${file}: позиция ${p.id} вне габаритов width/depth`);
  }
  for (const t of layout.targets) {
    if (!inBounds(t.x, t.y)) errors.push(`${file}: мишень ${t.id} вне габаритов width/depth`);
  }
  for (const m of layout.movement ?? []) {
    if (!posIds.has(m.from) || !posIds.has(m.to)) {
      errors.push(`${file}: movement ссылается на несуществующую позицию ${m.from}→${m.to}`);
    }
  }
  for (const s of layout.sequence ?? []) {
    if (s.action === 'engage' && !tgtIds.has(s.target)) {
      errors.push(`${file}: sequence ссылается на несуществующую мишень ${s.target}`);
    }
    if (s.action === 'move' && (!posIds.has(s.from) || !posIds.has(s.to))) {
      errors.push(`${file}: sequence ссылается на несуществующую позицию ${s.from}→${s.to}`);
    }
  }
}

export function validateAll(
  files: { drills: FileEntry[]; courses: FileEntry[] },
  taxonomy: Taxonomy,
): ValidationResult {
  const errors: string[] = [];
  const tagIds = TAGS_OF(taxonomy);
  const drillIds = new Set<string>();
  const drills: Drill[] = [];

  for (const entry of files.drills) {
    const d = validateDrill(entry, tagIds, errors);
    if (drillIds.has(d.id)) errors.push(`${entry.file}: дублирующийся id "${d.id}"`);
    drillIds.add(d.id);
    drills.push(d);
  }

  for (const d of drills) {
    for (const r of d.related ?? []) {
      if (!drillIds.has(r)) {
        errors.push(`data/drills/${d.id}.json: related "${r}" не существует`);
      }
    }
  }

  for (const { file, data } of files.courses) {
    const c = data as Course;
    const base = file.replace(/\.json$/, '');
    if (base !== c.id) errors.push(`${file}: имя файла курса должно совпадать с id ("${c.id}")`);
    if (!c.items?.length) errors.push(`${file}: курс пуст (items)`);
    const orders = new Set<number>();
    for (const it of c.items ?? []) {
      if (!drillIds.has(it.drillId)) {
        errors.push(`${file}: drillId "${it.drillId}" не существует`);
      }
      if (orders.has(it.order)) errors.push(`${file}: дублирующийся order ${it.order}`);
      orders.add(it.order);
    }
  }

  return { ok: errors.length === 0, errors };
}
