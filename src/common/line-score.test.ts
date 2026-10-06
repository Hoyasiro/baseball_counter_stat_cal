import { describe, expect, it } from 'vitest';
import { lineScore, scoreEventIds, totalEventIds } from './line-score';
import { replayGame } from './replay';
import { appear, hit, pitches, score, settings, total } from './test-helpers';

describe('스코어보드 (후공: 상대 공격은 초, 우리 공격은 말)', () => {
  // 3회초 아이가 투수: 홈런(1점), 실책 출루, 3아웃 / 3회말 아이가 타자: 2루타
  const events = [
    appear('pitcher', { inning: 3 }),
    hit('homeRun'),
    ...pitches('reachedOnError', 'out', 'out', 'out'),
    appear('batter', { inning: 3 }),
    hit('double'),
  ];
  const replay = replayGame(events, settings());

  it('기록에서 계산: 상대 3회 1점·1안타, 우리 실책 1, 우리 안타 1', () => {
    const ls = lineScore(replay, []);
    expect(ls.runs.them[2]).toBe(1);
    expect(ls.hits).toEqual({ us: 1, them: 1 });
    expect(ls.errors).toEqual({ us: 1, them: 0 });
  });

  it('직접 넣은 점수가 기록보다 우선, 같은 이닝은 마지막 값', () => {
    const ls = lineScore(replay, [score('them', 3, 2), score('us', 1, 2), score('us', 1, 3)]);
    expect(ls.runs.them[2]).toBe(2);
    expect(ls.manual.them[2]).toBe(true);
    expect(ls.runs.us[0]).toBe(3);
    expect(ls.totalRuns).toEqual({ us: 3, them: 2 });
  });

  it('기록도 입력도 없는 이닝은 값 없음(화면에는 0), 정규 9회까지는 칸을 보여준다', () => {
    const ls = lineScore(replay, []);
    expect(ls.runs.us[1]).toBeNull();
    expect(ls.innings).toHaveLength(9);
  });

  it('"기록대로 되돌리기"는 그 칸에 직접 넣은 점수만 취소 대상으로 고른다', () => {
    const events = [score('us', 2, 3), score('them', 2, 1), score('us', 2, 4)];
    expect(scoreEventIds(events, 'us', 2)).toEqual([events[0].id, events[2].id]);
    expect(scoreEventIds(events, 'us', 3)).toEqual([]);
  });
});

describe('점수 없이 막은 이닝', () => {
  it('아이가 던진 이닝은 0점으로 남는다', () => {
    const r = replayGame([appear('pitcher', { inning: 2 }), ...pitches('out', 'out', 'out')], settings());
    expect(lineScore(r, []).runs.them[1]).toBe(0);
    expect(lineScore(r, []).runs.them[2]).toBeNull();
  });
});

describe('스코어보드 합계 칸 직접 넣기', () => {
  it('R·H·E에 넣은 값이 기록에서 센 값보다 우선하고, 넣은 칸 표시가 남는다', () => {
    const r = replayGame([appear('pitcher'), hit('homeRun')], settings());
    const events = [total('them', 'runs', 5), total('us', 'hits', 7), total('them', 'runs', 6)];
    const ls = lineScore(r, events);
    expect(ls.totalRuns.them).toBe(6);
    expect(ls.hits.us).toBe(7);
    expect(ls.hits.them).toBe(1);
    expect(ls.manualTotals.them.runs).toBe(true);
    expect(ls.manualTotals.us.runs).toBe(false);
    expect(totalEventIds(events, 'them', 'runs')).toEqual([events[0].id, events[2].id]);
  });
});
