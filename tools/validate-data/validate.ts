// Валидация данных упражнений и курсов — правила из спеки §4, §4.1, §5, §7.
// Чистая функция без побочных эффектов; используется тестами и CLI (CI).

import type { Course, Discipline, Drill, FireMode, Layout, ParLevel, ScoringType, Taxonomy } from '../../src/data/types';

// Доступные дисциплины (спека §8: MVP был только карабин; расширение —
// решение владельца, shotgun/pistol-traumatic разрешены с 2026-11-05)
const DISCIPLINES = new Set<Discipline>(['carbine', 'shotgun', 'pistol-traumatic']);

const FIRE_MODES = new Set<FireMode>(['live', 'dry']);

export interface FileEntry<T = unknown> {
  file: string; // имя файла, напр. "x-drill.json"
  data: T;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

const TAGS_OF = (taxonomy: Taxonomy) => new Set(taxonomy.tags.map((t) => t.id));

const TARGET_TYPES_OF = (taxonomy: Taxonomy) => new Set(taxonomy.targetTypes.map((t) => t.id));

const SCORING_TYPES = new Set<ScoringType>(['par-time', 'hit-factor', 'points', 'none']);

const PAR_LEVELS = new Set<ParLevel>(['novice', 'intermediate', 'advanced', 'master']);

/** Объект-запись: не null, не массив, не примитив. */
const isRecord = (v: unknown): boolean => !!v && typeof v === 'object' && !Array.isArray(v);

/** Не-массив вместо списка — не краш итерации, а пустой список + ошибка поля. */
const expectList = <T,>(
  file: string,
  field: string,
  v: readonly T[] | undefined | null,
  errors: string[],
): T[] => {
  if (v != null && !Array.isArray(v)) errors.push(`${file}: ${field} — не список`);
  return Array.isArray(v) ? (v as T[]) : ([] as T[]);
};

function validateDrill(
  entry: FileEntry,
  tagIds: Set<string>,
  targetTypeIds: Set<string>,
  errors: string[],
): Drill | null {
  const { file, data } = entry;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    errors.push(`${file}: содержимое — не объект`);
    return null;
  }
  const d = data as Drill;
  const base = file.replace(/\.json$/, '');

  if (base !== d.id) {
    errors.push(`${file}: имя файла должно совпадать с id ("${d.id}")`);
  }
  if (!d.name?.ru) errors.push(`${file}: пустое name.ru`);
  if (!d.steps?.ru?.length) errors.push(`${file}: пустые steps.ru`);
  if (!d.goal?.ru) errors.push(`${file}: пустой goal.ru`);
  if (!d.source?.origin) errors.push(`${file}: пустой source.origin`);

