// Схема данных — спека §4, §4.1, §5, §6, §7

export type Localized = { ru: string; en?: string };
export type LocalizedList = { ru: string[]; en?: string[] };

export type Discipline = 'carbine' | 'shotgun' | 'pistol-traumatic';
export type FireMode = 'live' | 'dry';

export type SourceKind =
  | 'classic'
  | 'uspsa-classifier'
  | 'steel-challenge'
  | 'book'
  | 'forum'
  | 'adaptation'
  | 'course';

export interface Source {
  origin: string;
  kind: SourceKind;
  url?: string;
}

export interface TargetSpec {
  type: string; // справочник типов мишеней — taxonomy.targetTypes
  count: number;
}

export type ParLevel = 'novice' | 'intermediate' | 'advanced' | 'master';

export interface ParTime {
  level: ParLevel;
  time: number; // секунды
}

export type ScoringType = 'par-time' | 'hit-factor' | 'points' | 'none';

export interface Scoring {
  type: ScoringType;
  points?: number; // обязателен при type === 'hit-factor'
}

export interface LayoutPosition {
  id: string;
  x: number;
  y: number; // метры от линии старта
  label?: Localized;
}

export interface LayoutTargetRef {
  id: string;
  x: number;
  y: number;
  type: string;
  distance?: number; // реальная дистанция до ближайшей позиции, если мишень придвинута на схеме
}

export interface LayoutBarrier {
  x: number;
  y: number;
  kind: string; // barrel | wall | …
}

export type MovementStyle = 'advance' | 'retreat' | 'lateral';

export interface LayoutMovement {
  from: string;
  to: string;
  style: MovementStyle;
  /** Реальная дистанция перехода в метрах, если он сжат на схеме
   *  (например, спринт 50 м между соседними позициями). */
  distance?: number;
}

export type SequenceStep =
  | { action: 'engage'; target: string; shots: number }
  | { action: 'move'; from: string; to: string }
  | { action: 'reload' };

export interface Layout {
  unit: 'm';
  width: number;
  depth: number;
  positions: LayoutPosition[];
  targets: LayoutTargetRef[];
  barriers?: LayoutBarrier[];
  movement?: LayoutMovement[];
  sequence?: SequenceStep[];
}

export interface MediaImage {
  url: string;
  credit?: string;
}

export interface MediaVideo {
  provider: string;
  id: string;
  credit?: string;
}

export interface Media {
  images?: MediaImage[];
  video?: MediaVideo[];
}

export interface Drill {
  schemaVersion: 1;
  id: string; // kebab-case, = имени файла
  name: Localized;
  discipline: Discipline[]; // MVP: ['carbine']
  source: Source;
  tags: string[]; // ⊆ taxonomy.tags (навыки + условия)
  difficulty: 1 | 2 | 3 | 4 | 5;
  fireMode: FireMode[];
  rounds: number; // патронов на один проход
  distance: { min: number; max: number; unit: 'm' };
  targets: TargetSpec[];
  parTimes?: ParTime[];
  scoring: Scoring;
  goal: Localized;
  steps: LocalizedList;
  safety?: Localized;
  equipment: string[];
  layout?: Layout;
  media?: Media;
  variants?: LocalizedList;
  related?: string[];
  needsReview?: boolean; // true для необработанного импорта
}

export interface CourseStructureEntry {
  label: Localized;
}

export interface CourseItem {
  drillId: string;
  order: number;
  structureIndex?: number;
  note?: Localized;
}

export interface Course {
  schemaVersion: 1;
  id: string;
  name: Localized;
  source: Source;
  description: Localized;
  structure?: CourseStructureEntry[];
  items: CourseItem[];
  media?: Media;
}

export type TagGroup = 'skill' | 'condition';

export interface TaxonomyTag {
  id: string;
  label: Localized;
  group: TagGroup;
  parent?: string;
}

export interface Taxonomy {
  tags: TaxonomyTag[];
  targetTypes: { id: string; label: Localized }[];
  parLevels: ParLevel[];
}
