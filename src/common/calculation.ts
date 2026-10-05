// 화면의 모든 통계는 Calculation 하나에서 결과와 계산 과정을 함께 꺼내 쓴다.
// 계산 과정 탭용으로 계산을 따로 구현하지 않기 위해서다. (CLAUDE.md 5.2)

/** 숫자가 어느 경기, 몇 회, 몇 번째 타석에서 나왔는지 */
export interface SourceRef {
  readonly game: string;
  readonly inning: number;
  readonly plateAppearance: number;
}

export interface Term {
  readonly label: string;
  readonly value: number;
  readonly sources: readonly SourceRef[];
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

/** 출처 하나당 1로 세는 항목 */
export function term(label: string, sources: readonly SourceRef[]): Term {
  return { label, value: sources.length, sources };
}

/** 해당하는 경우의 수를 세는 통계 */
export function tally(title: string, formula: string, sources: readonly SourceRef[]): Calculation {
  const counted = term(formula, sources);
  return {
    title,
    formula,
    terms: [counted],
    expression: `${counted.value}`,
    value: counted.value,
    display: `${counted.value}`,
  };
}

/**
 * 출처를 읽기 쉽게 묶는다.
 * 예: "1회 2·3번째 타석, 2회 5번째 타석" / 여러 경기면 "10월 4일 ○○전: 1회 2번째 타석"
 */
export function formatSources(sources: readonly SourceRef[]): string {
  if (sources.length === 0) return '해당 타석 없음';
  const byGame = new Map<string, Map<number, number[]>>();
  for (const s of sources) {
    const innings = byGame.get(s.game) ?? new Map<number, number[]>();
    const list = innings.get(s.inning) ?? [];
    if (!list.includes(s.plateAppearance)) list.push(s.plateAppearance);
    innings.set(s.inning, list);
    byGame.set(s.game, innings);
  }
  const multiGame = byGame.size > 1;
  return [...byGame.entries()]
    .map(([game, innings]) => {
      const text = [...innings.entries()]
        .map(([inning, pas]) => `${inning}회 ${pas.join('·')}번째 타석`)
        .join(', ');
      return multiGame ? `${game}: ${text}` : text;
    })
    .join(' / ');
}
