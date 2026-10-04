// 화면의 모든 통계는 Calculation 하나에서 결과와 계산 과정을 함께 꺼내 쓴다.
// 계산 과정 탭용으로 계산을 따로 구현하지 않기 위해서다. (CLAUDE.md 5.2)

export interface Term {
  readonly label: string;
  readonly value: number;
  /** 이 숫자가 나온 타석 번호 */
  readonly plateAppearances: readonly number[];
}

export interface Calculation {
  readonly title: string;
  /** 쉬운 말로 쓴 공식. 예: "안타 ÷ 타수" */
  readonly formula: string;
  readonly terms: readonly Term[];
  /** 숫자를 넣은 식. 예: "3 ÷ 10" */
  readonly expression: string;
  /** 반올림하지 않은 결과. 계산할 수 없으면 null */
  readonly value: number | null;
  /** 화면에 보여줄 결과 */
  readonly display: string;
  /** 계산할 수 없는 이유 등 추가 설명 */
  readonly note?: string;
}

/** 분모가 0이면 0이 아니라 null을 돌려준다. (0타수와 0할은 다르다. CLAUDE.md 4.2) */
export function safeDivide(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

export function term(label: string, plateAppearances: readonly number[]): Term {
  return { label, value: plateAppearances.length, plateAppearances };
}

/** 해당하는 타석 수를 세는 통계 */
export function tally(title: string, formula: string, plateAppearances: readonly number[]): Calculation {
  const counted = term(formula, plateAppearances);
  return {
    title,
    formula,
    terms: [counted],
    expression: `${counted.value}`,
    value: counted.value,
    display: `${counted.value}`,
  };
}
