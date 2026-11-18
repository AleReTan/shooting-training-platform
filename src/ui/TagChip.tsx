/** Чип тега-фильтра. Тап — цикл: выкл → фильтр (active) → исключение
 *  (excluded, «−тег») → выкл. Минус в тексте, чтобы режим читался и без цвета. */
export function TagChip(props: { label: string; active: boolean; excluded?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      class={
        'tag-chip' + (props.active ? ' tag-chip--active' : '') + (props.excluded ? ' tag-chip--excluded' : '')
      }
      aria-pressed={props.active || !!props.excluded}
      onClick={props.onClick}
    >
      {props.excluded ? `−${props.label}` : props.label}
    </button>
  );
}
