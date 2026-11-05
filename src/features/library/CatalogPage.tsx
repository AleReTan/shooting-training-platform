import { useMemo, useState } from 'preact/hooks';
import { loadData } from '../../data/load';
import { localized } from '../../app/i18n';
import { filterDrills, type CatalogFilters } from './filters';
import { DrillCard } from './DrillCard';
import { TagChip } from '../../ui/TagChip';
import type { FireMode } from '../../data/types';

/** Каталог упражнений: поиск, фильтры, список (спека §8 п.1). */
export default function CatalogPage() {
  const { drills, courses, taxonomy } = loadData();

  const [query, setQuery] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [fireMode, setFireMode] = useState<'' | FireMode>('');
  const [difficultyMin, setDifficultyMin] = useState(1);
  const [difficultyMax, setDifficultyMax] = useState(5);
  const [maxRounds, setMaxRounds] = useState<number | ''>('');
  const [distanceMax, setDistanceMax] = useState<number | ''>('');

  const tagLabels = useMemo(
    () => new Map(taxonomy.tags.map((t) => [t.id, localized(t.label)])),
    [taxonomy],
  );

  const filters: CatalogFilters = {
    query,
    tags,
    fireMode: fireMode || undefined,
    difficultyMin,
    difficultyMax,
    maxRounds: maxRounds === '' ? undefined : maxRounds,
    distanceMax: distanceMax === '' ? undefined : distanceMax,
  };

  const visible = useMemo(
    () => filterDrills(drills, filters),
    [drills, query, tags, fireMode, difficultyMin, difficultyMax, maxRounds, distanceMax],
  );

  const toggleTag = (id: string) =>
    setTags((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));

  const reset = () => {
    setQuery('');
    setTags([]);
    setFireMode('');
    setDifficultyMin(1);
    setDifficultyMax(5);
    setMaxRounds('');
    setDistanceMax('');
  };

  const renderTagGroup = (group: 'skill' | 'condition', title: string) => (
    <fieldset class="filters__group">
      <legend>{title}</legend>
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
    </fieldset>
  );

  return (
    <section>
      <h2>Каталог упражнений</h2>

      <div class="filters">
        <label class="filters__search">
          Поиск
          <input
            type="search"
            value={query}
            onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
            placeholder="название, текст упражнения…"
          />
        </label>

        <label>
          Тип тренировки
          <select
            value={fireMode}
            onChange={(e) => setFireMode((e.target as HTMLSelectElement).value as '' | FireMode)}
          >
            <option value="">любой</option>
            <option value="live">боевые</option>
            <option value="dry">сухие</option>
          </select>
        </label>

        <label>
          Сложность от
          <select
            value={difficultyMin}
            onChange={(e) => setDifficultyMin(Number((e.target as HTMLSelectElement).value))}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option value={n}>{n}</option>
            ))}
          </select>
        </label>

        <label>
          до
          <select
            value={difficultyMax}
            onChange={(e) => setDifficultyMax(Number((e.target as HTMLSelectElement).value))}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option value={n}>{n}</option>
            ))}
          </select>
        </label>

        <label>
          Патронов ≤
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

        <label>
          Дистанция ≤ (м)
          <input
            type="number"
            min={0}
            value={distanceMax}
            onInput={(e) => {
              const v = (e.target as HTMLInputElement).value;
              setDistanceMax(v === '' ? '' : Number(v));
            }}
          />
        </label>

        {renderTagGroup('skill', 'Навыки')}
        {renderTagGroup('condition', 'Условия')}
      </div>

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
