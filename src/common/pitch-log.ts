// 투구 기록은 덮어쓰지 않는 "이벤트 목록"으로 저장한다. (CLAUDE.md 5.3)
// 취소도 기존 기록을 지우지 않고 "취소 이벤트"를 덧붙여 표현한다.

import {
  BALLS_FOR_WALK,
  Count,
  FIRST_PITCH_COUNT,
  MAX_STRIKES_IN_COUNT,
  STRIKES_FOR_STRIKEOUT,
} from './count';

export type PitchResult = 'ball' | 'strike' | 'foul' | 'hit' | 'out' | 'hitByPitch';

export const PITCH_RESULTS: readonly PitchResult[] = [
  'ball',
  'strike',
  'foul',
  'hit',
  'out',
  'hitByPitch',
];

export type PlateAppearanceOutcome = 'walk' | 'strikeout' | 'hit' | 'out' | 'hitByPitch';

interface EventBase {
  readonly id: string;
  readonly createdAt: string;
  readonly author: string;
}

export interface PitchEvent extends EventBase {
  readonly kind: 'pitch';
  readonly result: PitchResult;
}

export interface VoidEvent extends EventBase {
  readonly kind: 'void';
  readonly targetId: string;
}

export type LogEvent = PitchEvent | VoidEvent;

export interface PlateAppearance {
  /** 경기 안에서 몇 번째 타석인지 (1부터) */
  readonly number: number;
  readonly pitches: readonly PitchEvent[];
  /** 마지막 공을 던지기 직전의 카운트. 타석이 끝나지 않았으면 null */
  readonly endCount: Count | null;
  readonly outcome: PlateAppearanceOutcome | null;
  /** 진행 중인 타석의 현재 카운트 */
  readonly currentCount: Count;
}

/** 취소되지 않은 투구만 입력 순서대로 돌려준다. */
export function activePitches(events: readonly LogEvent[]): PitchEvent[] {
  const voided = new Set(
    events.filter((e): e is VoidEvent => e.kind === 'void').map((e) => e.targetId),
  );
  return events.filter((e): e is PitchEvent => e.kind === 'pitch' && !voided.has(e.id));
}

interface PitchApplied {
  readonly next: Count;
  readonly outcome: PlateAppearanceOutcome | null;
}

export function applyPitch(count: Count, result: PitchResult): PitchApplied {
  switch (result) {
    case 'ball': {
      const balls = count.balls + 1;
      return balls >= BALLS_FOR_WALK
        ? { next: count, outcome: 'walk' }
        : { next: { ...count, balls }, outcome: null };
    }
    case 'strike': {
      const strikes = count.strikes + 1;
      return strikes >= STRIKES_FOR_STRIKEOUT
        ? { next: count, outcome: 'strikeout' }
        : { next: { ...count, strikes }, outcome: null };
    }
    case 'foul':
      // 2스트라이크 이후 파울은 카운트가 그대로다. (번트 파울 삼진은 데모에서 다루지 않음)
      return count.strikes < MAX_STRIKES_IN_COUNT
        ? { next: { ...count, strikes: count.strikes + 1 }, outcome: null }
        : { next: count, outcome: null };
    case 'hit':
    case 'out':
    case 'hitByPitch':
      return { next: count, outcome: result };
  }
}

/** 투구 목록을 처음부터 다시 따라가며 타석 단위로 나눈다. */
export function buildPlateAppearances(pitches: readonly PitchEvent[]): PlateAppearance[] {
  const result: PlateAppearance[] = [];
  let current: PitchEvent[] = [];
  let count = FIRST_PITCH_COUNT;

  for (const pitch of pitches) {
    current.push(pitch);
    const applied = applyPitch(count, pitch.result);
    if (applied.outcome) {
      result.push({
        number: result.length + 1,
        pitches: current,
        endCount: count,
        outcome: applied.outcome,
        currentCount: count,
      });
      current = [];
      count = FIRST_PITCH_COUNT;
    } else {
      count = applied.next;
    }
  }

  if (current.length > 0) {
    result.push({
      number: result.length + 1,
      pitches: current,
      endCount: null,
      outcome: null,
      currentCount: count,
    });
  }
  return result;
}
