// 카운트는 항상 "볼 먼저, 스트라이크 나중" 순서로 다룬다. (CLAUDE.md 5.1)

/** 볼넷이 되는 볼 수 */
export const BALLS_FOR_WALK = 4;
/** 삼진이 되는 스트라이크 수 */
export const STRIKES_FOR_STRIKEOUT = 3;
/** 한 이닝(초 또는 말)의 아웃 수 */
export const OUTS_PER_INNING = 3;

/** 카운트에서 가능한 가장 많은 볼 (볼넷 직전) */
export const MAX_BALLS_IN_COUNT = BALLS_FOR_WALK - 1;
/** 카운트에서 가능한 가장 많은 스트라이크 (삼진 직전) */
export const MAX_STRIKES_IN_COUNT = STRIKES_FOR_STRIKEOUT - 1;

export interface Count {
  readonly balls: number;
  readonly strikes: number;
}

export const FIRST_PITCH_COUNT: Count = { balls: 0, strikes: 0 };

export function isValidCount(balls: number, strikes: number): boolean {
  return (
    Number.isInteger(balls) &&
    Number.isInteger(strikes) &&
    balls >= 0 &&
    balls <= MAX_BALLS_IN_COUNT &&
    strikes >= 0 &&
    strikes <= MAX_STRIKES_IN_COUNT
  );
}

export function createCount(balls: number, strikes: number): Count {
  if (!isValidCount(balls, strikes)) {
    throw new Error(
      `존재할 수 없는 카운트입니다: 볼 ${balls}, 스트라이크 ${strikes} ` +
        `(볼 0~${MAX_BALLS_IN_COUNT}, 스트라이크 0~${MAX_STRIKES_IN_COUNT})`,
    );
  }
  return { balls, strikes };
}

/** 가능한 12개 카운트를 0-0, 0-1, ... 3-2 순서로 돌려준다. */
export function allCounts(): Count[] {
  const counts: Count[] = [];
  for (let balls = 0; balls <= MAX_BALLS_IN_COUNT; balls++) {
    for (let strikes = 0; strikes <= MAX_STRIKES_IN_COUNT; strikes++) {
      counts.push({ balls, strikes });
    }
  }
  return counts;
}

/** 볼 수, 스트라이크 수 순으로 정렬 */
export function compareCounts(a: Count, b: Count): number {
  return a.balls - b.balls || a.strikes - b.strikes;
}

/** 코드·데이터용 표기. 예: "2-1" */
export function countKey(count: Count): string {
  return `${count.balls}-${count.strikes}`;
}

/** 화면용 표기. 숫자만 쓰면 헷갈리므로 글자를 함께 쓴다. (CLAUDE.md 5.1) */
export function countLabel(count: Count): string {
  return `볼 ${count.balls} · 스트라이크 ${count.strikes}`;
}
