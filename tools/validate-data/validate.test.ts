import { test, expect } from 'vitest';
import { validateAll, type FileEntry } from './validate';
import taxonomyJson from '../../data/taxonomy.json';
import oneTo5 from '../../data/drills/one-to-five.json';
import billDrill from '../../data/drills/bill-drill-carbine.json';
import trexCourse from '../../data/courses/trex-carbine.json';
import type { Course, Drill, Taxonomy } from '../../src/data/types';

const taxonomy = taxonomyJson as Taxonomy;

// Валидная заготовка упражнения (на основе «От 1 до 5»)
const drill = (o: Record<string, unknown> = {}): Drill =>
  JSON.parse(JSON.stringify({ ...oneTo5, id: 'x-drill', ...o }));

// Валидная заготовка курса
const course = (o: Record<string, unknown> = {}): Course =>
  JSON.parse(
    JSON.stringify({ ...trexCourse, id: 'x-course', items: [{ drillId: 'x-drill', order: 1 }], ...o }),
  );

const entry = (file: string, data: unknown): FileEntry => ({ file, data });

const run = (drills: FileEntry[], courses: FileEntry[] = []) =>
  validateAll({ drills, courses }, taxonomy);

test('валидные данные проходят', () => {
  const res = run(
    [
      entry('x-drill.json', drill()),
      entry('one-to-five.json', oneTo5),
      entry('bill-drill-carbine.json', billDrill),
    ],
    [entry('x-course.json', course())],
  );
  expect(res.errors).toEqual([]);
  expect(res.ok).toBe(true);
});

test('дублирующийся id отклоняется', () => {
  const res = run([entry('x-drill.json', drill()), entry('x-drill-2.json', drill())]);
  expect(res.errors.join('\n')).toContain('дублирующийся id');
  expect(res.ok).toBe(false);
});

test('имя файла должно совпадать с id', () => {
  const res = run([entry('wrong-name.json', drill())]);
  expect(res.errors.join('\n')).toContain('имя файла');
});

test('тег вне таксономии отклоняется', () => {
  const res = run([entry('x-drill.json', drill({ tags: ['first-shot', 'lasers'] }))]);
  expect(res.errors.join('\n')).toContain('тег "lasers"');
});

test('пустое name.ru отклоняется', () => {
  const res = run([entry('x-drill.json', drill({ name: { en: 'X' } }))]);
  expect(res.errors.join('\n')).toContain('name.ru');
});

test('пустые steps.ru отклоняются', () => {
  const res = run([entry('x-drill.json', drill({ steps: { ru: [] } }))]);
  expect(res.errors.join('\n')).toContain('steps.ru');
});

test('пустой goal.ru отклоняется', () => {
  const res = run([entry('x-drill.json', drill({ goal: { en: 'X' } }))]);
  expect(res.errors.join('\n')).toContain('goal.ru');
});

test('пустой source.origin отклоняется', () => {
  const res = run([entry('x-drill.json', drill({ source: { origin: '', kind: 'classic' } }))]);
  expect(res.errors.join('\n')).toContain('source.origin');
});

test('related на несуществующий id отклоняется', () => {
  const res = run([entry('x-drill.json', drill({ related: ['ghost-drill'] }))]);
  expect(res.errors.join('\n')).toContain('related "ghost-drill"');
});

test('unit не m отклоняется', () => {
  const res = run([entry('x-drill.json', drill({ distance: { min: 1, max: 2, unit: 'yd' } }))]);
  expect(res.errors.join('\n')).toContain('unit');
});

test('hit-factor без points отклоняется', () => {
  const res = run([entry('x-drill.json', drill({ scoring: { type: 'hit-factor' } }))]);
  expect(res.errors.join('\n')).toContain('points');
});

test('discipline: любое непустое подмножество дисциплин допустимо', () => {
  for (const discipline of [['shotgun'], ['pistol-traumatic'], ['carbine', 'pistol-traumatic']]) {
    const res = run([entry('x-drill.json', drill({ discipline }))]);
    expect(res.errors, JSON.stringify(discipline)).toEqual([]);
  }
});

test('discipline: пустой список или неизвестная дисциплина отклоняются', () => {
  const empty = run([entry('x-drill.json', drill({ discipline: [] }))]);
  expect(empty.errors.join('\n')).toContain('discipline');
  const unknown = run([entry('x-drill.json', drill({ discipline: ['laser'] }))]);
  expect(unknown.errors.join('\n')).toContain('"laser"');
});

