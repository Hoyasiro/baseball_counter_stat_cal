import { describe, expect, it } from 'vitest';
import { advanceRunners, basesLabel, batterAdvance, forceAdvance, stealAdvance, stealableBases } from './bases';

describe('주자 이동과 득점', () => {
  it('밀어내기: 만루에서만 1점', () => {
    expect(forceAdvance([true, true, true])).toEqual({ bases: [true, true, true], runs: 1 });
    expect(forceAdvance([false, false, true])).toEqual({ bases: [true, false, true], runs: 0 });
    expect(forceAdvance([true, false, true])).toEqual({ bases: [true, true, true], runs: 0 });
  });

  it('한 베이스씩 진루: 만루면 1점', () => {
    expect(advanceRunners([true, true, true], 1)).toEqual({ bases: [false, true, true], runs: 1 });
  });

  it('1루타: 1·3루 → 1·2루, 1점', () => {
    expect(batterAdvance([true, false, true], 1)).toEqual({ bases: [true, true, false], runs: 1 });
  });

  it('2루타: 1루 주자는 3루, 타자는 2루', () => {
    expect(batterAdvance([true, false, false], 2)).toEqual({ bases: [false, true, true], runs: 0 });
  });

  it('3루타: 만루면 3점, 타자는 3루', () => {
    expect(batterAdvance([true, true, true], 3)).toEqual({ bases: [false, false, true], runs: 3 });
  });

  it('홈런: 만루면 4점, 베이스는 빈다', () => {
    expect(batterAdvance([true, true, true], 4)).toEqual({ bases: [false, false, false], runs: 4 });
    expect(batterAdvance([false, false, false], 4)).toEqual({ bases: [false, false, false], runs: 1 });
  });

  it('도루: 2루 → 3루, 3루 → 홈은 득점', () => {
    expect(stealAdvance([false, true, false], 1)).toEqual({ bases: [false, false, true], runs: 0 });
    expect(stealAdvance([false, false, true], 2)).toEqual({ bases: [false, false, false], runs: 1 });
  });

  it('도루할 수 있는 주자는 다음 베이스가 빈 주자 (3루는 홈 도루)', () => {
    expect(stealableBases([true, true, false])).toEqual([1]);
    expect(stealableBases([true, false, true])).toEqual([0, 2]);
    expect(stealableBases([true, true, true])).toEqual([2]);
  });

  it('화면 표기', () => {
    expect(basesLabel([false, false, false])).toBe('주자 없음');
    expect(basesLabel([true, false, true])).toBe('주자 1·3루');
    expect(basesLabel([true, true, true])).toBe('만루');
  });
});
