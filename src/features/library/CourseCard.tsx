import type { Course, Drill } from '../../data/types';
import { localized, plural } from '../../app/i18n';

/** Итоги курса по его упражнениям: список, патроны и диапазон сложности. */
export function courseStats(course: Course, drillById: Map<string, Drill>) {
  const drills = course.items.map((it) => drillById.get(it.drillId)).filter((d): d is Drill => !!d);
  return {
    drills,
    rounds: drills.reduce((s, d) => s + d.rounds, 0),
    dmin: drills.length ? Math.min(...drills.map((d) => d.difficulty)) : 1,
    dmax: drills.length ? Math.max(...drills.map((d) => d.difficulty)) : 5,
  };
}

/** Карточка курса в каталоге: агрегаты упражнений, вся площадь — ссылка. */
export function CourseCard(props: { course: Course; drillById: Map<string, Drill> }) {
  const { course, drillById } = props;
  const { drills, rounds, dmin, dmax } = courseStats(course, drillById);
  const phases = course.structure?.length ?? 0;

  return (
    <article class="drill-card course-card">
      <div class="drill-card__head">
        <h3 class="drill-card__name">
          <a href={`#/course/${course.id}`}>{localized(course.name)}</a>
        </h3>
        {/* Диапазон сложности упражнений курса: залиты риски от min до max */}
        <span
          class="drill-card__ticks"
          role="img"
          aria-label={`сложность упражнений ${dmin}–${dmax} из 5`}
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <span key={i} class={'tick' + (i >= dmin && i <= dmax ? ' tick--on' : '')} />
          ))}
        </span>
      </div>
      <p class="drill-card__meta">
        <span>
          {drills.length} {plural(drills.length, 'упражнение', 'упражнения', 'упражнений')}
        </span>
        <span>{rounds} патр.</span>
        {phases ? (
          <span>
            {phases} {plural(phases, 'фаза', 'фазы', 'фаз')}
          </span>
        ) : null}
      </p>
      <p class="course-card__desc">{localized(course.description)}</p>
      {course.structure?.length ? (
        <ol class="course-card__phases" role="list">
          {course.structure.map((s, i) => (
            <li key={i}>
              <span class="course-card__phase-num">{i + 1}</span>
              <span>{localized(s.label)}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </article>
  );
}
