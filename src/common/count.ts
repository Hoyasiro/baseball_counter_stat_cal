// 카운트는 항상 "볼 먼저, 스트라이크 나중" 순서로 다룬다. (CLAUDE.md 5.1)
// 연습경기에서는 볼넷·삼진·아웃 기준을 바꿔 하기도 하므로 경기마다 규칙(Rules)을 둔다.

export interface Rules {
  /** 볼넷이 되는 볼 수 */
  readonly ballsForWalk: number;
  /** 삼진이 되는 스트라이크 수 */
  readonly strikesForStrikeout: number;
  /** 한 이닝(초 또는 말)의 아웃 수 */
  readonly outsPerInning: number;
}

/** 정식 규칙 */
export const DEFAULT_RULES: Rules = { ballsForWalk: 4, strikesForStrikeout: 3, outsPerInning: 3 };

/** 규칙으로 고를 수 있는 범위 (입력 실수 방지) */
export const RULE_LIMITS: Record<keyof Rules, { readonly min: number; readonly max: number }> = {
  ballsForWalk: { min: 1, max: 8 },
  strikesForStrikeout: { min: 1, max: 6 },
  outsPerInning: { min: 1, max: 6 },
};

export function isValidRules(rules: Rules): boolean {
  return (Object.keys(RULE_LIMITS) as (keyof Rules)[]).every((key) => {
    const v = rules[key];
    return Number.isInteger(v) && v >= RULE_LIMITS[key].min && v <= RULE_LIMITS[key].max;
  });
}

export function isDefaultRules(rules: Rules): boolean {
  return (Object.keys(DEFAULT_RULES) as (keyof Rules)[]).every((key) => rules[key] === DEFAULT_RULES[key]);
}

export interface Count {
  readonly balls: number;
  readonly strikes: number;
}

export const FIRST_PITCH_COUNT: Count = { balls: 0, strikes: 0 };

/** 카운트에서 가능한 가장 많은 볼 (볼넷 직전) */
export function maxBalls(rules: Rules): number {
  return rules.ballsForWalk - 1;
}

/** 카운트에서 가능한 가장 많은 스트라이크 (삼진 직전) */
export function maxStrikes(rules: Rules): number {
  return rules.strikesForStrikeout - 1;
}

export function isValidCount(balls: number, strikes: number, rules: Rules = DEFAULT_RULES): boolean {
  return (
    Number.isInteger(balls) &&
    Number.isInteger(strikes) &&
    balls >= 0 &&
    balls <= maxBalls(rules) &&
    strikes >= 0 &&
    strikes <= maxStrikes(rules)
  );
}

export function createCount(balls: number, strikes: number, rules: Rules = DEFAULT_RULES): Count {
  if (!isValidCount(balls, strikes, rules)) {
    throw new Error(
      `존재할 수 없는 카운트입니다: 볼 ${balls}, 스트라이크 ${strikes} ` +
        `(볼 0~${maxBalls(rules)}, 스트라이크 0~${maxStrikes(rules)})`,
    );
  }
  return { balls, strikes };
}

/** 가능한 카운트를 0-0, 0-1, ... 순서로 돌려준다. 정식 규칙이면 12개. */
export function allCounts(rules: Rules = DEFAULT_RULES): Count[] {
  const counts: Count[] = [];
  for (let balls = 0; balls <= maxBalls(rules); balls++) {
    for (let strikes = 0; strikes <= maxStrikes(rules); strikes++) {
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
