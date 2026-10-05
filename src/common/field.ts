// 야구장 그림의 좌표와 방향. 그림은 0~100 정사각형이고 홈플레이트가 아래 가운데에 있다.
// 낙구 지점은 0~1로 저장하므로 그림 좌표는 ×100 해서 쓴다.

import { ZONE_MAX, ZONE_MIN, ZonePoint } from './events';

export const FIELD_SIZE = 100;
export const HOME = { x: 50, y: 92 } as const;
/** 홈에서 외야 담장까지 (그림 단위) */
export const FENCE_RADIUS = 64;
/** 홈에서 내야 잔디 끝까지. 이보다 가까우면 내야 타구 */
export const INFIELD_RADIUS = 30;
/** 홈에서 각 베이스까지 (내야 한 변의 길이) */
export const BASE_DISTANCE = 19;

/** 파울 라인은 가운데에서 좌우 45도 */
const FOUL_LINE_DEGREES = 45;
/** 방향을 다섯 구역으로 나누는 경계 (가운데에서의 각도) */
const CENTER_DEGREES = 9;
const GAP_DEGREES = 27;

export type Direction = 'left' | 'leftCenter' | 'center' | 'rightCenter' | 'right' | 'foul';
export type Depth = 'infield' | 'outfield' | 'overFence';

export const DIRECTION_LABEL: Record<Direction, string> = {
  left: '왼쪽',
  leftCenter: '왼쪽 가운데',
  center: '가운데',
  rightCenter: '오른쪽 가운데',
  right: '오른쪽',
  foul: '파울 지역',
};

export const DEPTH_LABEL: Record<Depth, string> = {
  infield: '내야',
  outfield: '외야',
  overFence: '담장 너머',
};

export interface Placement {
  readonly direction: Direction;
  readonly depth: Depth;
}

/** 저장한 낙구 지점(0~1)이 홈에서 어느 방향·거리인지 */
export function placementOf(x: number, y: number): Placement {
  const dx = x * FIELD_SIZE - HOME.x;
  const dy = HOME.y - y * FIELD_SIZE;
  const angle = (Math.atan2(dx, dy) * 180) / Math.PI;
  const distance = Math.hypot(dx, dy);
  const depth: Depth = distance > FENCE_RADIUS ? 'overFence' : distance < INFIELD_RADIUS ? 'infield' : 'outfield';
  if (dy < 0 || Math.abs(angle) > FOUL_LINE_DEGREES) return { direction: 'foul', depth };
  if (angle < -GAP_DEGREES) return { direction: 'left', depth };
  if (angle < -CENTER_DEGREES) return { direction: 'leftCenter', depth };
  if (angle <= CENTER_DEGREES) return { direction: 'center', depth };
  if (angle <= GAP_DEGREES) return { direction: 'rightCenter', depth };
  return { direction: 'right', depth };
}

export function placementLabel(x: number, y: number): string {
  const { direction, depth } = placementOf(x, y);
  return direction === 'foul' ? DIRECTION_LABEL.foul : `${DIRECTION_LABEL[direction]} ${DEPTH_LABEL[depth]}`;
}

/** 존 그림 안의 점이 스트라이크 존 안인지 */
export function isInZone(point: ZonePoint): boolean {
  return point.x >= ZONE_MIN && point.x <= ZONE_MAX && point.y >= ZONE_MIN && point.y <= ZONE_MAX;
}
