// 초(top)·말(bottom)과 역할의 관계. 우리 팀 공격이면 타자·주자, 수비면 투수·수비수 장면이다.

import { Half, Role, Team } from './events';

export function offensiveHalf(battingFirst: Team): Half {
  return battingFirst === 'us' ? 'top' : 'bottom';
}

export function defensiveHalf(battingFirst: Team): Half {
  return battingFirst === 'us' ? 'bottom' : 'top';
}

export function isOffenseRole(role: Role): boolean {
  return role === 'batter' || role === 'runner';
}

export function halfForRole(role: Role, battingFirst: Team): Half {
  return isOffenseRole(role) ? offensiveHalf(battingFirst) : defensiveHalf(battingFirst);
}

/** 화면용. 예: "4회말" */
export function halfInningLabel(inning: number, half: Half): string {
  return `${inning}회${half === 'top' ? '초' : '말'}`;
}

/** 경기 순서상 몇 번째 초·말인지 (비교용) */
export function halfOrder(inning: number, half: Half): number {
  return inning * 2 + (half === 'top' ? 0 : 1);
}

/** from 다음으로 오는 target 쪽(초 또는 말)의 이닝 */
export function nextInningFor(target: Half, from: { inning: number; half: Half }): number {
  return halfOrder(from.inning, target) > halfOrder(from.inning, from.half) ? from.inning : from.inning + 1;
}
