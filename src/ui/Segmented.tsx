// Сегментный переключатель: компактная альтернатива select для 2–6 вариантов.

interface Option<T> {
  value: T;
  label: string;
}

/** Группа кнопок-переключателей; активный вариант залит. */
export function Segmented<T extends string | number>(props: {
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div class="seg" role="group" aria-label={props.ariaLabel}>
      {props.options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          class={'seg__item' + (o.value === props.value ? ' seg__item--active' : '')}
          aria-pressed={o.value === props.value}
          onClick={() => props.onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
