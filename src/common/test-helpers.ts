import { PitchEvent, PitchResult } from './pitch-log';

let seq = 0;

/** 테스트용 투구 이벤트 목록을 만든다. */
export function pitches(...results: PitchResult[]): PitchEvent[] {
  return results.map((result) => ({
    kind: 'pitch',
    id: `p${++seq}`,
    createdAt: '2026-10-04T00:00:00.000Z',
    author: '테스트',
    result,
  }));
}
