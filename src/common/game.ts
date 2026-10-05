import {
  BaseIndex,
  Bases,
  BattedBall,
  PitchType,
  ZonePoint,
  GameInfoEvent,
  GameType,
  HitType,
  LogEvent,
  PitchResult,
  PlayKind,
  Position,
  Role,
  ChildPosition,
  Team,
  isLogEvent,
} from './events';

/** 데모에는 로그인이 없으므로 작성자를 고정한다. 공증 기능 단계에서 실제 사용자로 바꾼다. */
export const DEMO_AUTHOR = '나';

export interface Game {
  readonly id: string;
  readonly createdAt: string;
  readonly author: string;
  readonly events: readonly LogEvent[];
  /** 백업을 불러올 때 지금 기록과 달라 따로 만든 사본이면, 원래 경기 id */
  readonly copiedFrom?: string;
}

export interface GameInfo {
  readonly date: string;
  readonly opponent: string;
  readonly gameType: GameType;
  /** 우리 팀이 먼저 공격(초)인지 */
  readonly battingFirst: Team;
}

export const GAME_TYPE_LABEL: Record<GameType, string> = {
  practice: '연습경기',
  tournament: '대회경기',
  league: '리그경기',
  other: '기타',
};

export function createId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

/** 오늘 날짜 (사용자 기기 시간대 기준) YYYY-MM-DD */
export function today(): string {
  const d = new Date();
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function base(): { id: string; createdAt: string; author: string } {
  return { id: createId(), createdAt: now(), author: DEMO_AUTHOR };
}

function append(game: Game, event: LogEvent): Game {
  return { ...game, events: [...game.events, event] };
}

export function createGame(info: GameInfo): Game {
  const game: Game = { id: createId(), createdAt: now(), author: DEMO_AUTHOR, events: [] };
  return setGameInfo(game, info);
}

/** 경기 정보를 고칠 때도 덮어쓰지 않고 새 정보 이벤트를 덧붙인다. */
export function setGameInfo(game: Game, info: GameInfo): Game {
  return append(game, { kind: 'gameInfo', ...base(), ...info });
}

/** 투구에 함께 남기는 선택 정보 */
export interface PitchDetails {
  readonly hitType?: HitType;
  readonly pitchType?: PitchType;
  readonly zone?: ZonePoint;
  readonly speed?: number;
  readonly battedBall?: BattedBall;
}

export function addPitch(game: Game, result: PitchResult, details: PitchDetails = {}): Game {
  // 값이 없는 항목은 저장하지 않는다.
  const extra = Object.fromEntries(Object.entries(details).filter(([, v]) => v !== undefined));
  return append(game, { kind: 'pitch', ...base(), result, ...extra });
}

export function addPlay(game: Game, play: PlayKind, baseIndex?: BaseIndex): Game {
  return append(game, { kind: 'play', ...base(), play, ...(baseIndex === undefined ? {} : { base: baseIndex }) });
}

export interface AdjustInput {
  readonly inning: number;
  readonly outs: number;
  readonly bases: Bases;
  readonly runs: number;
  readonly child?: ChildPosition;
}

export function addAdjust(game: Game, input: AdjustInput): Game {
  const { inning, outs, bases, runs, child } = input;
  return append(game, {
    kind: 'adjust',
    ...base(),
    inning,
    outs,
    bases,
    ...(runs > 0 ? { runs } : {}),
    ...(child === undefined ? {} : { child }),
  });
}

export interface AppearanceInput {
  readonly role: Role;
  readonly inning: number;
  readonly outs: number;
  readonly bases: Bases;
  readonly balls: number;
  readonly strikes: number;
  readonly childBase?: BaseIndex;
  readonly position?: Position;
}

export function addAppearance(game: Game, input: AppearanceInput): Game {
  const { childBase, position, ...rest } = input;
  return append(game, {
    kind: 'appearance',
    ...base(),
    ...rest,
    ...(childBase === undefined ? {} : { childBase }),
    ...(position === undefined ? {} : { position }),
  });
}

export function addExit(game: Game): Game {
  return append(game, { kind: 'exit', ...base() });
}

export function addScore(game: Game, team: Team, inning: number, runs: number): Game {
  return append(game, { kind: 'score', ...base(), team, inning, runs });
}

export function addVoid(game: Game, targetId: string): Game {
  return append(game, { kind: 'void', ...base(), targetId });
}

const UNKNOWN_INFO: GameInfo = {
  date: '',
  opponent: '',
  gameType: 'other',
  battingFirst: 'them',
};

/** 가장 최근에 입력한 경기 정보. 예전 기록에 없는 값은 기본값(후공)으로 채운다. */
export function gameInfo(game: Game): GameInfo {
  const infos = game.events.filter((e): e is GameInfoEvent => e.kind === 'gameInfo');
  const latest = infos[infos.length - 1];
  if (!latest) return UNKNOWN_INFO;
  return {
    date: latest.date,
    opponent: latest.opponent,
    gameType: latest.gameType,
    battingFirst: latest.battingFirst ?? UNKNOWN_INFO.battingFirst,
  };
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** 화면용 날짜. 예: "10월 4일 (일)" */
export function dateLabel(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return '날짜 없음';
  const [, y, m, d] = match;
  const weekday = WEEKDAYS[new Date(Number(y), Number(m) - 1, Number(d)).getDay()];
  return `${Number(m)}월 ${Number(d)}일 (${weekday})`;
}

export function opponentLabel(opponent: string): string {
  return opponent.trim() === '' ? '상대팀 미입력' : opponent.trim();
}

/** 계산 과정의 출처 등에 쓰는 짧은 경기 이름. 예: "10월 4일 ○○전" */
export function gameShortLabel(game: Game): string {
  const info = gameInfo(game);
  const date = dateLabel(info.date).replace(/ \(.\)$/, '');
  return info.opponent.trim() ? `${date} ${info.opponent.trim()}전` : date;
}

export function isGame(value: unknown): value is Game {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.createdAt === 'string' &&
    typeof v.author === 'string' &&
    Array.isArray(v.events) &&
    v.events.every(isLogEvent) &&
    (v.copiedFrom === undefined || typeof v.copiedFrom === 'string')
  );
}

/**
 * 예전 버전 기록을 지금 구조로 읽는다. 원래 이벤트는 그대로 두고 앞에 덧붙이기만 한다.
 * - 경기 정보가 없으면: 처음 만든 날짜로 경기 정보를 붙인다.
 * - 투구 기록은 있는데 등장 기록이 없으면(투수 화면만 있던 때): 시작 이닝에 "투수로 등장"을 붙인다.
 */
export function upgradeLegacyGame(game: Game): Game {
  const extra: LogEvent[] = [];
  const firstInfo = game.events.find((e): e is GameInfoEvent => e.kind === 'gameInfo');
  if (!firstInfo) {
    extra.push({
      kind: 'gameInfo',
      id: createId(),
      createdAt: game.createdAt,
      author: game.author,
      date: game.createdAt.slice(0, 10),
      opponent: '',
      gameType: 'other',
    });
  }
  const hasPlay = game.events.some((e) => e.kind === 'pitch' || e.kind === 'play' || e.kind === 'adjust');
  if (hasPlay && !game.events.some((e) => e.kind === 'appearance')) {
    const infos = game.events.filter((e): e is GameInfoEvent => e.kind === 'gameInfo');
    const startInning = infos[infos.length - 1]?.startInning ?? 1;
    extra.push({
      kind: 'appearance',
      id: createId(),
      createdAt: game.createdAt,
      author: game.author,
      role: 'pitcher',
      inning: startInning,
      outs: 0,
      bases: [false, false, false],
      balls: 0,
      strikes: 0,
    });
  }
  if (extra.length === 0) return game;
  // 경기 정보는 맨 앞, 등장은 경기 정보 뒤·첫 경기 진행 이벤트 앞에 넣는다.
  const infoEvents = game.events.filter((e) => e.kind === 'gameInfo');
  const rest = game.events.filter((e) => e.kind !== 'gameInfo');
  const addedInfo = extra.filter((e) => e.kind === 'gameInfo');
  const addedAppearance = extra.filter((e) => e.kind === 'appearance');
  return { ...game, events: [...addedInfo, ...infoEvents, ...addedAppearance, ...rest] };
}
