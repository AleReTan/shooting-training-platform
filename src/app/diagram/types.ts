// Состояние проигрывания упражнения поверх схемы (спека §7).

export interface PlaybackState {
  phase: 'idle' | 'playing' | 'done';
  /** Идентификатор мишени, которую обстреливают прямо сейчас. */
  activeTarget?: string;
  /** Текущее перемещение стрелка. */
  activeMove?: { from: string; to: string; progress: number };
  /** Идёт перезарядка. */
  reloading: boolean;
  /** Сколько выстрелов уже сделано по каждой мишени. */
  shotsDone: Record<string, number>;
}
