import { describe, expect, it } from 'vitest';
import { advanceAll, basesLabel, forceAdvance, hitAdvance } from './bases';

describe('주자', () => {
  it('밀어내기: 만루에서 볼넷이면 만루 유지', () => {
    expect(forceAdvance([true, true, true])).toEqual([true, true, true]);
    expect(forceAdvance([false, false, true])).toEqual([true, false, true]);
    expect(forceAdvance([true, false, true])).toEqual([true, true, true]);
  });

  it('한 베이스씩 진루', () => {
    expect(advanceAll([true, true, true])).toEqual([false, true, true]);
    expect(hitAdvance([false, true, false])).toEqual([true, false, true]);
  });

  it('화면 표기', () => {
    expect(basesLabel([false, false, false])).toBe('주자 없음');
    expect(basesLabel([true, false, true])).toBe('주자 1·3루');
    expect(basesLabel([true, true, true])).toBe('만루');
  });
});
