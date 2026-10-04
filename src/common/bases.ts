// 주자 이동 규칙. 확실히 정해지는 이동(밀어내기, 안타 종류만큼 진루, 와일드피치 한 베이스)만 자동으로 처리하고,
// 그 밖의 경우(주자가 더 뛴 경우, 실책 등)는 사용자가 "상황 고치기"로 맞춘다.

import { BaseIndex, Bases } from './events';

export const EMPTY_BASES: Bases = [false, false, false];

/** 3루 다음은 홈 */
const HOME = 3;

export interface Advance {
  readonly bases: Bases;
  /** 홈에 들어온 주자 수 */
  readonly runs: number;
}

/** 타자가 1루로 나갈 때 밀려나는 주자만 한 베이스씩 이동한다. (볼넷·몸에 맞는 공) */
export function forceAdvance(bases: Bases): Advance {
  const [first, second, third] = bases;
  if (!first) return { bases: [true, second, third], runs: 0 };
  if (!second) return { bases: [true, true, third], runs: 0 };
  if (!third) return { bases: [true, true, true], runs: 0 };
  // 만루면 3루 주자가 홈으로 들어온다.
  return { bases: [true, true, true], runs: 1 };
}

/** 모든 주자가 count 베이스씩 이동한다. 홈을 지나면 득점이다. */
export function advanceRunners(bases: Bases, count: number): Advance {
  const next: [boolean, boolean, boolean] = [false, false, false];
  let runs = 0;
  for (const b of [0, 1, 2] as const) {
    if (!bases[b]) continue;
    const target = b + count;
    if (target >= HOME) runs += 1;
    else next[target] = true;
  }
  return { bases: next, runs };
}

/** 타자가 batterBases 베이스를 가고, 주자도 같은 수만큼 간다. (안타 종류, 실책 출루) */
export function batterAdvance(bases: Bases, batterBases: number): Advance {
  const moved = advanceRunners(bases, batterBases);
  if (batterBases >= HOME + 1) return { bases: moved.bases, runs: moved.runs + 1 };
  const next: [boolean, boolean, boolean] = [moved.bases[0], moved.bases[1], moved.bases[2]];
  next[batterBases - 1] = true;
  return { bases: next, runs: moved.runs };
}

export function removeRunner(bases: Bases, base: BaseIndex): Bases {
  const next: [boolean, boolean, boolean] = [bases[0], bases[1], bases[2]];
  next[base] = false;
  return next;
}

/** 도루 성공: 그 주자만 한 베이스 이동. 3루 주자면 홈 도루로 득점. */
export function stealAdvance(bases: Bases, base: BaseIndex): Advance {
  const next: [boolean, boolean, boolean] = [bases[0], bases[1], bases[2]];
  next[base] = false;
  if (base === 2) return { bases: next, runs: 1 };
  next[base + 1] = true;
  return { bases: next, runs: 0 };
}

export function hasRunner(bases: Bases): boolean {
  return bases.some(Boolean);
}

/** 도루할 수 있는 주자: 다음 베이스가 비어 있는 주자 (3루 주자는 홈 도루) */
export function stealableBases(bases: Bases): BaseIndex[] {
  return occupiedBases(bases).filter((b) => b === 2 || !bases[b + 1]);
}

export function occupiedBases(bases: Bases): BaseIndex[] {
  return ([0, 1, 2] as const).filter((b) => bases[b]);
}

export const BASE_NAMES: Record<BaseIndex, string> = { 0: '1루', 1: '2루', 2: '3루' };

/** 도루 방향. 예: "1루 → 2루", "3루 → 홈" */
export const STEAL_NAMES: Record<BaseIndex, string> = { 0: '1루 → 2루', 1: '2루 → 3루', 2: '3루 → 홈' };

/** 화면용 주자 상황. 예: "주자 1·3루", "주자 없음", "만루" */
export function basesLabel(bases: Bases): string {
  const occupied = occupiedBases(bases);
  if (occupied.length === 0) return '주자 없음';
  if (occupied.length === 3) return '만루';
  return `주자 ${occupied.map((b) => b + 1).join('·')}루`;
}
