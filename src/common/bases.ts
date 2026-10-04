// 주자 이동 규칙. 확실히 정해지는 이동(밀어내기, 한 베이스씩 진루)만 자동으로 처리하고,
// 그 밖의 경우(장타, 주자가 더 뛴 경우 등)는 사용자가 "상황 고치기"로 맞춘다.

import { BaseIndex, Bases } from './events';

export const EMPTY_BASES: Bases = [false, false, false];

/** 타자가 1루로 나갈 때 밀려나는 주자만 한 베이스씩 이동한다. (볼넷·몸에 맞는 공) */
export function forceAdvance(bases: Bases): Bases {
  const [first, second, third] = bases;
  if (!first) return [true, second, third];
  if (!second) return [true, true, third];
  // 만루면 3루 주자가 홈으로 들어온다.
  return [true, true, true];
}

/** 모든 주자가 한 베이스씩 이동한다. 3루 주자는 홈으로 들어온다. (와일드피치) */
export function advanceAll(bases: Bases): Bases {
  const [first, second] = bases;
  return [false, first, second];
}

/** 안타: 주자는 한 베이스씩, 타자는 1루로 간다. (1루타 기준, 다르면 사용자가 고친다) */
export function hitAdvance(bases: Bases): Bases {
  const [first, second] = bases;
  return [true, first, second];
}

export function removeRunner(bases: Bases, base: BaseIndex): Bases {
  const next: [boolean, boolean, boolean] = [bases[0], bases[1], bases[2]];
  next[base] = false;
  return next;
}

export function hasRunner(bases: Bases): boolean {
  return bases.some(Boolean);
}

export function canStealSecond(bases: Bases): boolean {
  return bases[0] && !bases[1];
}

export function occupiedBases(bases: Bases): BaseIndex[] {
  return ([0, 1, 2] as const).filter((b) => bases[b]);
}

export const BASE_NAMES: Record<BaseIndex, string> = { 0: '1루', 1: '2루', 2: '3루' };

/** 화면용 주자 상황. 예: "주자 1·3루", "주자 없음", "만루" */
export function basesLabel(bases: Bases): string {
  const occupied = occupiedBases(bases);
  if (occupied.length === 0) return '주자 없음';
  if (occupied.length === 3) return '만루';
  return `주자 ${occupied.map((b) => b + 1).join('·')}루`;
}
