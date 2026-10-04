import { AdjustEvent, BaseIndex, Bases, PitchEvent, PitchResult, PlayEvent, PlayKind } from './events';

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

export function adjust(inning: number, outs: number, bases: Bases): AdjustEvent {
  return { kind: 'adjust', ...base(), inning, outs, bases };
}
