// Тост «Доступна новая версия» (Task 12, Review Focus 4).

export function UpdateToast(props: { visible: boolean; onUpdate: () => void }) {
  if (!props.visible) return null;
  return (
    <div class="update-toast" role="status">
      Доступна новая версия —{' '}
      <button type="button" class="btn btn--primary" onClick={props.onUpdate}>
        Обновить
      </button>
    </div>
  );
}
