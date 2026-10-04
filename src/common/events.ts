// 경기 기록은 덮어쓰지 않는 "이벤트 목록"으로 저장한다. (CLAUDE.md 5.3)
// 고치거나 취소할 때도 기존 이벤트를 지우지 않고 새 이벤트를 덧붙인다.
// 기록은 경기 상황 기준이고, 우리 아이의 역할은 "등장(appearance)" 이벤트로 장면마다 정한다. (CLAUDE.md 0.5)

import { MAX_BALLS_IN_COUNT, MAX_STRIKES_IN_COUNT, OUTS_PER_INNING } from './count';

export type PitchResult =
  | 'ball'
  | 'strike'
  | 'foul'
  | 'buntFoul'
  | 'wildPitch'
  | 'hit'
  | 'reachedOnError'
  | 'out'
  | 'hitByPitch';

export const PITCH_RESULTS: readonly PitchResult[] = [
  'ball',
  'strike',
  'foul',
  'buntFoul',
  'wildPitch',
  'hit',
  'reachedOnError',
  'out',
  'hitByPitch',
];

/** 안타 종류. 예전 기록처럼 종류가 없으면 1루타로 본다. */
export type HitType = 'single' | 'double' | 'triple' | 'homeRun';

export const HIT_TYPES: readonly HitType[] = ['single', 'double', 'triple', 'homeRun'];

/** 안타 종류별로 타자가 가는 베이스 수 (루타) */
export const HIT_BASES: Record<HitType, number> = { single: 1, double: 2, triple: 3, homeRun: 4 };

/**
 * 투구가 아닌 주자 상황. base는 그 주자가 있던 베이스다.
 * - stolenBase / caughtStealing: 도루 성공·실패 (base 0 = 1루 주자의 2루 도루, 2 = 3루 주자의 홈 도루)
 * - error: 수비 실책으로 주자가 움직임. 바뀐 상황은 이어서 "상황 고치기"로 맞춘다.
 * - stolenSecond / caughtStealingSecond: 예전 기록용 (1루 주자의 2루 도루)
 */
export type PlayKind =
  | 'pickoff'
  | 'pickoffOut'
  | 'stolenBase'
  | 'caughtStealing'
  | 'error'
  | 'stolenSecond'
  | 'caughtStealingSecond';

export const PLAY_KINDS: readonly PlayKind[] = [
  'pickoff',
  'pickoffOut',
  'stolenBase',
  'caughtStealing',
  'error',
  'stolenSecond',
  'caughtStealingSecond',
];

/** 0: 1루, 1: 2루, 2: 3루 */
export type BaseIndex = 0 | 1 | 2;

export type Bases = readonly [boolean, boolean, boolean];

export type GameType = 'practice' | 'tournament' | 'league' | 'other';

export const GAME_TYPES: readonly GameType[] = ['practice', 'tournament', 'league', 'other'];

export type Team = 'us' | 'them';

/** 초(top) / 말(bottom) */
export type Half = 'top' | 'bottom';

/** 장면에서 우리 아이의 역할 */
export type Role = 'pitcher' | 'batter' | 'runner' | 'fielder';

export const ROLES: readonly Role[] = ['pitcher', 'batter', 'runner', 'fielder'];

/** 투수를 뺀 수비 포지션 (투수는 역할 'pitcher') */
export type Position =
  | 'catcher'
  | 'firstBase'
  | 'secondBase'
  | 'thirdBase'
  | 'shortstop'
  | 'leftField'
  | 'centerField'
  | 'rightField';

export const POSITIONS: readonly Position[] = [
  'catcher',
  'firstBase',
  'secondBase',
  'thirdBase',
  'shortstop',
  'leftField',
  'centerField',
  'rightField',
];

/** 주자 역할에서 우리 아이의 위치. 베이스, 득점, 아웃 */
export type ChildPosition = BaseIndex | 'scored' | 'out';

interface EventBase {
  readonly id: string;
  readonly createdAt: string;
  readonly author: string;
}

export interface PitchEvent extends EventBase {
  readonly kind: 'pitch';
  readonly result: PitchResult;
  /** result가 'hit'일 때 안타 종류 */
  readonly hitType?: HitType;
}

export interface PlayEvent extends EventBase {
  readonly kind: 'play';
  readonly play: PlayKind;
  /** 견제한 베이스, 또는 도루한 주자가 있던 베이스 */
  readonly base?: BaseIndex;
}

/** 사용자가 이닝·아웃·주자를 직접 고친 기록 */
export interface AdjustEvent extends EventBase {
  readonly kind: 'adjust';
  readonly inning: number;
  readonly outs: number;
  readonly bases: Bases;
  /** 고치는 동안 홈에 들어온 점수 (예: 실책으로 주자 득점) */
  readonly runs?: number;
  /** 주자 장면에서 우리 아이가 어디로 갔는지 */
  readonly child?: ChildPosition;
}

/** 우리 아이가 장면에 등장. 그때의 이닝·아웃·주자·카운트로 상황을 맞추고 시작한다. */
export interface AppearanceEvent extends EventBase {
  readonly kind: 'appearance';
  readonly role: Role;
  readonly inning: number;
  readonly outs: number;
  readonly bases: Bases;
  readonly balls: number;
  readonly strikes: number;
  /** 주자 역할일 때 아이가 있는 베이스 */
  readonly childBase?: BaseIndex;
  /** 수비 역할일 때 포지션 */
  readonly position?: Position;
}

