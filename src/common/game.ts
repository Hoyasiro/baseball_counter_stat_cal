import { LogEvent, PITCH_RESULTS, PitchResult } from './pitch-log';

/** 데모에는 로그인이 없으므로 작성자를 고정한다. 공증 기능 단계에서 실제 사용자로 바꾼다. */
export const DEMO_AUTHOR = '나';

export interface Game {
  readonly id: string;
  readonly createdAt: string;
  readonly author: string;
  readonly events: readonly LogEvent[];
}

export function createId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

export function createGame(): Game {
  return { id: createId(), createdAt: now(), author: DEMO_AUTHOR, events: [] };
}

export function addPitch(game: Game, result: PitchResult): Game {
  const event: LogEvent = { kind: 'pitch', id: createId(), createdAt: now(), author: DEMO_AUTHOR, result };
  return { ...game, events: [...game.events, event] };
}

export function addVoid(game: Game, targetId: string): Game {
  const event: LogEvent = { kind: 'void', id: createId(), createdAt: now(), author: DEMO_AUTHOR, targetId };
  return { ...game, events: [...game.events, event] };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isLogEvent(value: unknown): value is LogEvent {
  if (!isObject(value)) return false;
  const base =
    typeof value.id === 'string' && typeof value.createdAt === 'string' && typeof value.author === 'string';
  if (!base) return false;
  if (value.kind === 'pitch') return PITCH_RESULTS.includes(value.result as PitchResult);
  if (value.kind === 'void') return typeof value.targetId === 'string';
  return false;
}

export function isGame(value: unknown): value is Game {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.author === 'string' &&
    Array.isArray(value.events) &&
    value.events.every(isLogEvent)
  );
}