test('difficulty вне 1–5 отклоняется', () => {
  const res = run([entry('x-drill.json', drill({ difficulty: 7 }))]);
  expect(res.errors.join('\n')).toContain('difficulty');
});

test('курс: drillId на несуществующее упражнение отклоняется', () => {
  const res = run([entry('x-drill.json', drill())], [entry('x-course.json', course({ items: [{ drillId: 'ghost', order: 1 }] }))]);
  expect(res.errors.join('\n')).toContain('ghost');
});

test('курс: пустые items отклоняются', () => {
  const res = run([entry('x-drill.json', drill())], [entry('x-course.json', course({ items: [] }))]);
  expect(res.errors.join('\n')).toContain('items');
});

test('курс: дублирующийся order отклоняется', () => {
  const res = run(
    [entry('x-drill.json', drill())],
    [entry('x-course.json', course({ items: [{ drillId: 'x-drill', order: 1 }, { drillId: 'x-drill', order: 1 }] }))],
  );
  expect(res.errors.join('\n')).toContain('order');
});

test('sequence: ссылка на несуществующую мишень отклоняется', () => {
  const bad = drill();
  bad.layout = {
    unit: 'm', width: 10, depth: 20,
    positions: [{ id: 'P1', x: 1, y: 1 }],
    targets: [{ id: 'T1', x: 5, y: 18, type: 'ipsc-metric' }],
    sequence: [{ action: 'engage', target: 'T9', shots: 2 }],
  };
  const res = run([entry('x-drill.json', bad)]);
  expect(res.errors.join('\n')).toContain('T9');
});

test('sequence: ссылка на несуществующую позицию отклоняется', () => {
  const bad = drill();
  bad.layout = {
    unit: 'm', width: 10, depth: 20,
    positions: [{ id: 'P1', x: 1, y: 1 }],
    targets: [{ id: 'T1', x: 5, y: 18, type: 'ipsc-metric' }],
    sequence: [{ action: 'move', from: 'P1', to: 'P9' }],
  };
  const res = run([entry('x-drill.json', bad)]);
  expect(res.errors.join('\n')).toContain('P9');
});

test('координаты вне width/depth отклоняются', () => {
  const bad = drill();
  bad.layout = {
    unit: 'm', width: 10, depth: 20,
    positions: [{ id: 'P1', x: 1, y: 1 }],
    targets: [{ id: 'T1', x: 15, y: 18, type: 'ipsc-metric' }],
  };
  const res = run([entry('x-drill.json', bad)]);
  expect(res.errors.join('\n')).toContain('вне габаритов');
});

test('layout: мишени без единой позиции отклоняются (рендер падает на пустом positions)', () => {
  const bad = drill();
  bad.layout = {
    unit: 'm', width: 10, depth: 20,
    positions: [],
    targets: [{ id: 'T1', x: 5, y: 18, type: 'ipsc-metric' }],
  };
  const res = run([entry('x-drill.json', bad)]);
  expect(res.errors.join('\n')).toContain('positions');
});

test('movement.distance: положительное число или отсутствие', () => {
  const bad = drill();
  bad.layout = {
    unit: 'm', width: 10, depth: 20,
    positions: [{ id: 'P1', x: 1, y: 1 }, { id: 'P2', x: 1, y: 3 }],
    targets: [{ id: 'T1', x: 5, y: 18, type: 'ipsc-metric' }],
    movement: [{ from: 'P1', to: 'P2', style: 'advance', distance: 0 }],
  };
  const res = run([entry('x-drill.json', bad)]);
  expect(res.errors.join('\n')).toContain('movement.distance');
});

test('layout.realDepth: положительное число или отсутствие', () => {
  const bad = drill();
  bad.layout = {
    unit: 'm', width: 10, depth: 20, realDepth: 0,
    positions: [{ id: 'P1', x: 1, y: 1 }],
    targets: [{ id: 'T1', x: 5, y: 18, type: 'ipsc-metric' }],
  };
  const res = run([entry('x-drill.json', bad)]);
  expect(res.errors.join('\n')).toContain('realDepth');
});

test('target.distance: положительное число или отсутствие', () => {
  const bad = drill();
  bad.layout = {
    unit: 'm', width: 10, depth: 20,
    positions: [{ id: 'P1', x: 1, y: 1 }],
    targets: [{ id: 'T1', x: 5, y: 18, type: 'ipsc-metric', distance: -5 }],
  };
  const res = run([entry('x-drill.json', bad)]);
  expect(res.errors.join('\n')).toContain('target.distance');
});

