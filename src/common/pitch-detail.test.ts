import { describe, expect, it } from 'vitest';
import { parseSpeed } from './pitch-detail-view';

describe('구속 입력', () => {
  it('30~180 사이 정수만 받는다', () => {
    expect(parseSpeed('105')).toBe(105);
    expect(parseSpeed('')).toBeNull();
    expect(parseSpeed('29')).toBeNull();
    expect(parseSpeed('181')).toBeNull();
    expect(parseSpeed('99.5')).toBeNull();
    expect(parseSpeed('abc')).toBeNull();
  });
});
