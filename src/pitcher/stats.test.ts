import { describe, expect, it } from 'vitest';
import { buildPlateAppearances } from '../common/pitch-log';
import { pitches } from '../common/test-helpers';
import { battingAverageAgainst, byEndCount, pitchCount, strikeRate, strikeouts, walks } from './stats';

// 타석1: 볼 스트라이크 안타            (1-1에서 안타)
// 타석2: 스트라이크 스트라이크 스트라이크 (0-2에서 삼진)
// 타석3: 볼 볼 볼 볼                   (3-0에서 볼넷)
// 타석4: 파울 아웃                     (0-1에서 아웃)
const game = buildPlateAppearances(
  pitches(
    'ball', 'strike', 'hit',
    'strike', 'strike', 'strike',
    'ball', 'ball', 'ball', 'ball',
    'foul', 'out',
  ),
);

describe('투수 통계', () => {
  it('투구 수는 3 + 3 + 4 + 2 = 12', () => {
    const c = pitchCount(game);
    expect(c.value).toBe(12);
    expect(c.expression).toBe('3 + 3 + 4 + 2');
  });

  it('스트라이크 비율 = 7 ÷ 12 (파울·친 공 포함, 볼 5개 제외)', () => {
    const c = strikeRate(game);
    expect(c.expression).toBe('7 ÷ 12');
    expect(c.value).toBeCloseTo(7 / 12);
    expect(c.display).toBe('58.3%');
  });

  it('삼진 1, 볼넷 1, 타석 번호를 근거로 남긴다', () => {
    expect(strikeouts(game).value).toBe(1);
    expect(strikeouts(game).terms[0].plateAppearances).toEqual([2]);
    expect(walks(game).terms[0].plateAppearances).toEqual([3]);
  });

  it('피안타율 = 안타 1 ÷ 타수 3 (볼넷 제외) = .333', () => {
    const c = battingAverageAgainst(game);
    expect(c.expression).toBe('1 ÷ 3');
    expect(c.display).toBe('.333');
    expect(c.terms[1].plateAppearances).toEqual([1, 2, 4]);
  });

  it('타수가 0이면 0이 아니라 계산 불가(-)', () => {
    const onlyWalk = buildPlateAppearances(pitches('ball', 'ball', 'ball', 'ball'));
    const c = battingAverageAgainst(onlyWalk);
    expect(c.value).toBeNull();
    expect(c.display).toBe('-');
    expect(c.note).toContain('계산할 수 없음');
  });

  it('공이 없으면 스트라이크 비율도 계산 불가', () => {
    expect(strikeRate([]).value).toBeNull();
  });

  it('카운트별(종료 카운트 기준)은 타석이 있는 카운트만 보여준다', () => {
    const rows = byEndCount(game);
    expect(rows.map((r) => `${r.count.balls}-${r.count.strikes}`)).toEqual(['0-1', '0-2', '1-1', '3-0']);
    const oneOne = rows.find((r) => r.count.balls === 1 && r.count.strikes === 1)!;
    expect(oneOne.battingAverageAgainst.display).toBe('1.000');
    const threeZero = rows.find((r) => r.count.balls === 3)!;
    expect(threeZero.battingAverageAgainst.display).toBe('-');
  });

  it('진행 중인 타석은 투구 수에는 들어가고 타석 결과에는 안 들어간다', () => {
    const pas = buildPlateAppearances(pitches('hit', 'ball'));
    expect(pitchCount(pas).value).toBe(2);
    expect(battingAverageAgainst(pas).expression).toBe('1 ÷ 1');
  });
});
