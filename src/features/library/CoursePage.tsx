// Страница курса: шапка с профилем сложности и «путь» — фазы вехами,
// упражнения карточками (спека §4.1).

import { localized, plural } from '../../app/i18n';
import type { AppData } from '../../data/load';
import type { CourseItem, Localized } from '../../data/types';
import { DifficultyTicks, distanceText } from './DrillCard';
import { courseStats } from './CourseCard';

export function CoursePage({ id, data }: { id: string; data: AppData }) {
  const { courseById, drillById } = data;
  const course = courseById.get(id);

  if (!course) {
    return (
      <section>
        <h2>Курс не найден</h2>
        <p>
          <a href="#/">← В каталог</a>
        </p>
      </section>
    );
  }

  const items = [...course.items].sort((a, b) => a.order - b.order);
  const phases = course.structure ?? [];
  const drill = (item: CourseItem) => drillById.get(item.drillId);

  // шаг — общий номер по курсу; группы — фазы (нет structure — одна группа без заголовка)
  const groups: { label?: Localized; entries: { item: CourseItem; step: number }[] }[] = phases.length
    ? phases.map((phase, idx) => ({
        label: phase.label,
        entries: items
          .map((item, i) => ({ item, step: i + 1 }))
          .filter((e) => (e.item.structureIndex ?? 0) === idx),
      }))
    : [{ entries: items.map((item, i) => ({ item, step: i + 1 })) }];

  const { drills, rounds, dmin, dmax } = courseStats(course, drillById);

  const renderItem = ({ item, step }: { item: CourseItem; step: number }) => {
    const d = drill(item);
    return (
      <li key={item.drillId}>
        {d ? (
          <article class="drill-card course-item">
            <div class="drill-card__head">
              <span class="course-item__step" aria-hidden="true">
                {step}
              </span>
              <h4 class="drill-card__name">
                <a href={`#/drill/${item.drillId}`}>{localized(d.name)}</a>
              </h4>
              <DifficultyTicks level={d.difficulty} />
            </div>
            <p class="drill-card__meta">
              <span>{distanceText(d.distance)}</span>
              <span>{d.rounds > 0 ? `${d.rounds} патр.` : 'холостая'}</span>
            </p>
            {item.note ? <p class="course-item__note">{localized(item.note)}</p> : null}
          </article>
        ) : (
          item.drillId
        )}
      </li>
    );
  };

  return (
    <section>
      <p class="drill-page__nav">
        <a href="#/">← В каталог</a>
      </p>

      <header class="course-hero">
        <h2>{localized(course.name)}</h2>
        <p class="drill-card__meta course-hero__meta">
          <span>
            {drills.length} {plural(drills.length, 'упражнение', 'упражнения', 'упражнений')}
          </span>
          <span>{rounds} патр.</span>
          {phases.length ? (
            <span>
              {phases.length} {plural(phases.length, 'фаза', 'фазы', 'фаз')}
            </span>
          ) : null}
          <span>сложность {dmin}–{dmax}</span>
        </p>

        {/* профиль курса: столбик сложности на каждое упражнение, по порядку и по фазам */}
        <div
          class="course-hero__profile"
          role="img"
          aria-label={`Сложность упражнений по порядку: от ${dmin} до ${dmax}`}
        >
          {groups.map((g, gi) => (
            <div key={gi} class="course-hero__phase-bars">
              {g.entries.map((e) => {
                const d = drill(e.item);
                return d ? (
                  <span
                    key={e.item.drillId}
                    class="course-hero__bar"
                    style={{ height: `${8 + d.difficulty * 4}px` }}
                    title={`${localized(d.name)} — сложность ${d.difficulty}`}
                  />
                ) : null;
              })}
            </div>
          ))}
        </div>
        <p class="course-hero__bars-hint">Сложность упражнений по порядку, группами по фазам</p>

        <p class="course-hero__desc">{localized(course.description)}</p>
        <p class="course-hero__source">
          Источник: {course.source.origin}
          {course.source.url ? (
            <>
              {' — '}
              <a href={course.source.url} rel="noreferrer" target="_blank">
                ссылка
              </a>
            </>
          ) : null}
        </p>
      </header>

      <ol class="course-path" role="list">
        {groups.map((g, gi) => (
          <li key={gi} class="course-phase">
            {g.label ? <h3>{localized(g.label)}</h3> : null}
            <ol class="course-phase__items" role="list">{g.entries.map(renderItem)}</ol>
          </li>
        ))}
      </ol>
    </section>
  );
}
