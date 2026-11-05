import { useMemo, useState } from 'preact/hooks';
import { localized, FIRE_LABELS_PLURAL } from '../../app/i18n';
import { filterDrills, type CatalogFilters } from './filters';
import { DrillCard } from './DrillCard';
import { TagChip } from '../../ui/TagChip';
import { Segmented } from '../../ui/Segmented';
import type { AppData } from '../../data/load';
import type { Discipline, FireMode } from '../../data/types';

/** Каталог упражнений: поиск, фильтры, список (спека §8 п.1). */
export default function CatalogPage({ data }: { data: AppData }) {
  const { drills, courses, taxonomy } = data;

  const [query, setQuery] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [fireMode, setFireMode] = useState<'' | FireMode>('');
  const [discipline, setDiscipline] = useState<'' | Discipline>('');
  const [difficultyMin, setDifficultyMin] = useState(1);
  const [difficultyMax, setDifficultyMax] = useState(5);
  const [maxRounds, setMaxRounds] = useState<number | ''>('');
  const [distanceMax, setDistanceMax] = useState<number | ''>('');
  const [review, setReview] = useState<'' | 'yes' | 'no'>('');

  const tagLabels = useMemo(
    () => new Map(taxonomy.tags.map((t) => [t.id, localized(t.label)])),
    [taxonomy],
  );

  const filters: CatalogFilters = {
    query,
    tags,
    fireMode: fireMode || undefined,
    discipline: discipline || undefined,
    difficultyMin,
    difficultyMax,
    maxRounds: maxRounds === '' ? undefined : maxRounds,
    distanceMax: distanceMax === '' ? undefined : distanceMax,
    needsReview: review === '' ? undefined : review === 'yes',
  };

  const visible = useMemo(
    () => filterDrills(drills, filters),
    [drills, query, tags, fireMode, discipline, difficultyMin, difficultyMax, maxRounds, distanceMax, review],
  );

  const hasActive =
    query !== '' ||
    tags.length > 0 ||
    fireMode !== '' ||
    discipline !== '' ||
    difficultyMin !== 1 ||
    difficultyMax !== 5 ||
    maxRounds !== '' ||
    distanceMax !== '' ||
    review !== '';

  const toggleTag = (id: string) =>
    setTags((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));

  const reset = () => {
    setQuery('');
    setTags([]);
    setFireMode('');
    setDiscipline('');
    setDifficultyMin(1);
    setDifficultyMax(5);
    setMaxRounds('');
    setDistanceMax('');
    setReview('');
  };

  const tagRow = (group: 'skill' | 'condition', label: string) => (
    <div class="filters__tags">
      <span class="filters__tags-label">{label}</span>
      {taxonomy.tags
        .filter((t) => t.group === group)
        .map((t) => (
          <TagChip
            key={t.id}
            label={localized(t.label)}
            active={tags.includes(t.id)}
            onClick={() => toggleTag(t.id)}
          />
        ))}
    </div>
  );

  return (
    <section>
      <h2>Каталог упражнений</h2>

      <div class="filters">
        <input
          type="search"
          class="filters__search"
          aria-label="Поиск"
          placeholder="Поиск: название, текст упражнения…"
          value={query}
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
        />

        <div class="filters__row">
          <Segmented
            ariaLabel="тип тренировки"
            value={fireMode}
            options={[
              { value: '' as const, label: 'все' },
              { value: 'live' as const, label: FIRE_LABELS_PLURAL.live },
              { value: 'dry' as const, label: FIRE_LABELS_PLURAL.dry },
            ]}
            onChange={setFireMode}
          />

          <select
            aria-label="Оружие"
            value={discipline}
            onChange={(e) => setDiscipline((e.target as HTMLSelectElement).value as '' | Discipline)}
          >
            <option value="">любое оружие</option>
            <option value="carbine">карабин</option>
            <option value="pistol-traumatic">пистолет / травмат</option>
            <option value="shotgun">ружьё</option>
          </select>

          <Segmented
            ariaLabel="сложность от"
            value={difficultyMin <= 1 ? ('' as const) : (difficultyMin as number)}
            options={[
              { value: '' as const, label: 'все' },
              { value: 2, label: '2+' },
              { value: 3, label: '3+' },
              { value: 4, label: '4+' },
              { value: 5, label: '5' },
            ]}
            onChange={(v) => setDifficultyMin(v === '' ? 1 : v)}
          />
          <span class="filters__num">
            до
            <select
              aria-label="сложность до"
              value={difficultyMax}
              onChange={(e) => setDifficultyMax(Number((e.target as HTMLSelectElement).value))}
            >
              {[2, 3, 4, 5].map((n) => (
                <option value={n} selected={n === difficultyMax}>
                  {n}
                </option>
              ))}
            </select>
          </span>

          <label class="filters__num">
            патронов до
            <input
              type="number"
              min={0}
              value={maxRounds}
              onInput={(e) => {
                const v = (e.target as HTMLInputElement).value;
                setMaxRounds(v === '' ? '' : Number(v));
              }}
            />
          </label>

          <label class="filters__num">
            дистанция до
            <input
              type="number"
              min={0}
              value={distanceMax}
              onInput={(e) => {
                const v = (e.target as HTMLInputElement).value;
                setDistanceMax(v === '' ? '' : Number(v));
              }}
            />
            м
          </label>

          <Segmented
            ariaLabel="вычитка"
            value={review}
            options={[
              { value: '' as const, label: 'любая' },
              { value: 'no' as const, label: 'проверено' },
              { value: 'yes' as const, label: 'на проверке' },
            ]}
            onChange={setReview}
          />
        </div>

        {tagRow('skill', 'навыки')}
        {tagRow('condition', 'условия')}
      </div>

      {visible.length > 0 ? (
        <p class="catalog-count">
          Найдено {visible.length} из {drills.length}
          {hasActive ? (
            <>
              {' · '}
              <button type="button" class="link-btn" onClick={reset}>
                сбросить фильтры
              </button>
            </>
          ) : null}
        </p>
      ) : null}

      {courses.length ? (
        <section class="courses">
          <h3>Курсы</h3>
          <ul>
            {courses.map((c) => (
              <li key={c.id}>
                <a href={`#/course/${c.id}`}>{localized(c.name)}</a> — {c.items.length} упражн.
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {visible.length === 0 ? (
        <div class="empty">
          <p>Ничего не найдено</p>
          <button type="button" onClick={reset}>
            Сбросить
          </button>
        </div>
      ) : (
        <div class="drill-list">
          {visible.map((d) => (
            <DrillCard key={d.id} drill={d} tagLabels={tagLabels} />
          ))}
        </div>
      )}
    </section>
  );
}
