// 경기 기록은 덮어쓰지 않는 "이벤트 목록"으로 저장한다. (CLAUDE.md 5.3)
// 고치거나 취소할 때도 기존 이벤트를 지우지 않고 새 이벤트를 덧붙인다.

export type PitchResult =
  | 'ball'
  | 'strike'
  | 'foul'
  | 'buntFoul'
  | 'wildPitch'
  | 'hit'
  | 'out'
  | 'hitByPitch';

export const PITCH_RESULTS: readonly PitchResult[] = [
  'ball',
  'strike',
  'foul',
  'buntFoul',
  'wildPitch',
  'hit',
  'out',
  'hitByPitch',
];

/** 투구가 아닌 주자 상황 */
export type PlayKind = 'pickoff' | 'pickoffOut' | 'stolenSecond' | 'caughtStealingSecond';

export const PLAY_KINDS: readonly PlayKind[] = ['pickoff', 'pickoffOut', 'stolenSecond', 'caughtStealingSecond'];

/** 0: 1루, 1: 2루, 2: 3루 */
export type BaseIndex = 0 | 1 | 2;

export type GameType = 'practice' | 'tournament' | 'league' | 'other';

export const GAME_TYPES: readonly GameType[] = ['practice', 'tournament', 'league', 'other'];

export type Bases = readonly [boolean, boolean, boolean];

interface EventBase {
  readonly id: string;
  readonly createdAt: string;
  readonly author: string;
}

export interface PitchEvent extends EventBase {
  readonly kind: 'pitch';
  readonly result: PitchResult;
}

export interface PlayEvent extends EventBase {
  readonly kind: 'play';
  readonly play: PlayKind;
  /** 견제 아웃일 때 아웃된 주자가 있던 베이스 */
  readonly base?: BaseIndex;
}

/** 사용자가 이닝·아웃·주자를 직접 고친 기록 */
export interface AdjustEvent extends EventBase {
  readonly kind: 'adjust';
  readonly inning: number;
  readonly outs: number;
  readonly bases: Bases;
}

export interface GameInfoEvent extends EventBase {
  readonly kind: 'gameInfo';
  /** YYYY-MM-DD */
  readonly date: string;
  readonly opponent: string;
  readonly gameType: GameType;
  /** 아이가 던지기 시작한 이닝 */
  readonly startInning: number;
}

export interface VoidEvent extends EventBase {
  readonly kind: 'void';
  readonly targetId: string;
}

export type LogEvent = PitchEvent | PlayEvent | AdjustEvent | GameInfoEvent | VoidEvent;

/** 경기 진행에 영향을 주는 이벤트 (취소 대상이 될 수 있는 것) */
export type PlayLogEvent = PitchEvent | PlayEvent | AdjustEvent;

/** 취소되지 않은 경기 진행 이벤트만 입력 순서대로 돌려준다. */
export function activeEvents(events: readonly LogEvent[]): PlayLogEvent[] {
  const voided = new Set(
    events.filter((e): e is VoidEvent => e.kind === 'void').map((e) => e.targetId),
  );
  return events.filter(
    (e): e is PlayLogEvent =>
      (e.kind === 'pitch' || e.kind === 'play' || e.kind === 'adjust') && !voided.has(e.id),
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isCount(value: unknown, min: number, max: number): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

export const MAX_INNING = 30;
/** 고칠 때 3아웃을 넣으면 이닝이 끝난다. */
export const MAX_OUTS_IN_ADJUST = 3;

function isBases(value: unknown): boolean {
  return Array.isArray(value) && value.length === 3 && value.every((v) => typeof v === 'boolean');
}

/** 저장소에서 읽은 값이 올바른 이벤트인지 확인한다. (CLAUDE.md 4.2) */
export function isLogEvent(value: unknown): value is LogEvent {
  if (!isObject(value)) return false;
  if (typeof value.id !== 'string' || typeof value.createdAt !== 'string' || typeof value.author !== 'string') {
    return false;
  }
  switch (value.kind) {
    case 'pitch':
      return PITCH_RESULTS.includes(value.result as PitchResult);
    case 'play':
      return (
        PLAY_KINDS.includes(value.play as PlayKind) && (value.base === undefined || isCount(value.base, 0, 2))
      );
    case 'adjust':
      return (
        isCount(value.inning, 1, MAX_INNING) && isCount(value.outs, 0, MAX_OUTS_IN_ADJUST) && isBases(value.bases)
      );
    case 'gameInfo':
      return (
        typeof value.date === 'string' &&
        typeof value.opponent === 'string' &&
        GAME_TYPES.includes(value.gameType as GameType) &&
        isCount(value.startInning, 1, MAX_INNING)
      );
    case 'void':
      return typeof value.targetId === 'string';
    default:
      return false;
  }
}
