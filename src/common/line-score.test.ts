import { describe, expect, it } from 'vitest';
import { lineScore } from './line-score';
import { replayGame } from './replay';
import { adjust, hit, pitches, score } from './test-helpers';

describe('스코어보드', () => {
  // 3회부터 던짐. 3회: 홈런 1점, 실책 출루, 아웃 3개 / 우리 팀 점수는 직접 넣음
  const events = [hit('homeRun'), ...pitches('reachedOnError', 'out', 'out', 'out')];
  const replay = replayGame(events, 3);
  const extra = [score('us', 1, 2), score('them', 1, 1), score('us', 1, 3), score('them', 3, 9)];

  it('기록이 있는 이닝의 상대 점수는 기록에서 계산 (직접 넣은 값은 무시)', () => {
    const ls = lineScore(replay, extra);
    expect(ls.runs.them[2]).toBe(1);
    expect(ls.recorded[2]).toBe(true);
  });

  it('기록이 없는 이닝은 직접 넣은 점수, 같은 이닝은 마지막 값', () => {
    const ls = lineScore(replay, extra);
    expect(ls.runs.them[0]).toBe(1);
    expect(ls.runs.us[0]).toBe(3);
    expect(ls.runs.us[1]).toBeNull();
  });

  it('합계·안타·실책', () => {
    const ls = lineScore(replay, extra);
    expect(ls.totalRuns).toEqual({ us: 3, them: 2 });
    expect(ls.opponentHits).toBe(1);
    expect(ls.ourErrors).toBe(1);
  });

  it('최소 7회까지 칸을 보여주고, 더 진행되면 늘린다', () => {
    expect(lineScore(replay, []).innings).toHaveLength(7);
    expect(lineScore(replayGame([adjust(9, 0, [false, false, false])], 1), []).innings).toHaveLength(9);
  });
});
