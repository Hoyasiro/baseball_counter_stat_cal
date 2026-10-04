// 반올림은 표시 단계에서만 한다. (CLAUDE.md 5.2)

export const NO_VALUE_DISPLAY = '-';

const RATE_DECIMALS = 3;
const PERCENT_DECIMALS = 1;

/** 비율 기록 표시. 예: 0.3 → ".300", 1 → "1.000" */
export function formatRate(value: number | null): string {
  if (value === null) return NO_VALUE_DISPLAY;
  const fixed = value.toFixed(RATE_DECIMALS);
  return fixed.startsWith('0.') ? fixed.slice(1) : fixed;
}

/** 백분율 표시. 예: 0.625 → "62.5%" */
export function formatPercent(value: number | null): string {
  if (value === null) return NO_VALUE_DISPLAY;
  return `${(value * 100).toFixed(PERCENT_DECIMALS)}%`;
}
