import { describe, expect, it } from 'vitest';
import { isInZone, placementLabel, placementOf } from './field';

describe('낙구 지점 방향·거리', () => {
  it('홈 바로 위 먼 곳은 가운데 외야', () => {
    expect(placementOf(0.5, 0.45)).toEqual({ direction: 'center', depth: 'outfield' });
  });

  it('3루 쪽 가까운 곳은 왼쪽 내야, 1루 쪽 먼 곳은 오른쪽 외야', () => {
    expect(placementOf(0.38, 0.8)).toEqual({ direction: 'left', depth: 'infield' });
    expect(placementLabel(0.8, 0.55)).toBe('오른쪽 외야');
  });

  it('파울 라인 밖은 파울 지역', () => {
    expect(placementOf(0.1, 0.9).direction).toBe('foul');
  });

  it('담장보다 멀면 담장 너머', () => {
    expect(placementOf(0.5, 0.2).depth).toBe('overFence');
  });
});

describe('스트라이크 존', () => {
  it('가운데는 존 안, 가장자리 바깥은 볼', () => {
    expect(isInZone({ x: 0.5, y: 0.5 })).toBe(true);
    expect(isInZone({ x: 0.1, y: 0.5 })).toBe(false);
  });
});
