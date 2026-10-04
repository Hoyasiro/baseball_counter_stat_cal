import { describe, expect, it } from 'vitest';
import { formatSources } from '../common/calculation';
import { PlayLogEvent } from '../common/events';
import { replayGame } from '../common/replay';
import { appear, hit, pitches, play, settings } from '../common/test-helpers';
import {
  GameForStats,
  battingAverageAgainst,
  byEndCount,
  caughtStealing,
  errorsBehind,
  extraBaseHitsAllowed,
  homeRunsAllowed,
  inningsPitched,
  pickoffAttempts,
  pitchCount,
  pitchesByInning,
  runsAllowed,
  sluggingAgainst,
  stolenBasesAllowed,
  strikeRate,
  strikeouts,
  walks,
  wildPitches,
} from './stats';

const asGame = (label: string, events: PlayLogEvent[]): GameForStats => ({ label, replay: replayGame(events, settings()) });

// 1회 선발
//  타석1: 볼 스트라이크 1루타                 (볼 1 · 스트라이크 1)
//  타석2: 견제, 스트라이크 번트파울 번트파울   (쓰리번트 삼진)
//  타석3: 와일드피치 볼 볼 볼                 (볼넷)
//  타석4: 파울 아웃
//  타석5: 볼, 견제 아웃 → 3아웃 (중단)
const game = asGame('10월 4일 ○○전', [
  appear('pitcher'),
  ...pitches('ball', 'strike'),
  hit('single'),
  play('pickoff', 0),
  ...pitches('strike', 'buntFoul', 'buntFoul'),
  ...pitches('wildPitch', 'ball', 'ball', 'ball'),
  ...pitches('foul', 'out'),
  ...pitches('ball'),
  play('pickoffOut', 0),
]);

describe('투수 통계 (한 경기)', () => {
  it('투구 수 = 1회 13', () => {
    expect(pitchCount([game]).expression).toBe('1회 13');
  });

  it('스트라이크 비율 = 7 ÷ 13 (번트 파울 포함, 와일드피치는 볼)', () => {
    const c = strikeRate([game]);
    expect(c.expression).toBe('7 ÷ 13');
    expect(c.display).toBe('53.8%');
  });

  it('던진 이닝 = 잡은 아웃 3 ÷ 3 = 1', () => {
    expect(inningsPitched([game]).display).toBe('1');
  });

  it('쓰리번트 아웃은 삼진, 볼넷 1, 와일드피치 1, 견제 2', () => {
    expect(strikeouts([game]).value).toBe(1);
    expect(walks([game]).value).toBe(1);
    expect(wildPitches([game]).value).toBe(1);
    expect(pickoffAttempts([game]).value).toBe(2);
  });

  it('피안타율 = 1 ÷ 3 = .333 (볼넷·중단 타석 제외)', () => {
    const c = battingAverageAgainst([game]);
    expect(c.formula).toBe('맞은 안타 ÷ 상대 타수');
    expect(c.display).toBe('.333');
    expect(formatSources(c.terms[1].sources)).toBe('1회 1·2·4번째 타석');
  });

  it('카운트별(종료 카운트 기준)은 기록에 있는 카운트만', () => {
    const rows = byEndCount([game]);
    expect(rows.map((r) => `${r.count.balls}-${r.count.strikes}`)).toEqual(['0-1', '0-2', '1-1', '3-0']);
  });

  it('타수가 0이면 계산 불가(-)와 이유', () => {
    const c = battingAverageAgainst([asGame('x', [appear('pitcher'), ...pitches('ball', 'ball', 'ball', 'ball')])]);
    expect(c.display).toBe('-');
    expect(c.note).toContain('계산할 수 없음');
  });
});

describe('안타 종류·실점·실책·도루', () => {
  const g = asGame('x', [
    appear('pitcher'),
    hit('double'),
    hit('homeRun'),
    ...pitches('reachedOnError'),
    play('stolenBase', 0),
    play('caughtStealing', 1),
    ...pitches('strike', 'strike', 'strike', 'out'),
  ]);

  it('실점 2, 장타 2, 홈런 1', () => {
    expect(runsAllowed([g]).value).toBe(2);
    expect(extraBaseHitsAllowed([g]).value).toBe(2);
    expect(homeRunsAllowed([g]).value).toBe(1);
  });

  it('피장타율 = 6 ÷ 5 = 1.200, 피안타율 = 2 ÷ 5', () => {
    expect(sluggingAgainst([g]).display).toBe('1.200');
    expect(battingAverageAgainst([g]).expression).toBe('2 ÷ 5');
  });

  it('수비 실책 1, 도루 허용 1, 도루 저지 1, 이닝별 투구 수', () => {
    expect(errorsBehind([g]).value).toBe(1);
    expect(stolenBasesAllowed([g]).value).toBe(1);
    expect(caughtStealing([g]).value).toBe(1);
    expect(pitchesByInning([g])[0].expression).toBe('1 + 1 + 1 + 3 + 1');
  });
});

describe('투수 장면만 센다', () => {
  it('같은 경기의 아이 타석은 투수 통계에 들어가지 않는다', () => {
    const g = asGame('x', [appear('pitcher'), ...pitches('out'), appear('batter', { inning: 1 }), hit('single')]);
    expect(pitchCount([g]).value).toBe(1);
    expect(battingAverageAgainst([g]).expression).toBe('0 ÷ 1');
  });

  it('중계로 들어와 이어받은 카운트도 아이가 끝낸 타석이면 아이 기록', () => {
    const g = asGame('x', [appear('pitcher', { inning: 5, outs: 2, balls: 3, strikes: 2 }), ...pitches('strike')]);
    expect(strikeouts([g]).value).toBe(1);
    expect(pitchCount([g]).value).toBe(1);
    expect(inningsPitched([g]).display).toBe('1/3');
  });
});

describe('여러 경기 합계', () => {
  const second = asGame('10월 11일 △△전', [appear('pitcher', { inning: 2, outs: 1, bases: [true, false, false] }), play('caughtStealingSecond'), hit('single')]);

  it('투구 수는 경기별로 더하고, 출처는 경기별로 묶는다', () => {
    expect(pitchCount([game, second]).expression).toBe('10월 4일 ○○전 13 + 10월 11일 △△전 1');
    const c = battingAverageAgainst([game, second]);
    expect(formatSources(c.terms[0].sources)).toBe('10월 4일 ○○전: 1회 1번째 타석 / 10월 11일 △△전: 2회 1번째 타석');
  });

  it('던진 이닝: 3아웃 + 1아웃 = 1 1/3', () => {
    expect(inningsPitched([game, second]).display).toBe('1 1/3');
  });
});