test('fireMode: неизвестное значение отклоняется', () => {
  const res = run([entry('x-drill.json', drill({ fireMode: ['liv'] }))]);
  expect(res.errors.join('\n')).toContain('fireMode');
});

test('fireMode: пустой список отклоняется', () => {
  const res = run([entry('x-drill.json', drill({ fireMode: [] }))]);
  expect(res.errors.join('\n')).toContain('fireMode');
});

test('distance.min > distance.max отклоняется', () => {
  const res = run([entry('x-drill.json', drill({ distance: { min: 30, max: 10, unit: 'm' } }))]);
  expect(res.errors.join('\n')).toContain('distance.min');
});

test('тип мишени вне таксономии отклоняется (targets и layout)', () => {
  const bad = drill({ targets: [{ type: 'ipsk-metric', count: 1 }] });
  bad.layout = {
    unit: 'm', width: 10, depth: 20,
    positions: [{ id: 'P1', x: 1, y: 1 }],
    targets: [{ id: 'T1', x: 5, y: 18, type: 'nra-b8' }],
  };
  const res = run([entry('x-drill.json', bad)]);
  expect(res.errors.join('\n')).toContain('ipsk-metric');
  expect(res.errors.join('\n')).toContain('nra-b8');
});

test('неизвестный scoring.type отклоняется', () => {
  const res = run([entry('x-drill.json', drill({ scoring: { type: 'point' } }))]);
  expect(res.errors.join('\n')).toContain('scoring.type');
});

test('курс: structureIndex вне диапазона фаз отклоняется', () => {
  const res = run(
    [entry('x-drill.json', drill())],
    [
      entry(
        'x-course.json',
        course({
          structure: [{ label: { ru: 'Фаза 1' } }, { label: { ru: 'Фаза 2' } }],
          items: [{ drillId: 'x-drill', order: 1, structureIndex: 5 }],
        }),
      ),
    ],
  );
  expect(res.errors.join('\n')).toContain('structureIndex');
});

test('файл с null вместо объекта даёт ошибку, а не краш', () => {
  const res = run([entry('x-drill.json', null), entry('one-to-five.json', oneTo5)]);
  expect(res.errors.join('\n')).toContain('не объект');
  expect(res.ok).toBe(false);
});

test('массив вместо объекта упражнения — одна ясная ошибка, а не каскад', () => {
  const res = run([entry('x-drill.json', [drill()] as unknown)]);
  expect(res.errors).toHaveLength(1);
  expect(res.errors[0]).toContain('не объект');
});

test('курс с null или массивом вместо объекта даёт ошибку, а не краш', () => {
  const res = run(
    [entry('x-drill.json', drill())],
    [entry('x-course.json', null), entry('y-course.json', [] as unknown)],
  );
  expect(res.errors.join('\n')).toContain('x-course.json: содержимое — не объект');
  expect(res.errors.join('\n')).toContain('y-course.json: содержимое — не объект');
  expect(res.ok).toBe(false);
});

test('курс с items не-массивом даёт ошибку, а не краш', () => {
  const res = run(
    [entry('x-drill.json', drill())],
    [entry('x-course.json', course({ items: 5 as unknown as Course['items'] }))],
  );
  expect(res.errors.join('\n')).toContain('items');
  expect(res.ok).toBe(false);
});

test('targets/tags/layout-поля не-списком — ошибка, а не краш итерации', () => {
  const bad = drill({ targets: { type: 'a4-paper', count: 3 } as unknown });
  bad.layout = {
    unit: 'm', width: 10, depth: 20,
    positions: 5 as unknown as never,
    targets: [{ id: 'T1', x: 5, y: 18, type: 'ipsc-metric' }],
    sequence: [{ action: 'engage', target: 'T1', shots: 2 }],
  } as never;
  const res = run([entry('x-drill.json', bad)]);
  expect(res.errors.join('\n')).toContain('targets — не список');
  expect(res.errors.join('\n')).toContain('layout.positions — не список');
  expect(res.ok).toBe(false);
});

test('layout не-объектом даёт ошибку, а не краш', () => {
  const res = run([entry('x-drill.json', drill({ layout: 'см. схему' as unknown as never }))]);
  expect(res.errors.join('\n')).toContain('layout — не объект');
  expect(res.ok).toBe(false);
});

