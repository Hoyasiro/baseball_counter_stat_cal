import { describe, expect, it } from 'vitest';
import { SPEED_MAX, SPEED_MIN } from './events';
import { parseHand } from './settings';
import { WHEEL_ITEM_HEIGHT, lastSpeedOf, offsetOfSpeed, speedAtOffset } from './speed-wheel';
import { pitchWith, pitches } from './test-helpers';

describe('구속 다이얼', () => {
  it('맨 위가 30, 한 칸마다 1 km/h', () => {
    expect(speedAtOffset(0)).toBe(SPEED_MIN);
    expect(speedAtOffset(WHEEL_ITEM_HEIGHT * 75)).toBe(105);
  });

  it('칸 사이에서 멈추면 가까운 칸으로', () => {
    expect(speedAtOffset(WHEEL_ITEM_HEIGHT * 75 + WHEEL_ITEM_HEIGHT * 0.4)).toBe(105);
    expect(speedAtOffset(WHEEL_ITEM_HEIGHT * 75 + WHEEL_ITEM_HEIGHT * 0.6)).toBe(106);
  });

  it('30~180 밖으로는 돌아가지 않는다', () => {
    expect(speedAtOffset(-200)).toBe(SPEED_MIN);
    expect(speedAtOffset(WHEEL_ITEM_HEIGHT * 1000)).toBe(SPEED_MAX);
    expect(offsetOfSpeed(10)).toBe(0);
    expect(offsetOfSpeed(999)).toBe((SPEED_MAX - SPEED_MIN) * WHEEL_ITEM_HEIGHT);
  });

  it('위치 ↔ 구속이 서로 맞는다', () => {
    expect(speedAtOffset(offsetOfSpeed(123))).toBe(123);
  });

  it('가장 최근에 잰 구속에서 시작한다 (구속 없는 공은 건너뜀)', () => {
    expect(lastSpeedOf([pitchWith('ball', { speed: 98 }), pitchWith('strike', { speed: 101 }), ...pitches('foul')])).toBe(101);
    expect(lastSpeedOf(pitches('ball'))).toBeNull();
  });
});

describe('손 설정', () => {
  it('기본은 오른손, 저장된 왼손은 그대로', () => {
    expect(parseHand(null)).toBe('right');
    expect(parseHand('left')).toBe('left');
    expect(parseHand('엉뚱한 값')).toBe('right');
  });
});
