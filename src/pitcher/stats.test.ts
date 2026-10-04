import { describe, expect, it } from 'vitest';
import { formatSources } from '../common/calculation';
import { replayGame } from '../common/replay';
import { adjust, pitches, play } from '../common/test-helpers';
import {
  GameForStats,
  battingAverageAgainst,
  byEndCount,
  caughtStealingSecond,
  inningsPitched,
  pickoffAttempts,
  pitchCount,
  strikeRate,
  strikeouts,
  walks,
  wildPitches,
} from './stats';

// 1회
//  타석1: 볼 스트라이크 안타              (볼 1 · 스트라이크 1에서 안타)          → 주자 1루
//  타석2: 견제, 스트라이크 번트파울 번트파울 (볼 0 · 스트라이크 2에서 쓰리번트 삼진) → 1아웃
//  타석3: 와일드피치 볼 볼 볼            (볼 3 · 스트라이크 0에서 볼넷)          → 주자 1·2루 (WP로 2루, 볼넷)
//  타석4: 파울 아웃                       (볼 0 · 스트라이크 1에서 아웃)          → 2아웃
//  타석5: 볼, 2루 도루 실패?  → 2루가 차 있어 실제로는 불가. 대신 1루 주자 견제 아웃으로 3아웃
const events = [
  ...pitches('ball', 'strike', 'hit'),
  play('pickoff'),
  ...pitches('strike', 'buntFoul', 'buntFoul'),
  ...pitches('wildPitch', 'ball', 'ball', 'ball'),
  ...pitches('foul', 'out'),
  ...pitches('ball'),
  play('pickoffOut', 0),
];
const game: GameForStats = { label: '10월 4일 ○○전', replay: replayGame(events, 1) };

describe('투수 통계 (한 경기)', () => {
  it('투구 수 = 이닝별 합: 1회 3 + 3 + 4 + 2 + 1 = 13', () => {
    const c = pitchCount([game]);
    expect(c.value).toBe(13);
    expect(c.expression).toBe('1회 13');
  });

  it('스트라이크 비율 = 7 ÷ 13 (번트 파울 포함, 와일드피치는 볼)', () => {
    // 스트라이크: 타석1 스트라이크·안타(2), 타석2 3개, 타석4 파울·아웃(2) = 7
    const c = strikeRate([game]);
    expect(c.expression).toBe('7 ÷ 13');
    expect(c.display).toBe('53.8%');
  });

  it('던진 이닝 = 잡은 아웃 3 ÷ 3 = 1 (삼진·아웃·견제 아웃)', () => {
    const c = inningsPitched([game]);
    expect(c.expression).toBe('3 ÷ 3');
    expect(c.display).toBe('1');
  });

  it('쓰리번트 아웃은 삼진으로 센다', () => {
    expect(strikeouts([game]).value).toBe(1);
    expect(strikeouts([game]).terms[0].sources[0].plateAppearance).toBe(2);
  });

  it('볼넷 1, 와일드피치 1, 견제 2 (견제 아웃 포함)', () => {
    expect(walks([game]).value).toBe(1);
    expect(wildPitches([game]).value).toBe(1);
    expect(pickoffAttempts([game]).value).toBe(2);
  });

  it('피안타율 = 안타 1 ÷ 상대 타수 3 = .333 (볼넷, 중단된 타석 제외)', () => {
    const c = battingAverageAgainst([game]);
    expect(c.expression).toBe('1 ÷ 3');
    expect(c.display).toBe('.333');
    expect(formatSources(c.terms[1].sources)).toBe('1회 1·2·4번째 타석');
  });

  it('타수가 0이면 계산 불가(-)와 이유', () => {
    const onlyWalk: GameForStats = { label: 'x', replay: replayGame(pitches('ball', 'ball', 'ball', 'ball'), 1) };
    const c = battingAverageAgainst([onlyWalk]);
    expect(c.value).toBeNull();
    expect(c.display).toBe('-');
    expect(c.note).toContain('계산할 수 없음');
  });

  it('공이 없으면 스트라이크 비율도 계산 불가', () => {
    expect(strikeRate([]).value).toBeNull();
  });

  it('카운트별(종료 카운트 기준), 중단된 타석은 빠진다', () => {
    const rows = byEndCount([game]);
    expect(rows.map((r) => `${r.count.balls}-${r.count.strikes}`)).toEqual(['0-1', '0-2', '1-1', '3-0']);
    expect(rows.find((r) => r.count.balls === 1)!.battingAverageAgainst.display).toBe('1.000');
    expect(rows.find((r) => r.count.balls === 3)!.battingAverageAgainst.display).toBe('-');
  });
});

describe('여러 경기 합계', () => {
  const second: GameForStats = {
    label: '10월 11일 △△전',
    replay: replayGame([adjust(2, 1, [true, false, false]), play('caughtStealingSecond'), ...pitches('hit')], 2),
  };

  it('투구 수는 경기별로 더한다', () => {
    expect(pitchCount([game, second]).expression).toBe('10월 4일 ○○전 13 + 10월 11일 △△전 1');
  });

  it('출처는 경기별로 묶어 보여준다', () => {
    const c = battingAverageAgainst([game, second]);
    expect(c.expression).toBe('2 ÷ 4');
    expect(formatSources(c.terms[0].sources)).toBe('10월 4일 ○○전: 1회 1번째 타석 / 10월 11일 △△전: 2회 1번째 타석');
  });

  it('도루 저지와 던진 이닝 (1회 3아웃 + 2회 도루 저지 1아웃 = 4아웃 → 1 1/3)', () => {
    expect(caughtStealingSecond([game, second]).value).toBe(1);
    expect(inningsPitched([game, second]).display).toBe('1 1/3');
  });
});