test('targets.count: целое ≥ 1, иначе на странице упражнения рендерится мусор', () => {
  const res = run([
    entry('x-drill.json', drill({ targets: [{ type: 'ipsc-metric', count: 0 }] })),
  ]);
  expect(res.errors.join('\n')).toContain('count');
  expect(res.ok).toBe(false);
});

test('null-элементы в списках — ошибка по файлу, а не TypeError всего запуска', () => {
  const bad = drill({ targets: [null as unknown as never] });
  bad.layout = {
    unit: 'm', width: 10, depth: 20,
    positions: [null as unknown as never],
    targets: [{ id: 'T1', x: 5, y: 18, type: 'ipsc-metric' }],
    movement: [null as unknown as never],
    sequence: [null as unknown as never],
  };
  const res = run(
    [entry('x-drill.json', bad)],
    [entry('x-course.json', course({ items: [null as unknown as never] }))],
  );
  const msg = res.errors.join('\n');
  expect(msg).toContain('targets содержит не-объект');
  expect(msg).toContain('layout.positions содержит не-объект');
  expect(msg).toContain('layout.movement содержит не-объект');
  expect(msg).toContain('layout.sequence содержит не-объект');
  expect(msg).toContain('items содержит не-объект');
  expect(res.ok).toBe(false);
});

test('structure не-массивом — ошибка формы, а не фантомный диапазон фаз', () => {
  const res = run(
    [entry('x-drill.json', drill())],
    [
      entry(
        'x-course.json',
        course({
          structure: 'фазы' as unknown as never,
          items: [{ drillId: 'x-drill', order: 1, structureIndex: 5 }],
        }),
      ),
    ],
  );
  expect(res.errors.join('\n')).toContain('structure — не список');
});

test('related не-списком — ошибка (строка роняет страницу упражнения)', () => {
  const res = run([entry('x-drill.json', drill({ related: 'one-to-five' as unknown as never }))]);
  expect(res.errors.join('\n')).toContain('related — не список');
});

test('parTimes: строка вместо времени и неизвестный уровень отклоняются', () => {
  const res = run([
    entry('x-drill.json', drill({ parTimes: [{ level: 'novice', time: '8' as unknown as number }] })),
    entry(
      'y-drill.json',
      drill({ id: 'y-drill', parTimes: [{ level: 'grandmaster', time: 3 } as unknown as never] }),
    ),
  ]);
  const msg = res.errors.join('\n');
  expect(msg).toContain('parTimes.time');
  expect(msg).toContain('уровень');
});

test('scoring не-объектом — ошибка формы, а не «неизвестный undefined»', () => {
  const res = run([entry('x-drill.json', drill({ scoring: 'par-time' as unknown as never }))]);
  expect(res.errors.join('\n')).toContain('scoring — не объект');
});

test('equipment не-списком и safety без ru — ошибки (строка роняет страницу упражнения)', () => {
  const res = run([
    entry('x-drill.json', drill({ equipment: 'кобура' as unknown as never })),
    entry('y-drill.json', drill({ id: 'y-drill', safety: 'смотри выше' as unknown as never })),
    entry(
      'z-drill.json',
      drill({ id: 'z-drill', safety: { en: 'only en' } as unknown as never }),
    ),
  ]);
  const msg = res.errors.join('\n');
  expect(msg).toContain('equipment — не список');
  expect(msg).toContain('safety — не объект');
  expect(msg).toContain('safety.ru');
});

test('layout.width/depth — положительные числа, иначе все координаты «вне габаритов»', () => {
  const bad = drill();
  bad.layout = {
    unit: 'm', width: 0, depth: 20,
    positions: [{ id: 'P1', x: 1, y: 1 }],
    targets: [],
  };
  const res = run([entry('x-drill.json', bad)]);
  expect(res.errors.join('\n')).toContain('layout.width');
});

test('layout.barriers не-списком — ошибка (рендер зовёт .map)', () => {
  const bad = drill();
  bad.layout = {
    unit: 'm', width: 10, depth: 20,
    positions: [{ id: 'P1', x: 1, y: 1 }],
    targets: [],
    barriers: 'сплошная стена' as unknown as never,
  };
  const res = run([entry('x-drill.json', bad)]);
  expect(res.errors.join('\n')).toContain('layout.barriers — не список');
});
