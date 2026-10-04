// 투수 기준 통계. 모든 값은 Calculation으로 돌려주어 결과와 계산 과정을 함께 보여준다.

import { Calculation, safeDivide, tally, term } from '../common/calculation';
import { Count, allCounts, countKey, countLabel } from '../common/count';
import { formatPercent, formatRate } from '../common/format';
import { PitchResult, PlateAppearance, PlateAppearanceOutcome } from '../common/pitch-log';

/** 스트라이크로 세는 공. 파울과 친 공(안타·아웃)도 스트라이크로 센다. 몸에 맞는 공은 볼로 센다. */
const STRIKE_LIKE: ReadonlySet<PitchResult> = new Set(['strike', 'foul', 'hit', 'out']);

/** 타수에서 빠지는 결과 (데모에는 희생타 구분이 없다) */
const NOT_AT_BAT: ReadonlySet<PlateAppearanceOutcome> = new Set(['walk', 'hitByPitch']);

function ended(pas: readonly PlateAppearance[]): PlateAppearance[] {
  return pas.filter((pa) => pa.outcome !== null);
}

function numbers(pas: readonly PlateAppearance[]): number[] {
  return pas.map((pa) => pa.number);
}

function withOutcome(pas: readonly PlateAppearance[], outcome: PlateAppearanceOutcome): number[] {
  return numbers(pas.filter((pa) => pa.outcome === outcome));
}

function atBats(pas: readonly PlateAppearance[]): number[] {
  return numbers(ended(pas).filter((pa) => pa.outcome !== null && !NOT_AT_BAT.has(pa.outcome)));
}

export function pitchCount(pas: readonly PlateAppearance[]): Calculation {
  const total = pas.reduce((sum, pa) => sum + pa.pitches.length, 0);
  return {
    title: '투구 수',
    formula: '던진 공을 모두 더한 수 (취소한 공 제외)',
    terms: [{ label: '던진 공', value: total, plateAppearances: numbers(pas) }],
    expression: pas.map((pa) => pa.pitches.length).join(' + ') || '0',
    value: total,
    display: `${total}`,
  };
}

export function strikeRate(pas: readonly PlateAppearance[]): Calculation {
  const strikePas: number[] = [];
  let strikes = 0;
  let total = 0;
  for (const pa of pas) {
    const inPa = pa.pitches.filter((p) => STRIKE_LIKE.has(p.result)).length;
    strikes += inPa;
    total += pa.pitches.length;
    if (inPa > 0) strikePas.push(pa.number);
  }
  const value = safeDivide(strikes, total);
  return {
    title: '스트라이크 비율',
    formula: '스트라이크 ÷ 투구 수',
    terms: [
      { label: '스트라이크 (헛스윙·지켜본 스트라이크·파울·친 공)', value: strikes, plateAppearances: strikePas },
      { label: '투구 수', value: total, plateAppearances: numbers(pas) },
    ],
    expression: `${strikes} ÷ ${total}`,
    value,
    display: formatPercent(value),
    note: value === null ? '던진 공이 없어 계산할 수 없음' : undefined,
  };
}

export function battersFaced(pas: readonly PlateAppearance[]): Calculation {
  return tally('상대한 타자', '끝난 타석 수', numbers(ended(pas)));
}

export function strikeouts(pas: readonly PlateAppearance[]): Calculation {
  return tally('삼진', '삼진으로 끝난 타석 수', withOutcome(pas, 'strikeout'));
}

export function walks(pas: readonly PlateAppearance[]): Calculation {
  return tally('볼넷', '볼넷으로 끝난 타석 수', withOutcome(pas, 'walk'));
}

export function hitsAllowed(pas: readonly PlateAppearance[]): Calculation {
  return tally('맞은 안타', '안타로 끝난 타석 수', withOutcome(pas, 'hit'));
}

/** 피안타율 = 맞은 안타 ÷ 상대 타수. 상대 타수 = 끝난 타석 − 볼넷 − 몸에 맞는 공 */
export function battingAverageAgainst(pas: readonly PlateAppearance[], title = '피안타율'): Calculation {
  const hits = term('맞은 안타', withOutcome(pas, 'hit'));
  const abs = term('상대 타수 (볼넷·몸에 맞는 공 제외)', atBats(pas));
  const value = safeDivide(hits.value, abs.value);
  return {
    title,
    formula: '맞은 안타 ÷ 상대 타수',
    terms: [hits, abs],
    expression: `${hits.value} ÷ ${abs.value}`,
    value,
    display: formatRate(value),
    note: value === null ? '상대 타수가 0이라 계산할 수 없음' : undefined,
  };
}

export interface CountRow {
  readonly count: Count;
  readonly plateAppearances: Calculation;
  readonly battingAverageAgainst: Calculation;
}

/** 카운트별 기록 (종료 카운트 기준: 그 카운트에서 다음 공으로 타석이 끝난 경우) */
export function byEndCount(pas: readonly PlateAppearance[]): CountRow[] {
  return allCounts()
    .map((count) => {
      const inCount = ended(pas).filter((pa) => pa.endCount && countKey(pa.endCount) === countKey(count));
      return {
        count,
        plateAppearances: tally(
          `${countLabel(count)} 타석`,
          `${countLabel(count)}에서 끝난 타석 수`,
          numbers(inCount),
        ),
        battingAverageAgainst: battingAverageAgainst(inCount, `${countLabel(count)} 피안타율`),
      };
    })
    .filter((row) => row.plateAppearances.value !== 0);
}

export const END_COUNT_BASIS = '종료 카운트 기준: 그 카운트에서 던진 다음 공으로 타석이 끝난 경우만 셉니다.';

export interface PitcherSummary {
  readonly totals: readonly Calculation[];
  readonly byCount: readonly CountRow[];
}

export function summarize(pas: readonly PlateAppearance[]): PitcherSummary {
  return {
    totals: [
      pitchCount(pas),
      strikeRate(pas),
      battersFaced(pas),
      strikeouts(pas),
      walks(pas),
      hitsAllowed(pas),
      battingAverageAgainst(pas),
    ],
    byCount: byEndCount(pas),
  };
}
