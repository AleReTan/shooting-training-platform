/** Чип тега-фильтра: кнопка-переключатель. */
export function TagChip(props: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      class={'tag-chip' + (props.active ? ' tag-chip--active' : '')}
      aria-pressed={props.active}
      onClick={props.onClick}
    >
      {props.label}
    </button>
  );
}
