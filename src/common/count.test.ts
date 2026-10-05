import { describe, expect, it } from 'vitest';
import { countKey, countLabel, isValidCount } from './count';

describe('카운트', () => {
  it('카운트는 12개 (0-0 ~ 3-2)', () => {
    let valid = 0;
    for (let balls = 0; balls <= 4; balls++) {
      for (let strikes = 0; strikes <= 3; strikes++) {
        if (isValidCount(balls, strikes)) valid++;
      }
    }
    expect(valid).toBe(12);
    expect(isValidCount(0, 0)).toBe(true);
  });

  it('존재할 수 없는 카운트는 오류', () => {
    expect(isValidCount(3, 2)).toBe(true);
    expect(isValidCount(4, 0)).toBe(false);
    expect(isValidCount(0, 3)).toBe(false);
    expect(isValidCount(-1, 0)).toBe(false);
    expect(isValidCount(1.5, 0)).toBe(false);
  });

  it('코드용은 숫자, 화면용은 글자로 표기한다', () => {
    expect(countKey({ balls: 2, strikes: 1 })).toBe('2-1');
    expect(countLabel({ balls: 2, strikes: 1 })).toBe('볼 2 · 스트라이크 1');
  });
});
