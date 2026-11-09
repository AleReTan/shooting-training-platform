import { useMemo, useState } from 'preact/hooks';
import { localized, FIRE_LABELS_PLURAL, SOURCE_KIND_LABELS } from '../../app/i18n';
import {
  filterDrills,
  INITIAL_CATALOG_STATE,
  hasActiveFilters,
  toCatalogFilters,
  type CatalogState,
} from './filters';
import { DrillCard } from './DrillCard';
import { CourseCard } from './CourseCard';
import { TagChip } from '../../ui/TagChip';
import { Segmented } from '../../ui/Segmented';
import { navigate } from '../../app/router';
import { useFavorites } from './favorites';
import { dailyDrillId, todayKey } from './daily';
import type { AppData } from '../../data/load';
import type { Discipline, FireMode } from '../../data/types';

/** Каталог упражнений: поиск, фильтры, список (спека §8 п.1). */
export default function CatalogPage({ data }: { data: AppData }) {
  const { drills, drillById, courses, taxonomy } = data;

  // Фильтры — один объект (CatalogState): сброс, «есть активные» и мемо
  // зависят только от него, новое поле не требует правок в пяти местах.
  const [state, setState] = useState<CatalogState>(INITIAL_CATALOG_STATE);
  const patch = (p: Partial<CatalogState>) => setState((s) => ({ ...s, ...p }));
  const [favorites, toggleFav] = useFavorites();

  const tagLabels = useMemo(
    () => new Map(taxonomy.tags.map((t) => [t.id, localized(t.label)])),
    [taxonomy],
  );

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

  const filters = useMemo(() => toCatalogFilters(state, favorites), [state, favorites]);
  const visible = useMemo(() => filterDrills(drills, filters), [drills, filters]);

  const toggleTag = (id: string) =>
    setState((s) => ({
      ...s,
      tags: s.tags.includes(id) ? s.tags.filter((x) => x !== id) : [...s.tags, id],
    }));

  const reset = () => setState(INITIAL_CATALOG_STATE);

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
            active={state.tags.includes(t.id)}
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
          value={state.query}
          onInput={(e) => patch({ query: (e.target as HTMLInputElement).value })}
        />

        <div class="filters__row">
          <TagChip
            label="избранное"
            active={state.favOnly}
            onClick={() => patch({ favOnly: !state.favOnly })}
          />

          <Segmented
            ariaLabel="тип тренировки"
            value={state.fireMode}
            options={[
              { value: '' as const, label: 'все' },
              { value: 'live' as const, label: FIRE_LABELS_PLURAL.live },
              { value: 'dry' as const, label: FIRE_LABELS_PLURAL.dry },
            ]}
            onChange={(v) => patch({ fireMode: v })}
          />

          <select
            aria-label="Оружие"
            value={state.discipline}
            onChange={(e) =>
              patch({ discipline: (e.target as HTMLSelectElement).value as '' | Discipline })
            }
          >
            <option value="">любое оружие</option>
            <option value="carbine">карабин</option>
            <option value="pistol-traumatic">пистолет / травмат</option>
            <option value="shotgun">ружьё</option>
          </select>

          <select
            aria-label="Источник"
            value={state.source}
            onChange={(e) => patch({ source: (e.target as HTMLSelectElement).value })}
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
            value={state.difficultyMin <= 1 ? ('' as const) : (state.difficultyMin as number)}
            options={[
              { value: '' as const, label: 'все' },
              { value: 2, label: '2+' },
              { value: 3, label: '3+' },
              { value: 4, label: '4+' },
              { value: 5, label: '5' },
            ]}
            onChange={(v) =>
              patch(
                v === ''
                  ? { difficultyMin: 1 }
                  : { difficultyMin: v, difficultyMax: Math.max(v, state.difficultyMax) },
              )
            }
          />
          <span class="filters__num">
            до
            <select
              aria-label="сложность до"
              value={state.difficultyMax}
              onChange={(e) => {
                const n = Number((e.target as HTMLSelectElement).value);
                patch({ difficultyMax: n, difficultyMin: Math.min(state.difficultyMin, n) });
              }}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option value={n}>{n}</option>
              ))}
            </select>
          </span>

          <label class="filters__num">
            патронов до
            <input
              type="number"
              min={0}
              value={state.maxRounds}
              onInput={(e) => {
                const v = (e.target as HTMLInputElement).value;
                patch({ maxRounds: v === '' ? '' : Math.max(0, Number(v)) });
              }}
            />
          </label>

          <label class="filters__num">
            дистанция до
            <input
              type="number"
              min={0}
              value={state.distanceMax}
              onInput={(e) => {
                const v = (e.target as HTMLInputElement).value;
                patch({ distanceMax: v === '' ? '' : Math.max(0, Number(v)) });
              }}
            />
            м
          </label>

          <Segmented
            ariaLabel="вычитка"
            value={state.review}
            options={[
              { value: '' as const, label: 'любая' },
              { value: 'no' as const, label: 'проверено' },
              { value: 'yes' as const, label: 'на проверке' },
            ]}
            onChange={(v) => patch({ review: v })}
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
        {hasActiveFilters(state) ? (
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