/** 우리 아이가 교체되어 빠짐. 지금 장면의 기록을 끝낸다. */
export interface ExitEvent extends EventBase {
  readonly kind: 'exit';
}

/** 스코어보드에 직접 넣은 점수. 같은 팀·이닝은 마지막 값을 쓴다. */
export interface ScoreEvent extends EventBase {
  readonly kind: 'score';
  readonly team: Team;
  readonly inning: number;
  readonly runs: number;
}

export interface GameInfoEvent extends EventBase {
  readonly kind: 'gameInfo';
  /** YYYY-MM-DD */
  readonly date: string;
  readonly opponent: string;
  readonly gameType: GameType;
  /** 예전 기록용: 아이가 던지기 시작한 이닝 */
  readonly startInning?: number;
  /** 우리 팀이 먼저 공격(초)인지. 없으면 후공으로 본다. */
  readonly battingFirst?: Team;
}

export interface VoidEvent extends EventBase {
  readonly kind: 'void';
  readonly targetId: string;
}

export type LogEvent =
  | PitchEvent
  | PlayEvent
  | AdjustEvent
  | AppearanceEvent
  | ExitEvent
  | ScoreEvent
  | GameInfoEvent
  | VoidEvent;

/** 경기 진행에 영향을 주는 이벤트 */
export type PlayLogEvent = PitchEvent | PlayEvent | AdjustEvent | AppearanceEvent | ExitEvent;

/** 취소할 수 있는 이벤트 */
export type UndoableEvent = PlayLogEvent | ScoreEvent;

/** 취소되지 않은 이벤트(경기 정보 제외)만 입력 순서대로 돌려준다. */
export function activeEvents(events: readonly LogEvent[]): UndoableEvent[] {
  const voided = new Set(
    events.filter((e): e is VoidEvent => e.kind === 'void').map((e) => e.targetId),
  );
  return events.filter(
    (e): e is UndoableEvent => e.kind !== 'gameInfo' && e.kind !== 'void' && !voided.has(e.id),
  );
}

export function playEvents(events: readonly UndoableEvent[]): PlayLogEvent[] {
  return events.filter((e): e is PlayLogEvent => e.kind !== 'score');
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isCount(value: unknown, min: number, max: number): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

export const MAX_INNING = 30;
/** 한 번에 넣을 수 있는 점수의 상한 (입력 실수 방지) */
export const MAX_RUNS = 99;

function isBases(value: unknown): boolean {
  return Array.isArray(value) && value.length === 3 && value.every((v) => typeof v === 'boolean');
}

function isChildPosition(value: unknown): boolean {
  return value === 'scored' || value === 'out' || isCount(value, 0, 2);
}


/** 저장소에서 읽은 값이 올바른 이벤트인지 확인한다. (CLAUDE.md 4.2) */
export function isLogEvent(value: unknown): value is LogEvent {
  if (!isObject(value)) return false;
  if (typeof value.id !== 'string' || typeof value.createdAt !== 'string' || typeof value.author !== 'string') {
    return false;
  }
  switch (value.kind) {
    case 'pitch':
      return (
        PITCH_RESULTS.includes(value.result as PitchResult) &&
        (value.hitType === undefined || HIT_TYPES.includes(value.hitType as HitType))
      );
    case 'play':
      return (
        PLAY_KINDS.includes(value.play as PlayKind) && (value.base === undefined || isCount(value.base, 0, 2))
      );
    case 'adjust':
      return (
        isCount(value.inning, 1, MAX_INNING) &&
        isCount(value.outs, 0, OUTS_PER_INNING) &&
        isBases(value.bases) &&
        (value.runs === undefined || isCount(value.runs, 0, MAX_RUNS)) &&
        (value.child === undefined || isChildPosition(value.child))
      );
    case 'appearance':
      return (
        ROLES.includes(value.role as Role) &&
        isCount(value.inning, 1, MAX_INNING) &&
        isCount(value.outs, 0, OUTS_PER_INNING - 1) &&
        isBases(value.bases) &&
        isCount(value.balls, 0, MAX_BALLS_IN_COUNT) &&
        isCount(value.strikes, 0, MAX_STRIKES_IN_COUNT) &&
        (value.childBase === undefined || isCount(value.childBase, 0, 2)) &&
        (value.position === undefined || POSITIONS.includes(value.position as Position))
      );
    case 'exit':
      return true;
    case 'score':
      return (
        (value.team === 'us' || value.team === 'them') &&
        isCount(value.inning, 1, MAX_INNING) &&
        isCount(value.runs, 0, MAX_RUNS)
      );
    case 'gameInfo':
      return (
        typeof value.date === 'string' &&
        typeof value.opponent === 'string' &&
        GAME_TYPES.includes(value.gameType as GameType) &&
        (value.startInning === undefined || isCount(value.startInning, 1, MAX_INNING)) &&
        (value.battingFirst === undefined || value.battingFirst === 'us' || value.battingFirst === 'them')
      );
    case 'void':
      return typeof value.targetId === 'string';
    default:
      return false;
  }
}
