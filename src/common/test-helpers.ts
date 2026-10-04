import { AdjustEvent, BaseIndex, Bases, HitType, PitchEvent, PitchResult, PlayEvent, PlayKind, ScoreEvent, Team } from './events';

let seq = 0;

function base(): { id: string; createdAt: string; author: string } {
  seq += 1;
  return { id: `e${seq}`, createdAt: '2026-10-04T00:00:00.000Z', author: '테스트' };
}

/** 테스트용 투구 이벤트 목록 */
export function pitches(...results: PitchResult[]): PitchEvent[] {
  return results.map((result) => ({ kind: 'pitch', ...base(), result }));
}

export function play(kind: PlayKind, baseIndex?: BaseIndex): PlayEvent {
  return { kind: 'play', ...base(), play: kind, ...(baseIndex === undefined ? {} : { base: baseIndex }) };
}

export function hit(hitType: HitType): PitchEvent {
  return { kind: 'pitch', ...base(), result: 'hit', hitType };
}

export function adjust(inning: number, outs: number, bases: Bases, runs?: number): AdjustEvent {
  return { kind: 'adjust', ...base(), inning, outs, bases, ...(runs === undefined ? {} : { runs }) };
}

export function score(team: Team, inning: number, runs: number): ScoreEvent {
  return { kind: 'score', ...base(), team, inning, runs };
}
