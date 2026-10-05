import { describe, expect, it } from 'vitest';
import { PlayLogEvent } from '../common/events';
import { replayGame } from '../common/replay';
import { GameForStats } from '../common/stat-base';
import { adjust, appear, hit, pitchWith, pitches, play, settings } from '../common/test-helpers';
import {
  battedBallTypes,
  charts,
  battingAverage,
  byEndCount,
  caughtStealing,
  leftOnBase,
  onBasePercentage,
  ops,
  pickedOff,
  pickoffsReceived,
  pitchesSeen,
  plateAppearances,
  runsScored,
  slugging,
  stolenBases,
  strikeouts,
} from './stats';

const asGame = (events: PlayLogEvent[]): GameForStats => ({ label: '10월 4일 ○○전', replay: replayGame(events, settings()) });

// 아이 타석 5번 (후공이라 말 공격)
//  1회: 2루타 → 3루 도루 성공 → 뒤 타자 1루타에 득점(1루타: 3루→홈)
//  2회: 볼넷 → 견제 받음 → 2루 도루 실패
//  3회: 삼진 (볼 1 · 스트라이크 2에서)
//  4회: 몸에 맞는 공 → 3아웃 잔루
//  5회: 홈런
const game = asGame([
  appear('batter', { inning: 1 }),
  ...pitches('ball'),
  hit('double'),
  play('stolenBase', 1),
  hit('single'),
  appear('batter', { inning: 2 }),
  ...pitches('ball', 'ball', 'ball', 'ball'),
  play('pickoff', 0),
  play('caughtStealing', 0),
  appear('batter', { inning: 3 }),
  ...pitches('ball', 'strike', 'strike', 'strike'),
  appear('batter', { inning: 4, outs: 2 }),
  ...pitches('hitByPitch'),
  ...pitches('out'),
  appear('batter', { inning: 5 }),
  hit('homeRun'),
]);

describe('타자 통계', () => {
  it('타석 5, 타율 = 안타 2 ÷ 타수 3 = .667', () => {
    expect(plateAppearances([game]).value).toBe(5);
    const avg = battingAverage([game]);
    expect(avg.expression).toBe('2 ÷ 3');
    expect(avg.display).toBe('.667');
  });

  it('출루율 = (안타 2 + 볼넷 1 + 몸에 맞는 공 1) ÷ 5 = .800', () => {
    expect(onBasePercentage([game]).expression).toBe('4 ÷ 5');
    expect(onBasePercentage([game]).display).toBe('.800');
  });

  it('장타율 = 루타 6 (2루타 2 + 홈런 4) ÷ 3 = 2.000, OPS = .800 + 2.000', () => {
    expect(slugging([game]).expression).toBe('6 ÷ 3');
    expect(ops([game]).display).toBe('2.800');
    expect(ops([game]).expression).toBe('.800 + 2.000');
  });

  it('동료 타자의 타석은 타자 통계에 들어가지 않는다', () => {
    expect(strikeouts([game]).value).toBe(1);
    // 본 공: 2 + 4 + 4 + 1 + 1 = 12
    expect(pitchesSeen([game]).expression).toBe('12 ÷ 5');
  });

  it('카운트별 타율 (종료 카운트 기준)', () => {
    const rows = byEndCount([game]);
    expect(rows.map((r) => `${r.count.balls}-${r.count.strikes}`)).toEqual(['0-0', '1-0', '1-2', '3-0']);
    expect(rows.find((r) => r.count.balls === 1 && r.count.strikes === 0)!.battingAverage.display).toBe('1.000');
  });

  it('주루: 도루 성공 1, 실패 1, 견제 받음 1, 득점 2 (뒤 타자 안타 + 홈런), 잔루 1', () => {
    expect(stolenBases([game]).value).toBe(1);
    expect(caughtStealing([game]).value).toBe(1);
    expect(pickoffsReceived([game]).value).toBe(1);
    expect(pickedOff([game]).value).toBe(0);
    expect(runsScored([game]).value).toBe(2);
    expect(leftOnBase([game]).value).toBe(1);
  });

  it('타석이 없으면 계산 불가', () => {
    const empty = asGame([appear('runner', { childBase: 0 }), adjust(1, 0, [false, false, false], 1, 'scored')]);
    expect(battingAverage([empty]).display).toBe('-');
    expect(runsScored([empty]).value).toBe(1);
  });
});

describe('아이가 친 타구', () => {
  const g = asGame([
    appear('batter'),
    pitchWith('ball', { zone: { x: 0.9, y: 0.5 } }),
    pitchWith('hit', { hitType: 'double', zone: { x: 0.5, y: 0.6 }, battedBall: { x: 0.2, y: 0.5, type: 'fly', strength: 'hard' } }),
  ]);

  it('뜬공 1 ÷ 1, 세게 맞은 타구 1 ÷ 1', () => {
    const [, , fly, hard] = battedBallTypes([g]);
    expect(fly.display).toBe('100.0%');
    expect(hard.expression).toBe('1 ÷ 1');
  });

  it('본 공의 존 점 2개, 낙구 점 1개(안타)', () => {
    const c = charts([g]);
    expect(c.zone.map((p) => p.kind)).toEqual(['ball', 'inPlay']);
    expect(c.spray).toEqual([{ x: 0.2, y: 0.5, kind: 'hit' }]);
  });
});