  for (const tag of expectList(file, 'tags', d.tags, errors)) {
    if (!tagIds.has(tag)) errors.push(`${file}: тег "${tag}" вне таксономии`);
  }
  for (const t of expectList(file, 'targets', d.targets, errors)) {
    if (!isRecord(t)) {
      errors.push(`${file}: targets содержит не-объект`);
      continue;
    }
    if (!targetTypeIds.has(t.type)) errors.push(`${file}: тип мишени "${t.type}" вне таксономии`);
    if (!Number.isInteger(t.count) || t.count < 1) {
      errors.push(`${file}: targets.count у "${t.type}" должен быть целым ≥ 1`);
    }
  }
  for (const p of expectList(file, 'parTimes', d.parTimes, errors)) {
    if (!isRecord(p)) {
      errors.push(`${file}: parTimes содержит не-объект`);
      continue;
    }
    if (!PAR_LEVELS.has(p.level)) {
      errors.push(`${file}: неизвестный уровень пар-тайма "${p.level}"`);
    }
    if (typeof p.time !== 'number' || !Number.isFinite(p.time) || p.time <= 0) {
      errors.push(`${file}: parTimes.time у "${p.level}" должен быть числом > 0`);
    }
  }
  if (d.scoring != null && !isRecord(d.scoring)) {
    errors.push(`${file}: scoring — не объект`);
  } else if (d.scoring && !SCORING_TYPES.has(d.scoring.type)) {
    errors.push(`${file}: неизвестный scoring.type "${d.scoring.type}"`);
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
  if (!Array.isArray(d.fireMode) || d.fireMode.length === 0) {
    errors.push(`${file}: fireMode — непустой список (live/dry)`);
  } else {
    for (const m of d.fireMode) {
      if (!FIRE_MODES.has(m)) errors.push(`${file}: неизвестный fireMode "${m}"`);
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

  if (d.layout) validateLayout(file, d.layout, targetTypeIds, errors);

  return d;
}

function validateLayout(
  file: string,
  layout: Layout,
  targetTypeIds: Set<string>,
  errors: string[],
): void {
  if (!isRecord(layout)) {
    errors.push(`${file}: layout — не объект`);
    return;
  }

  const positions = expectList(file, 'layout.positions', layout.positions, errors);
  const targets = expectList(file, 'layout.targets', layout.targets, errors);

  // Схема с мишенями обязана иметь позиции: render.tsx ищет ближайшую
  // позицию к мишени и падает на пустом списке.
  if (targets.length > 0 && positions.length === 0) {
    errors.push(`${file}: layout с мишенями требует хотя бы одну позицию (positions)`);
  }

  if (layout.realDepth != null && (typeof layout.realDepth !== 'number' || layout.realDepth <= 0)) {
    errors.push(`${file}: layout.realDepth должен быть положительным числом`);
  }

  const inBounds = (x: number, y: number) =>
    x >= 0 && x <= layout.width && y >= 0 && y <= layout.depth;

  const posIds = new Set<string>();
  for (const p of positions) {
    if (!isRecord(p)) {
      errors.push(`${file}: layout.positions содержит не-объект`);
      continue;
    }
    posIds.add(p.id);
    if (!inBounds(p.x, p.y)) errors.push(`${file}: позиция ${p.id} вне габаритов width/depth`);
  }
  const tgtIds = new Set<string>();
  for (const t of targets) {
    if (!isRecord(t)) {
      errors.push(`${file}: layout.targets содержит не-объект`);
      continue;
    }
    tgtIds.add(t.id);
    if (!inBounds(t.x, t.y)) errors.push(`${file}: мишень ${t.id} вне габаритов width/depth`);
    if (t.distance != null && (typeof t.distance !== 'number' || t.distance <= 0)) {
      errors.push(`${file}: target.distance мишени ${t.id} должен быть положительным числом`);
    }
    if (!targetTypeIds.has(t.type)) {
      errors.push(`${file}: тип мишени "${t.type}" мишени ${t.id} вне таксономии`);
    }
  }
  for (const m of expectList(file, 'layout.movement', layout.movement, errors)) {
    if (!isRecord(m)) {
      errors.push(`${file}: layout.movement содержит не-объект`);
      continue;
    }
    if (!posIds.has(m.from) || !posIds.has(m.to)) {
      errors.push(`${file}: movement ссылается на несуществующую позицию ${m.from}→${m.to}`);
    }
    if (m.distance != null && (typeof m.distance !== 'number' || m.distance <= 0)) {
      errors.push(`${file}: movement.distance ${m.from}→${m.to} должен быть положительным числом`);
    }
  }
  for (const s of expectList(file, 'layout.sequence', layout.sequence, errors)) {
    if (!isRecord(s)) {
      errors.push(`${file}: layout.sequence содержит не-объект`);
      continue;
    }
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
  const targetTypeIds = TARGET_TYPES_OF(taxonomy);
  const drillIds = new Set<string>();
  const drills: Drill[] = [];

  for (const entry of files.drills) {
    const d = validateDrill(entry, tagIds, targetTypeIds, errors);
    if (!d) continue;
    if (drillIds.has(d.id)) errors.push(`${entry.file}: дублирующийся id "${d.id}"`);
    drillIds.add(d.id);
    drills.push(d);
  }

  for (const d of drills) {
    for (const r of expectList(`data/drills/${d.id}.json`, 'related', d.related, errors)) {
      if (!drillIds.has(r)) {
        errors.push(`data/drills/${d.id}.json: related "${r}" не существует`);
      }
    }
  }

  for (const { file, data } of files.courses) {
    const c = data as Course;
    const base = file.replace(/\.json$/, '');
    if (!isRecord(c)) {
      errors.push(`${file}: содержимое — не объект`);
      continue;
    }
    if (base !== c.id) errors.push(`${file}: имя файла курса должно совпадать с id ("${c.id}")`);
    const items = expectList(file, 'items', c.items, errors);
    if (!items.length) {
      errors.push(`${file}: курс пуст (items)`);
      continue;
    }
    const orders = new Set<number>();
    const phaseCount = expectList(file, 'structure', c.structure, errors).length;
    for (const it of items) {
      if (!isRecord(it)) {
        errors.push(`${file}: items содержит не-объект`);
        continue;
      }
      if (!drillIds.has(it.drillId)) {
        errors.push(`${file}: drillId "${it.drillId}" не существует`);
      }
      if (orders.has(it.order)) errors.push(`${file}: дублирующийся order ${it.order}`);
      orders.add(it.order);
      // structureIndex вне списка фаз молча прячет упражнение со страницы курса
      if (
        phaseCount > 0 &&
        it.structureIndex != null &&
        (!Number.isInteger(it.structureIndex) ||
          it.structureIndex < 0 ||
          it.structureIndex >= phaseCount)
      ) {
        errors.push(`${file}: structureIndex ${it.structureIndex} вне диапазона фаз (0–${phaseCount - 1})`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}
