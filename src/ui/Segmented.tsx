// Сегментный переключатель: компактная альтернатива select для 2–6 вариантов.
// Исключающий выбор — семантика радиогруппы (APG): один таб-стоп у активного
// варианта, стрелки влево/вправо переключают по кругу.

import { useRef } from 'preact/hooks';

interface Option<T> {
  value: T;
  label: string;
}

export function Segmented<T extends string | number>(props: {
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      class="seg"
      role="radiogroup"
      aria-label={props.ariaLabel}
      ref={ref}
      onKeyDown={(e) => {
        const opts = props.options;
        const n = opts.length;
        let delta = 0;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') delta = 1;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') delta = -1;
        if (delta === 0 || n === 0) return;
        e.preventDefault();
        const i = opts.findIndex((o) => o.value === props.value);
        const opt = opts[(i + delta + n) % n];
        if (!opt) return;
        props.onChange(opt.value);
        // фокус — сразу на кнопку-цель, ререндер сделает её активной
        ref.current?.querySelectorAll<HTMLButtonElement>('.seg__item')[(i + delta + n) % n]?.focus();
      }}
    >
      {props.options.map((o) => {
        const active = o.value === props.value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            tabindex={active ? 0 : -1}
            class={'seg__item' + (active ? ' seg__item--active' : '')}
            onClick={() => props.onChange(o.value)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
