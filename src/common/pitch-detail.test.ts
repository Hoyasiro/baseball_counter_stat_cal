import { describe, expect, it } from 'vitest';
import { parseHand } from './settings';
import { DIAL_DEFAULT, DIAL_MAX, DIAL_MIN, fractionAt, fractionOfSpeed, speedAtFraction } from './speed-dial';

describe('구속 다이얼 (반원)', () => {
  it('위 끝 80, 가운데(옆) 120, 아래 끝 160', () => {
    expect(speedAtFraction(0)).toBe(DIAL_MIN);
    expect(speedAtFraction(0.5)).toBe(120);
    expect(speedAtFraction(1)).toBe(DIAL_MAX);
  });

  it('1 km/h 단위로 반올림, 80~160 밖으로는 가지 않는다', () => {
    expect(speedAtFraction(0.3)).toBe(104);
    expect(speedAtFraction(-0.2)).toBe(DIAL_MIN);
    expect(speedAtFraction(1.4)).toBe(DIAL_MAX);
  });

  it('처음 바늘은 100 (위에서 1/4 지점)', () => {
    expect(fractionOfSpeed(DIAL_DEFAULT)).toBeCloseTo(0.25);
    expect(speedAtFraction(fractionOfSpeed(137))).toBe(137);
  });

  it('오른손: 오른쪽 반원. 위·옆·아래를 누르면 80·120·160', () => {
    expect(speedAtFraction(fractionAt(0, -50, 'right'))).toBe(80);
    expect(speedAtFraction(fractionAt(50, 0, 'right'))).toBe(120);
    expect(speedAtFraction(fractionAt(0, 50, 'right'))).toBe(160);
  });

  it('왼손: 왼쪽 반원. 왼쪽 옆을 누르면 120', () => {
    expect(speedAtFraction(fractionAt(-50, 0, 'left'))).toBe(120);
    expect(speedAtFraction(fractionAt(-35.36, -35.36, 'left'))).toBe(100);
  });

  it('반원 바깥(평평한 쪽 너머)을 누르면 가까운 끝으로', () => {
    expect(fractionAt(-10, -40, 'right')).toBe(0);
    expect(fractionAt(-10, 40, 'right')).toBe(1);
    expect(fractionAt(10, 40, 'left')).toBe(1);
  });
});

describe('손 설정', () => {
  it('기본은 오른손, 저장된 왼손은 그대로', () => {
    expect(parseHand(null)).toBe('right');
    expect(parseHand('left')).toBe('left');
    expect(parseHand('엉뚱한 값')).toBe('right');
  });
});
