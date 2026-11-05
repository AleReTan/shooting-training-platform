import type { Drill } from '../../data/types';
import { localized } from '../../app/i18n';

/** Карточка упражнения в списке каталога. */
export function DrillCard(props: { drill: Drill; tagLabels: Map<string, string> }) {
  const { drill } = props;
  return (
    <article class="drill-card">
      <h3 class="drill-card__name">
        <a href={`#/drill/${drill.id}`}>{localized(drill.name)}</a>
      </h3>
      <p class="drill-card__meta">
        {drill.distance.min === drill.distance.max
          ? `${drill.distance.min} м`
          : `${drill.distance.min}–${drill.distance.max} м`}
        {' · '}
        {drill.rounds} патр.
        {' · '}
        сложность {drill.difficulty}/5
      </p>
      <p class="drill-card__tags">
        {drill.tags.map((t) => props.tagLabels.get(t) ?? t).join(' · ')}
      </p>
      {drill.needsReview ? <p class="drill-card__review">на проверке</p> : null}
    </article>
  );
}
