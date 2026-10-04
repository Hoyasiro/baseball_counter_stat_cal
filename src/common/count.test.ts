import { describe, expect, it } from 'vitest';
import { allCounts, countKey, countLabel, createCount, isValidCount } from './count';

describe('카운트', () => {
  it('가능한 카운트는 12개다', () => {
    expect(allCounts()).toHaveLength(12);
    expect(allCounts().map(countKey)[0]).toBe('0-0');
    expect(allCounts().map(countKey)[11]).toBe('3-2');
  });

  it('초구와 풀카운트는 유효하다', () => {
    expect(isValidCount(0, 0)).toBe(true);
    expect(isValidCount(3, 2)).toBe(true);
  });

  it('존재할 수 없는 카운트는 오류를 낸다', () => {
    expect(() => createCount(4, 0)).toThrow('존재할 수 없는 카운트');
    expect(() => createCount(0, 3)).toThrow('존재할 수 없는 카운트');
    expect(() => createCount(-1, 0)).toThrow();
  });

  it('코드용은 숫자, 화면용은 글자로 표기한다', () => {
    expect(countKey({ balls: 2, strikes: 1 })).toBe('2-1');
    expect(countLabel({ balls: 2, strikes: 1 })).toBe('볼 2 · 스트라이크 1');
  });
});
