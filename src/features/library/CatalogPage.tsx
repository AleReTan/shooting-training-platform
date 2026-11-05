import { useMemo, useState } from 'preact/hooks';
import { localized, FIRE_LABELS_PLURAL, SOURCE_KIND_LABELS } from '../../app/i18n';
import { filterDrills, type CatalogFilters } from './filters';
import { DrillCard } from './DrillCard';
import { CourseCard } from './CourseCard';
import { TagChip } from '../../ui/TagChip';
import { Segmented } from '../../ui/Segmented';
import { navigate } from '../../app/router';
import { loadFavorites, saveFavorites, toggleFavorite } from './favorites';
import { dailyDrillId, todayKey } from './daily';
import type { AppData } from '../../data/load';
import type { Discipline, Drill, FireMode } from '../../data/types';

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
  const [source, setSource] = useState('');
  const [favOnly, setFavOnly] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() => loadFavorites());

  const toggleFav = (id: string) => {
    // перечитываем хранилище: соседняя вкладка могла изменить список
    const next = toggleFavorite(loadFavorites(), id);
    saveFavorites(next);
    setFavorites(next);
  };

  const tagLabels = useMemo(
    () => new Map(taxonomy.tags.map((t) => [t.id, localized(t.label)])),
    [taxonomy],
  );
  const drillById = useMemo(() => new Map(drills.map((d) => [d.id, d])), [drills]);

  // Источники для фильтра: тип источника → origin'ы по убыванию количества.
  const sourceGroups = useMemo(() => {
    const byKind = new Map<string, Map<string, number>>();
    for (const d of drills) {
      const origins = byKind.get(d.source.kind) ?? new Map();
      origins.set(d.source.origin, (origins.get(d.source.origin) ?? 0) + 1);
      byKind.set(d.source.kind, origins);
    }
    return [...byKind.entries()]
      .map(([kind, origins]) => ({
        kind,
        origins: [...origins.entries()].sort((a, b) => b[1] - a[1]).map(([o]) => o),
        size: [...origins.values()].reduce((s, n) => s + n, 0),
      }))
      .sort((a, b) => b.size - a.size);
  }, [drills]);

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
    source: source || undefined,
    favoritesOnly: favOnly || undefined,
    favorites,
  };

  const visible = useMemo(
    () => filterDrills(drills, filters),
    [drills, query, tags, fireMode, discipline, difficultyMin, difficultyMax, maxRounds, distanceMax, review, source, favorites, favOnly],
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
    review !== '' ||
    source !== '' ||
    favOnly;

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
    setSource('');
    setFavOnly(false);
  };

  // Тренировка дня: стабильный выбор по дате из всех упражнений.
  const pickDaily = () => {
    const id = dailyDrillId(
      drills.map((d) => d.id),
      todayKey(),
    );
    if (id) navigate(`/drill/${id}`);
  };

  const tagRow = (group: 'skill' | 'condition', label: string) => (
    <div class="filters__tags" role="group" aria-label={label}>
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
          <TagChip label="избранное" active={favOnly} onClick={() => setFavOnly((v) => !v)} />

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

          <select
            aria-label="Источник"
            value={source}
            onChange={(e) => setSource((e.target as HTMLSelectElement).value)}
          >
            <option value="">любой источник</option>
            {sourceGroups.map((g) => (
              <optgroup key={g.kind} label={SOURCE_KIND_LABELS[g.kind as keyof typeof SOURCE_KIND_LABELS] ?? g.kind}>
                {g.origins.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </optgroup>
            ))}
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
              {[1, 2, 3, 4, 5].map((n) => (
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

      <p class="catalog-count">
        <span>Найдено {visible.length} из {drills.length}</span>
        {' · '}
        <button type="button" class="link-btn" onClick={pickDaily}>
          тренировка дня
        </button>
        {hasActive ? (
          <>
            {' · '}
            <button type="button" class="link-btn" onClick={reset}>
              сбросить фильтры
            </button>
          </>
        ) : null}
      </p>

      {courses.length ? (
        <section class="courses">
          <h3>Курсы</h3>
          <div class="drill-list">
            {courses.map((c) => (
              <CourseCard key={c.id} course={c} drillById={drillById} />
            ))}
          </div>
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
            <DrillCard
              key={d.id}
              drill={d}
              tagLabels={tagLabels}
              favorite={favorites.includes(d.id)}
              onToggleFavorite={() => toggleFav(d.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
