// Карточка упражнения: все разделы схемы Drill (спека §8 п.2).

import { loadData } from '../../data/load';
import { localized, localizedList } from '../../app/i18n';
import { SequencePlayer } from '../../app/diagram/SequencePlayer';
import type { Drill } from '../../data/types';

const PAR_LABELS: Record<string, string> = {
  novice: 'новичок',
  intermediate: 'продолжающий',
  advanced: 'продвинутый',
  master: 'мастер',
};

const FIRE_LABELS: Record<string, string> = {
  live: 'боевая',
  dry: 'сухая',
};

const distanceText = (d: Drill['distance']) =>
  d.min === d.max ? `${d.min} м` : `${d.min}–${d.max} м`;

export function DrillPage({ id }: { id: string }) {
  const { drillById, coursesByDrillId, taxonomy } = loadData();
  const drill = drillById.get(id);

  if (!drill) {
    return (
      <section>
        <h2>Упражнение не найдено</h2>
        <p>
          <a href="#/">← В каталог</a>
        </p>
      </section>
    );
  }

  const tagLabels = new Map(taxonomy.tags.map((t) => [t.id, localized(t.label)]));
  const targetLabels = new Map(taxonomy.targetTypes.map((t) => [t.id, localized(t.label)]));
  const courses = coursesByDrillId.get(drill.id) ?? [];

  return (
    <section>
      <p>
        <a href="#/">← В каталог</a>
      </p>
      <h2>{localized(drill.name)}</h2>
      {drill.name.en && drill.name.en !== drill.name.ru ? (
        <p class="drill-page__alt">{drill.name.en}</p>
      ) : null}

      <p class="drill-card__meta">
        {distanceText(drill.distance)} · {drill.rounds} патр. · сложность {drill.difficulty}/5 ·{' '}
        {drill.fireMode.map((m) => FIRE_LABELS[m] ?? m).join(' + ')}
      </p>

      <p class="drill-card__tags">
        {drill.tags.map((t) => tagLabels.get(t) ?? t).join(' · ')}
      </p>

      <p>
        Источник: {drill.source.origin}
        {drill.source.url ? (
          <>
            {' — '}
            <a href={drill.source.url} rel="noreferrer" target="_blank">
              ссылка
            </a>
          </>
        ) : null}
      </p>

      <h3>Цель</h3>
      <p>{localized(drill.goal)}</p>

      <h3>Выполнение</h3>
      <ol>
        {localizedList(drill.steps).map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>

      {drill.parTimes?.length ? (
        <>
          <h3>Пар-таймы</h3>
          <table>
            <tbody>
              {drill.parTimes.map((p) => (
                <tr key={p.level}>
                  <td>{PAR_LABELS[p.level] ?? p.level}</td>
                  <td>{p.time} с</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

      {drill.safety ? (
        <>
          <h3>Техника безопасности</h3>
          <p>{localized(drill.safety)}</p>
        </>
      ) : null}

      {drill.equipment.length ? (
        <>
          <h3>Снаряжение</h3>
          <ul>
            {drill.equipment.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </>
      ) : null}

      {drill.targets.length ? (
        <p>
          Мишени:{' '}
          {drill.targets
            .map((t) => `${t.count} × ${targetLabels.get(t.type) ?? t.type}`)
            .join(', ')}
        </p>
      ) : null}

      {drill.variants ? (
        <>
          <h3>Варианты</h3>
          <ul>
            {localizedList(drill.variants).map((v, i) => (
              <li key={i}>{v}</li>
            ))}
          </ul>
        </>
      ) : null}

      {drill.layout ? (
        <>
          <h3>Схема</h3>
          <SequencePlayer layout={drill.layout} />
        </>
      ) : null}

      {/* Таймер (Task 11): сюда встраивается TimerPanel с par-временем упражнения. */}

      {drill.related?.length ? (
        <>
          <h3>Похожие</h3>
          <ul>
            {drill.related.map((rid) => {
              const r = drillById.get(rid);
              if (!r) return null;
              return (
                <li key={rid}>
                  <a href={`#/drill/${rid}`}>{localized(r.name)}</a>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}

      {courses.length ? (
        <>
          <h3>Входит в курсы</h3>
          <ul>
            {courses.map((c) => (
              <li key={c.id}>
                <a href={`#/course/${c.id}`}>{localized(c.name)}</a>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {drill.media?.images?.length || drill.media?.video?.length ? (
        <>
          <h3>Медиа</h3>
          <ul>
            {(drill.media.images ?? []).map((img, i) => (
              <li key={`img-${i}`}>
                <a href={img.url} rel="noreferrer" target="_blank">
                  фото{img.credit ? ` — ${img.credit}` : ''}
                </a>
              </li>
            ))}
            {(drill.media.video ?? []).map((v, i) => (
              <li key={`vid-${i}`}>
                {v.provider === 'youtube' ? (
                  <a href={`https://www.youtube.com/watch?v=${v.id}`} rel="noreferrer" target="_blank">
                    видео ({v.provider})
                  </a>
                ) : (
                  `видео (${v.provider})`
                )}
                {v.credit ? ` — ${v.credit}` : ''}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
