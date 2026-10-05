import { describe, expect, it } from 'vitest';
import { allCounts, countKey, countLabel, createCount, isValidCount } from './count';

describe('카운트', () => {
  it('카운트는 12개 (0-0 ~ 3-2)', () => {
    expect(allCounts()).toHaveLength(12);
    expect(countKey(allCounts()[0])).toBe('0-0');
    expect(countKey(allCounts()[11])).toBe('3-2');
  });


  it('존재할 수 없는 카운트는 오류', () => {
    expect(isValidCount(3, 2)).toBe(true);
    expect(() => createCount(4, 0)).toThrow('존재할 수 없는 카운트');
    expect(() => createCount(0, 3)).toThrow('존재할 수 없는 카운트');
    expect(() => createCount(-1, 0)).toThrow();
  });


  it('코드용은 숫자, 화면용은 글자로 표기한다', () => {
    expect(countKey({ balls: 2, strikes: 1 })).toBe('2-1');
    expect(countLabel({ balls: 2, strikes: 1 })).toBe('볼 2 · 스트라이크 1');
  });
});
