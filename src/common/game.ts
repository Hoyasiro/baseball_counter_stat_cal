import {
  BaseIndex,
  Bases,
  GameInfoEvent,
  GameType,
  HitType,
  LogEvent,
  PitchResult,
  PlayKind,
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
}

export interface GameInfo {
  readonly date: string;
  readonly opponent: string;
  readonly gameType: GameType;
  readonly startInning: number;
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

export function addPitch(game: Game, result: PitchResult, hitType?: HitType): Game {
  return append(game, { kind: 'pitch', ...base(), result, ...(hitType ? { hitType } : {}) });
}

export function addPlay(game: Game, play: PlayKind, baseIndex?: BaseIndex): Game {
  return append(game, { kind: 'play', ...base(), play, ...(baseIndex === undefined ? {} : { base: baseIndex }) });
}

export function addAdjust(game: Game, inning: number, outs: number, bases: Bases, runs = 0): Game {
  return append(game, { kind: 'adjust', ...base(), inning, outs, bases, ...(runs > 0 ? { runs } : {}) });
}

export function addScore(game: Game, team: Team, inning: number, runs: number): Game {
  return append(game, { kind: 'score', ...base(), team, inning, runs });
}

export function addVoid(game: Game, targetId: string): Game {
  return append(game, { kind: 'void', ...base(), targetId });
}

const UNKNOWN_INFO: GameInfo = { date: '', opponent: '', gameType: 'other', startInning: 1 };

/** 가장 최근에 입력한 경기 정보 */
export function gameInfo(game: Game): GameInfo {
  const infos = game.events.filter((e): e is GameInfoEvent => e.kind === 'gameInfo');
  const latest = infos[infos.length - 1];
  if (!latest) return UNKNOWN_INFO;
  return {
    date: latest.date,
    opponent: latest.opponent,
    gameType: latest.gameType,
    startInning: latest.startInning,
  };
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** 화면용 날짜. 예: "10월 4일 (토)" */
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
    v.events.every(isLogEvent)
  );
}

/** 이전 버전(경기 정보 없음) 기록을 읽어 경기 정보를 붙인다. 날짜는 처음 만든 날로 둔다. */
export function upgradeLegacyGame(game: Game): Game {
  if (game.events.some((e) => e.kind === 'gameInfo')) return game;
  const date = game.createdAt.slice(0, 10);
  const info: LogEvent = {
    kind: 'gameInfo',
    id: createId(),
    createdAt: game.createdAt,
    author: game.author,
    date,
    opponent: '',
    gameType: 'other',
    startInning: 1,
  };
  return { ...game, events: [info, ...game.events] };
}
