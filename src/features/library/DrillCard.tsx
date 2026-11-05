import type { Drill } from '../../data/types';
import { localized } from '../../app/i18n';

/** Пять рисок сложности — как индикатор магазина: заполненные = уровень. */
function DifficultyTicks({ level }: { level: number }) {
  return (
    <span class="drill-card__ticks" role="img" aria-label={`сложность ${level} из 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} class={'tick' + (i <= level ? ' tick--on' : '')} />
      ))}
    </span>
  );
}

/** Карточка упражнения в списке каталога; вся площадь — ссылка (CSS-растяжка). */
export function DrillCard(props: {
  drill: Drill;
  tagLabels: Map<string, string>;
  favorite?: boolean;
  onToggleFavorite?: () => void;
}) {
  const { drill } = props;
  const dist =
    drill.distance.min === drill.distance.max
      ? `${drill.distance.min} м`
      : `${drill.distance.min}–${drill.distance.max} м`;
  return (
    <article class="drill-card">
      <div class="drill-card__head">
        <h3 class="drill-card__name">
          <a href={`#/drill/${drill.id}`}>{localized(drill.name)}</a>
        </h3>
        <DifficultyTicks level={drill.difficulty} />
        {props.onToggleFavorite ? (
          <button
            type="button"
            class={'drill-card__star' + (props.favorite ? ' drill-card__star--on' : '')}
            aria-pressed={!!props.favorite}
            aria-label={props.favorite ? 'убрать из избранного' : 'в избранное'}
            onClick={props.onToggleFavorite}
          >
            ★
          </button>
        ) : null}
      </div>
      <p class="drill-card__meta">
        <span>{dist}</span>
        <span>{drill.rounds > 0 ? `${drill.rounds} патр.` : 'холостая'}</span>
      </p>
      <p class="drill-card__tags">
        {drill.tags.map((t) => props.tagLabels.get(t) ?? t).join(' / ')}
        {drill.needsReview ? <span class="drill-card__review">на проверке</span> : null}
      </p>
    </article>
  );
}
