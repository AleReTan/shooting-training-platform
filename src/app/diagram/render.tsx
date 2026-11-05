// Рендер мишенной обстановки в SVG (спека §5, §7).
// Чистая геометрия: масштаб S px/м, дальняя граница — сверху.

import type { Layout, LayoutPosition, LayoutTargetRef } from '../../data/types';
import type { PlaybackState } from './types';

const S = 20; // px на метр
const M = 30; // поля схемы, px

interface Point {
  x: number;
  y: number;
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** SVG-схема мишенной обстановки; playback подсвечивает текущее действие. */
export function LayoutDiagram(props: { layout: Layout; playback?: PlaybackState }) {
  const { layout, playback } = props;

  const W = layout.width * S + 2 * M;
  const H = layout.depth * S + 2 * M;
  const px = (x: number) => x * S + M;
  const py = (y: number) => (layout.depth - y) * S + M;

  const posById = new Map(layout.positions.map((p) => [p.id, p]));

  const nearestPos = (t: LayoutTargetRef): LayoutPosition =>
    layout.positions.reduce((best, p) => (dist(p, t) < dist(best, t) ? p : best));

  const shooterAt = (): { x: number; y: number } | null => {
    const move = playback?.activeMove;
    if (!move) return null;
    const from = posById.get(move.from);
    const to = posById.get(move.to);
    if (!from || !to) return null;
    const k = move.progress;
    return { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k };
  };
  const shooter = shooterAt();

  return (
    <svg
      class="diagram"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Схема мишенной обстановки"
    >
      {/* Рубеж */}
      <rect
        x={M / 2}
        y={M / 2}
        width={layout.width * S + M}
        height={layout.depth * S + M}
        rx="8"
        class="diagram-field"
      />
      <text x={M / 2 + 8} y={M / 2 + 16} class="diagram-caption">
        дальняя граница {layout.depth} м
      </text>

      {/* Линии движения: сжатые переходы (спринт/марш) подписаны
          реальной дистанцией из m.distance */}
      {(layout.movement ?? []).map((m, i) => {
        const from = posById.get(m.from);
        const to = posById.get(m.to);
        if (!from || !to) return null;
        const meters = m.distance ?? Math.round(dist(from, to));
        const midX = (px(from.x) + px(to.x)) / 2;
        const midY = (py(from.y) + py(to.y)) / 2;
        return (
          <g key={`mv-${i}`}>
            <title>{`Движение ${m.from}→${m.to} (${m.style})`}</title>
            <line
              x1={px(from.x)}
              y1={py(from.y)}
              x2={px(to.x)}
              y2={py(to.y)}
              class="diagram-movement"
            />
            <circle cx={px(to.x)} cy={py(to.y)} r="3" class="diagram-movement-arrow" />
            <text x={midX} y={midY - 6} class="diagram-movement-label">
              {meters} м
            </text>
          </g>
        );
      })}

      {/* Барьеры */}
      {(layout.barriers ?? []).map((b, i) => (
        <g key={`bar-${i}`}>
          <title>{`Барьер ${b.kind}`}</title>
          <rect
            x={px(b.x) - 8}
            y={py(b.y) - 8}
            width="16"
            height="16"
            rx="3"
            class="diagram-barrier"
          />
          <text x={px(b.x)} y={py(b.y) + 22} class="diagram-barrier-label">
            {b.kind}
          </text>
        </g>
      ))}

      {/* Мишени: подпись с округлёнными метрами, у краёв — прижата внутрь.
          Придвинутые дальние мишени подписаны реальной дистанцией из t.distance */}
      {layout.targets.map((t) => {
        const near = nearestPos(t);
        const d = t.distance ?? Math.round(dist(t, near));
        const shots = playback?.shotsDone?.[t.id] ?? 0;
        const active = playback?.activeTarget === t.id;
        const isSteel = t.type.includes('steel');
        const cls =
          'diagram-target' + (active ? ' diagram-target--active' : '');
        const labelX = Math.min(Math.max(px(t.x), 30), W - 30);
        return (
          <g key={t.id} data-target={t.id} class={cls}>
            {isSteel ? (
              <circle cx={px(t.x)} cy={py(t.y)} r="9" class="diagram-target-shape" />
            ) : (
              <rect
                x={px(t.x) - 7}
                y={py(t.y) - 10}
                width="14"
                height="20"
                rx="2"
                class="diagram-target-shape"
              />
            )}
            <text x={labelX} y={py(t.y) - 14} class="diagram-target-label">
              {t.id} · {d} м{shots > 0 ? ` · ×${shots}` : ''}
            </text>
          </g>
        );
      })}

      {/* Позиции стрелка */}
      {layout.positions.map((p) => (
        <g key={p.id}>
          <circle cx={px(p.x)} cy={py(p.y)} r="7" class="diagram-position" />
          <text x={px(p.x)} y={py(p.y) + 20} class="diagram-position-label">
            {p.id}
          </text>
        </g>
      ))}

      {/* Стрелок при движении */}
      {shooter && (
        <circle cx={px(shooter.x)} cy={py(shooter.y)} r="5" class="diagram-shooter" />
      )}

      {playback?.reloading && (
        <text x={W - M} y={H - 8} class="diagram-reload">
          перезарядка…
        </text>
      )}
    </svg>
  );
}
