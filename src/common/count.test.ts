import { describe, expect, it } from 'vitest';
import { DEFAULT_RULES, allCounts, countKey, countLabel, createCount, isValidCount, isValidRules } from './count';

describe('카운트', () => {
  it('정식 규칙의 카운트는 12개 (0-0 ~ 3-2)', () => {
    expect(allCounts()).toHaveLength(12);
    expect(countKey(allCounts()[0])).toBe('0-0');
    expect(countKey(allCounts()[11])).toBe('3-2');
  });

  it('규칙을 바꾸면 카운트 수도 바뀐다 (볼 5개 볼넷, 스트라이크 4개 삼진 → 5×4 = 20개)', () => {
    expect(allCounts({ ballsForWalk: 5, strikesForStrikeout: 4, outsPerInning: 3 })).toHaveLength(20);
  });

  it('존재할 수 없는 카운트는 오류', () => {
    expect(isValidCount(3, 2)).toBe(true);
    expect(() => createCount(4, 0)).toThrow('존재할 수 없는 카운트');
    expect(() => createCount(0, 3)).toThrow('존재할 수 없는 카운트');
    expect(() => createCount(-1, 0)).toThrow();
  });

  it('규칙 범위 검사', () => {
    expect(isValidRules(DEFAULT_RULES)).toBe(true);
    expect(isValidRules({ ballsForWalk: 0, strikesForStrikeout: 3, outsPerInning: 3 })).toBe(false);
  });

  it('코드용은 숫자, 화면용은 글자로 표기한다', () => {
    expect(countKey({ balls: 2, strikes: 1 })).toBe('2-1');
    expect(countLabel({ balls: 2, strikes: 1 })).toBe('볼 2 · 스트라이크 1');
  });
});
