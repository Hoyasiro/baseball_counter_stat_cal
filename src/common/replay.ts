// 이벤트 목록을 처음부터 다시 따라가며 타석, 이닝, 아웃, 주자 상황을 계산한다.
// 화면과 통계는 저장된 값이 아니라 항상 이 결과를 쓴다. (기록과 가공 결과 분리, CLAUDE.md 5.3)

import {
  BALLS_FOR_WALK,
  Count,
  FIRST_PITCH_COUNT,
  MAX_STRIKES_IN_COUNT,
  OUTS_PER_INNING,
  STRIKES_FOR_STRIKEOUT,
} from './count';
import { Advance, advanceRunners, batterAdvance, EMPTY_BASES, forceAdvance, removeRunner, stealAdvance } from './bases';
import { AdjustEvent, Bases, HIT_BASES, HitType, PitchEvent, PitchResult, PlayEvent, PlayLogEvent } from './events';

export type PlateAppearanceOutcome =
  | 'walk'
  | 'strikeout'
  | 'hit'
  | 'reachedOnError'
  | 'out'
  | 'hitByPitch'
  /** 타석 도중 이닝이 끝남 (예: 도루 실패로 세 번째 아웃). 같은 타자가 다음 이닝에 다시 친다. */
  | 'inningEnded';

export interface PlateAppearance {
  /** 경기 안에서 몇 번째 타석인지 (1부터) */
  readonly number: number;
  readonly inning: number;
  readonly outsBefore: number;
  readonly basesBefore: Bases;
  readonly pitches: readonly PitchEvent[];
  /** 이 타석 동안 일어난 투구·주자 상황·고침을 순서대로 */
  readonly timeline: readonly PlayLogEvent[];
  /** 마지막 공을 던지기 직전의 카운트. 끝나지 않았거나 이닝 종료로 중단되면 null */
  readonly endCount: Count | null;
  /** 진행 중이면 null */
  readonly outcome: PlateAppearanceOutcome | null;
  /** 진행 중인 타석의 현재 카운트 */
  readonly currentCount: Count;
  /** 이 타석 동안 잡은 아웃 수 (삼진, 아웃, 견제 아웃, 도루 실패, 고침으로 늘린 아웃) */
  readonly outsRecorded: number;
  /** 이 타석 동안 일어난 주자 상황 (견제, 도루 등) */
  readonly plays: readonly PlayEvent[];
  /** 안타로 끝났을 때 안타 종류 */
  readonly hitType: HitType | null;
  /** 이 타석 동안 홈에 들어온 점수 (상대 팀 득점 = 투수 실점) */
  readonly runs: number;
  /** 이 타석 동안 나온 우리 팀 수비 실책 수 (실책 출루 + 실책으로 주자 진루) */
  readonly errors: number;
}

export interface GameState {
  readonly inning: number;
  readonly outs: number;
  readonly bases: Bases;
  readonly count: Count;
}

export interface GameReplay {
  readonly plateAppearances: readonly PlateAppearance[];
  readonly state: GameState;
}

interface PitchApplied {
  readonly next: Count;
  readonly outcome: PlateAppearanceOutcome | null;
}

/** 공 하나가 카운트에 주는 영향. 주자 이동은 replayGame에서 처리한다. */
export function applyPitch(count: Count, result: PitchResult): PitchApplied {
  switch (result) {
    case 'ball':
    case 'wildPitch': {
      const balls = count.balls + 1;
      return balls >= BALLS_FOR_WALK
        ? { next: count, outcome: 'walk' }
        : { next: { ...count, balls }, outcome: null };
    }
    case 'strike':
    // 번트 파울은 2스트라이크에서도 스트라이크다. 그래서 2스트라이크 번트 파울은 삼진 (쓰리번트 아웃).
    case 'buntFoul': {
      const strikes = count.strikes + 1;
      return strikes >= STRIKES_FOR_STRIKEOUT
        ? { next: count, outcome: 'strikeout' }
        : { next: { ...count, strikes }, outcome: null };
    }
    case 'foul':
      // 2스트라이크 이후 일반 파울은 카운트가 그대로다.
      return count.strikes < MAX_STRIKES_IN_COUNT
        ? { next: { ...count, strikes: count.strikes + 1 }, outcome: null }
        : { next: count, outcome: null };
    case 'hit':
    case 'reachedOnError':
    case 'out':
    case 'hitByPitch':
      return { next: count, outcome: result };
  }
}

interface Effect extends Advance {
  readonly outs: number;
}

const NO_MOVE = (bases: Bases): Effect => ({ bases, runs: 0, outs: 0 });

/** 타석 결과에 따른 아웃, 주자 이동, 득점 */
function applyOutcome(bases: Bases, outcome: PlateAppearanceOutcome, hitType: HitType): Effect {
  switch (outcome) {
    case 'walk':
    case 'hitByPitch':
      return { ...forceAdvance(bases), outs: 0 };
    case 'hit':
      return { ...batterAdvance(bases, HIT_BASES[hitType]), outs: 0 };
    case 'reachedOnError':
      // 실책 출루는 1루타처럼 한 베이스씩 옮긴다. 더 간 경우는 사용자가 고친다.
      return { ...batterAdvance(bases, HIT_BASES.single), outs: 0 };
    case 'strikeout':
    case 'out':
      return { bases, runs: 0, outs: 1 };
    case 'inningEnded':
      return NO_MOVE(bases);
  }
}

