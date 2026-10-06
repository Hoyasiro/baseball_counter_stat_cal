// 스코어보드(이닝별 점수판).
// 아이가 나온 장면에서 기록한 점수·안타·실책은 기록에서 계산하고, 직접 넣은 점수가 있으면 그 값을 쓴다.
// (아이 장면만 기록하므로 기록은 그 이닝의 일부일 수 있다. 정확한 점수는 직접 넣는 값이 우선이다.)

import { ScoreEvent, TOTAL_FIELDS, TeamTotalEvent, Team, TotalField, UndoableEvent } from './events';
import { offensiveHalf, defensiveHalf } from './innings';
import { GameReplay, halfKey } from './replay';

/** 경기 이닝 수를 몰라도 이 정도는 칸을 보여준다. (정규 9회. 연장은 기록이 있으면 늘어난다) */
export const MIN_INNINGS_SHOWN = 9;

export interface LineScore {
  readonly innings: readonly number[];
  /** 이닝별 점수. 모르면 null */
  readonly runs: Record<Team, readonly (number | null)[]>;
  /** 직접 넣은 점수인지 */
  readonly manual: Record<Team, readonly boolean[]>;
  readonly totalRuns: Record<Team, number>;
  /** 기록한 장면에서 센 안타 */
  readonly hits: Record<Team, number>;
  /** 기록한 장면에서 센 실책 (그 팀이 저지른 실책) */
  readonly errors: Record<Team, number>;
  /** 합계 칸(R·H·E)에 직접 넣은 값인지 */
  readonly manualTotals: Record<Team, Record<TotalField, boolean>>;
}

/** 팀·합계 칸별로 마지막에 넣은 값 */
function manualTotals(events: readonly UndoableEvent[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const e of events) if (e.kind === 'teamTotal') totals.set(`${e.team}:${e.field}`, e.value);
  return totals;
}

/** 그 합계 칸에 직접 넣은 값 이벤트들. "기록대로 되돌리기"는 이것들을 취소한다. */
export function totalEventIds(events: readonly UndoableEvent[], team: Team, field: TotalField): string[] {
  return events.filter((e): e is TeamTotalEvent => e.kind === 'teamTotal' && e.team === team && e.field === field).map((e) => e.id);
}

function scoreKey(team: Team, inning: number): string {
  return `${team}:${inning}`;
}

/** 팀·이닝별로 마지막에 넣은 점수 */
export function manualScores(events: readonly UndoableEvent[]): Map<string, number> {
  const scores = new Map<string, number>();
  for (const e of events) {
    if (e.kind === 'score') scores.set(scoreKey(e.team, e.inning), e.runs);
  }
  return scores;
}

/** 그 칸에 직접 넣은 점수 이벤트들. "기록대로 되돌리기"는 이것들을 취소한다. */
export function scoreEventIds(events: readonly UndoableEvent[], team: Team, inning: number): string[] {
  return events.filter((e): e is ScoreEvent => e.kind === 'score' && e.team === team && e.inning === inning).map((e) => e.id);
}

export function lineScore(replay: GameReplay, events: readonly UndoableEvent[]): LineScore {
  const manual = manualScores(events);
  const halfOf: Record<Team, 'top' | 'bottom'> = {
    us: offensiveHalf(replay.battingFirst),
    them: defensiveHalf(replay.battingFirst),
  };
  const recordedInnings = [...replay.halves.keys()].map((k) => Number.parseInt(k, 10));
  const scoreInnings = events.filter((e): e is ScoreEvent => e.kind === 'score').map((e) => e.inning);
  const stateInning = replay.state?.inning ?? 0;
  const last = Math.max(MIN_INNINGS_SHOWN, stateInning, ...recordedInnings, ...scoreInnings);
  const innings = Array.from({ length: last }, (_, i) => i + 1);

  const runsFor = (team: Team, inning: number): number | null => {
    const typed = manual.get(scoreKey(team, inning));
    if (typed !== undefined) return typed;
    return replay.halves.get(halfKey(inning, halfOf[team]))?.runs ?? null;
  };
  const sumOf = (team: Team, field: 'hits' | 'errors'): number =>
    innings.reduce((n, i) => n + (replay.halves.get(halfKey(i, halfOf[team]))?.[field] ?? 0), 0);

  const runs = {
    us: innings.map((i) => runsFor('us', i)),
    them: innings.map((i) => runsFor('them', i)),
  };
  const total = (list: readonly (number | null)[]): number => list.reduce<number>((a, b) => a + (b ?? 0), 0);
  // 합계 칸에 직접 넣은 값이 있으면 그 값을 쓴다. (아이 기록만 남기다 보니 최종 결과만 넣는 경우)
  const typedTotals = manualTotals(events);
  const pick = (team: Team, field: TotalField, counted: number): number => typedTotals.get(`${team}:${field}`) ?? counted;
  const flags = (team: Team): Record<TotalField, boolean> =>
    Object.fromEntries(TOTAL_FIELDS.map((f) => [f, typedTotals.has(`${team}:${f}`)])) as Record<TotalField, boolean>;

  return {
    innings,
    runs,
    manual: {
      us: innings.map((i) => manual.has(scoreKey('us', i))),
      them: innings.map((i) => manual.has(scoreKey('them', i))),
    },
    totalRuns: { us: pick('us', 'runs', total(runs.us)), them: pick('them', 'runs', total(runs.them)) },
    // 안타는 공격한 팀, 실책은 수비한 팀의 것
    hits: { us: pick('us', 'hits', sumOf('us', 'hits')), them: pick('them', 'hits', sumOf('them', 'hits')) },
    errors: { us: pick('us', 'errors', sumOf('them', 'errors')), them: pick('them', 'errors', sumOf('us', 'errors')) },
    manualTotals: { us: flags('us'), them: flags('them') },
  };
}
