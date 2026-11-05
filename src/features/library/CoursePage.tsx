// Страница курса: фазы structure заголовками, упражнения по order (спека §4.1).

import { localized } from '../../app/i18n';
import type { AppData } from '../../data/load';
import type { CourseItem } from '../../data/types';

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

  const renderItem = (item: CourseItem) => {
    const drill = drillById.get(item.drillId);
    return (
      <li key={item.drillId}>
        {drill ? (
          <a href={`#/drill/${item.drillId}`}>{localized(drill.name)}</a>
        ) : (
          item.drillId
        )}
        {item.note ? (
          <>
            {' — '}
            <span class="course-note">{localized(item.note)}</span>
          </>
        ) : null}
      </li>
    );
  };

  return (
    <section>
      <p>
        <a href="#/">← В каталог</a>
      </p>
      <h2>{localized(course.name)}</h2>
      <p>Источник: {course.source.origin}</p>
      <p>{localized(course.description)}</p>

      {phases.length ? (
        phases.map((phase, idx) => (
          <div key={idx}>
            <h3>{localized(phase.label)}</h3>
            <ol>{items.filter((i) => (i.structureIndex ?? 0) === idx).map(renderItem)}</ol>
          </div>
        ))
      ) : (
        <ol>{items.map(renderItem)}</ol>
      )}
    </section>
  );
}