function applyPlay(bases: Bases, play: PlayEvent): Effect {
  switch (play.play) {
    case 'pickoff':
    case 'error':
      return NO_MOVE(bases);
    case 'pickoffOut':
      return { bases: removeRunner(bases, play.base ?? 0), runs: 0, outs: 1 };
    case 'stolenBase':
      return { ...stealAdvance(bases, play.base ?? 0), outs: 0 };
    case 'stolenSecond':
      return { ...stealAdvance(bases, 0), outs: 0 };
    case 'caughtStealing':
      return { bases: removeRunner(bases, play.base ?? 0), runs: 0, outs: 1 };
    case 'caughtStealingSecond':
      return { bases: removeRunner(bases, 0), runs: 0, outs: 1 };
  }
}

interface OpenPlateAppearance {
  inning: number;
  outsBefore: number;
  basesBefore: Bases;
  pitches: PitchEvent[];
  timeline: PlayLogEvent[];
  plays: PlayEvent[];
  count: Count;
  outsRecorded: number;
  runs: number;
  errors: number;
}

type MutablePlateAppearance = { -readonly [K in keyof PlateAppearance]: PlateAppearance[K] } & {
  timeline: PlayLogEvent[];
};

export function replayGame(events: readonly PlayLogEvent[], startInning: number): GameReplay {
  const result: MutablePlateAppearance[] = [];
  let inning = startInning;
  let outs = 0;
  let bases: Bases = EMPTY_BASES;

  const open = (): OpenPlateAppearance => ({
    inning,
    outsBefore: outs,
    basesBefore: bases,
    pitches: [],
    timeline: [],
    plays: [],
    count: FIRST_PITCH_COUNT,
    outsRecorded: 0,
    runs: 0,
    errors: 0,
  });
  let current = open();

  /** 공이나 주자 상황이 하나라도 있으면 타석으로 남긴다. */
  const started = (pa: OpenPlateAppearance): boolean => pa.pitches.length > 0 || pa.plays.length > 0;

  const toRecord = (
    pa: OpenPlateAppearance,
    outcome: PlateAppearanceOutcome | null,
    endCount: Count | null,
  ): MutablePlateAppearance => ({
    number: result.length + 1,
    inning: pa.inning,
    outsBefore: pa.outsBefore,
    basesBefore: pa.basesBefore,
    pitches: pa.pitches,
    timeline: pa.timeline,
    endCount,
    outcome,
    currentCount: pa.count,
    outsRecorded: pa.outsRecorded,
    plays: pa.plays,
    hitType: outcome === 'hit' ? (pa.pitches[pa.pitches.length - 1]?.hitType ?? 'single') : null,
    runs: pa.runs,
    errors: pa.errors,
  });

  const close = (outcome: PlateAppearanceOutcome, endCount: Count | null): void => {
    result.push(toRecord(current, outcome, endCount));
  };

  /** 세 번째 아웃이면 이닝을 넘긴다. 타석 도중이면 그 타석은 "이닝 종료로 중단"으로 닫는다. */
  const endInningIfThreeOuts = (): void => {
    if (outs < OUTS_PER_INNING) return;
    if (started(current)) close('inningEnded', null);
    inning += 1;
    outs = 0;
    bases = EMPTY_BASES;
    current = open();
  };

  const applyAdjust = (event: AdjustEvent): void => {
    const last = result[result.length - 1];
    // 다음 타자의 첫 공 전에 고친 것은 방금 끝난 타석의 결과로 본다. (예: 병살의 두 번째 아웃)
    const owner = started(current) || !last ? current : last;
    owner.timeline.push(event);

    if (event.inning !== inning) {
      // 이닝을 직접 바꾼 경우: 아웃은 투수가 잡은 것으로 세지 않는다.
      if (started(current)) close('inningEnded', null);
      inning = event.inning;
      outs = event.outs;
      bases = event.bases;
      current = open();
      endInningIfThreeOuts();
      return;
    }

    // 첫 기록 전에 고친 것은 시작 상황(예: 1아웃에 등판)이므로 잡은 아웃으로 세지 않는다.
    const isStartingSituation = !last && !started(current);
    if (event.outs > outs && !isStartingSituation) owner.outsRecorded += event.outs - outs;
    owner.runs += event.runs ?? 0;
    outs = event.outs;
    bases = event.bases;
    if (!started(current)) {
      current.outsBefore = outs;
      current.basesBefore = bases;
    }
    endInningIfThreeOuts();
  };

  for (const event of events) {
    if (event.kind === 'adjust') {
      applyAdjust(event);
      continue;
    }

    current.timeline.push(event);

    if (event.kind === 'play') {
      current.plays.push(event);
      const applied = applyPlay(bases, event);
      bases = applied.bases;
      outs += applied.outs;
      current.outsRecorded += applied.outs;
      current.runs += applied.runs;
      if (event.play === 'error') current.errors += 1;
      endInningIfThreeOuts();
      continue;
    }

    current.pitches.push(event);
    if (event.result === 'wildPitch') {
      const moved = advanceRunners(bases, 1);
      bases = moved.bases;
      current.runs += moved.runs;
    }
    const applied = applyPitch(current.count, event.result);
    if (!applied.outcome) {
      current.count = applied.next;
      continue;
    }
    const after = applyOutcome(bases, applied.outcome, event.hitType ?? 'single');
    bases = after.bases;
    outs += after.outs;
    current.outsRecorded += after.outs;
    current.runs += after.runs;
    if (applied.outcome === 'reachedOnError') current.errors += 1;
    close(applied.outcome, current.count);
    current = open();
    endInningIfThreeOuts();
  }

  if (started(current)) result.push(toRecord(current, null, null));

  return {
    plateAppearances: result,
    state: { inning, outs, bases, count: current.count },
  };
}
