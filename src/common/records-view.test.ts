import { describe, expect, it } from 'vitest';
import { typeDigit } from './records-view';

describe('스코어보드 숫자 넣기', () => {
  it('막 열었으면 누른 숫자로 바꾸고, 이어서 누르면 두 자리가 된다', () => {
    expect(typeDigit(3, true, 1)).toBe(1);
    expect(typeDigit(1, false, 2)).toBe(12);
    expect(typeDigit(0, false, 7)).toBe(7);
  });

  it('99를 넘으면 그 숫자부터 다시 시작한다', () => {
    expect(typeDigit(12, false, 3)).toBe(3);
    expect(typeDigit(9, false, 9)).toBe(99);
  });
});
