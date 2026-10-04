// 스코어보드(이닝별 점수판). 투구 기록이 있는 이닝의 상대 점수·안타·우리 실책은 기록에서 계산하고,
// 우리 팀 점수와 기록이 없는 이닝의 상대 점수는 사용자가 직접 넣은 값을 쓴다.

import { ScoreEvent, Team, UndoableEvent } from './events';
import { GameReplay } from './replay';

/** 경기 이닝 수를 몰라도 이 정도는 칸을 보여준다. */
const MIN_INNINGS_SHOWN = 7;

export interface LineScore {
  readonly innings: readonly number[];
  /** 이닝별 점수. 모르면 null */
  readonly runs: Record<Team, readonly (number | null)[]>;
  /** 투구 기록에서 계산한 이닝인지 (상대 점수를 직접 넣을 수 없음) */
  readonly recorded: readonly boolean[];
  readonly totalRuns: Record<Team, number>;
  /** 상대 팀 안타 (기록에서 계산) */
  readonly opponentHits: number;
  /** 우리 팀 실책 (기록에서 계산) */
  readonly ourErrors: number;
}

/** 팀·이닝별로 마지막에 넣은 점수 */
export function manualScores(events: readonly UndoableEvent[]): Map<string, number> {
  const scores = new Map<string, number>();
  for (const e of events) {
    if (e.kind === 'score') scores.set(scoreKey(e.team, e.inning), e.runs);
  }
  return scores;
}

function scoreKey(team: Team, inning: number): string {
  return `${team}:${inning}`;
}

export function lineScore(replay: GameReplay, events: readonly UndoableEvent[]): LineScore {
  const pas = replay.plateAppearances;
  const manual = manualScores(events);
  const scoreInnings = events.filter((e): e is ScoreEvent => e.kind === 'score').map((e) => e.inning);
  const last = Math.max(MIN_INNINGS_SHOWN, replay.state.inning, ...pas.map((pa) => pa.inning), ...scoreInnings);
  const innings = Array.from({ length: last }, (_, i) => i + 1);

  const recordedInnings = new Set(pas.map((pa) => pa.inning));
  const recorded = innings.map((i) => recordedInnings.has(i));
  const autoRuns = (inning: number): number =>
    pas.filter((pa) => pa.inning === inning).reduce((sum, pa) => sum + pa.runs, 0);

  const them = innings.map((i) => (recordedInnings.has(i) ? autoRuns(i) : (manual.get(scoreKey('them', i)) ?? null)));
  const us = innings.map((i) => manual.get(scoreKey('us', i)) ?? null);
  const sum = (list: readonly (number | null)[]): number => list.reduce<number>((a, b) => a + (b ?? 0), 0);

  return {
    innings,
    runs: { us, them },
    recorded,
    totalRuns: { us: sum(us), them: sum(them) },
    opponentHits: pas.filter((pa) => pa.outcome === 'hit').length,
    ourErrors: pas.reduce((n, pa) => n + pa.errors, 0),
  };
}
