// 투수·타자 통계가 함께 쓰는 공식과 도우미. 공식은 여기 한 곳에만 둔다. (CLAUDE.md 5.2)
// 어느 타석을 셀지(상대 타자 / 우리 아이)는 각자(pitcher/, batter/)가 정한다.

import { Calculation, SourceRef, safeDivide, term } from './calculation';
import { Count, compareCounts, countKey } from './count';
import { HIT_BASES, PitchResult, PlayKind } from './events';
import { formatRate } from './format';
import { Actor, GameReplay, PlateAppearance, PlateAppearanceOutcome, isInterrupted } from './replay';

/** 분석할 경기 하나 */
export interface GameForStats {
  /** 출처 표시에 쓰는 경기 이름 */
  readonly label: string;
  readonly replay: GameReplay;
}

export interface ScopedPlateAppearance {
  readonly game: string;
  readonly pa: PlateAppearance;
}

/** 타수에서 빠지는 결과 (데모에는 희생타 구분이 없다) */
const NOT_AT_BAT: ReadonlySet<PlateAppearanceOutcome> = new Set(['walk', 'hitByPitch']);

/** 출루로 세는 결과 (출루율) */
export const ON_BASE: ReadonlySet<PlateAppearanceOutcome> = new Set(['hit', 'walk', 'hitByPitch']);

export const END_COUNT_BASIS = '종료 카운트 기준: 그 카운트에서 던진 다음 공으로 타석이 끝난 경우만 셉니다.';

export function platesOf(games: readonly GameForStats[], actor: Actor): ScopedPlateAppearance[] {
  return games.flatMap((g) => g.replay.plateAppearances.filter((pa) => pa.actor === actor).map((pa) => ({ game: g.label, pa })));
}

export function ref(s: ScopedPlateAppearance): SourceRef {
  return { game: s.game, inning: s.pa.inning, plateAppearance: s.pa.number };
}

/** 끝난 타석 (중단된 타석 제외) */
export function completed(pas: readonly ScopedPlateAppearance[]): ScopedPlateAppearance[] {
  return pas.filter((s) => s.pa.outcome !== null && !isInterrupted(s.pa.outcome));
}

export function withOutcome(pas: readonly ScopedPlateAppearance[], outcome: PlateAppearanceOutcome): SourceRef[] {
  return pas.filter((s) => s.pa.outcome === outcome).map(ref);
}

export function atBats(pas: readonly ScopedPlateAppearance[]): SourceRef[] {
  return completed(pas)
    .filter((s) => s.pa.outcome !== null && !NOT_AT_BAT.has(s.pa.outcome))
    .map(ref);
}

/** 조건에 맞는 공마다 출처 하나 */
export function pitchSources(pas: readonly ScopedPlateAppearance[], match: (r: PitchResult) => boolean): SourceRef[] {
  return pas.flatMap((s) => s.pa.pitches.filter((p) => match(p.result)).map(() => ref(s)));
}

export function playSources(pas: readonly ScopedPlateAppearance[], kinds: readonly PlayKind[]): SourceRef[] {
  return pas.flatMap((s) => s.pa.plays.filter((p) => kinds.includes(p.play)).map(() => ref(s)));
}

/** 이 타석들에서 나온 수만큼 출처를 반복한다. (예: 한 타석 2점이면 출처 2개) */
export function repeatedSources(pas: readonly ScopedPlateAppearance[], amount: (pa: PlateAppearance) => number): SourceRef[] {
  return pas.flatMap((s) => Array.from({ length: amount(s.pa) }, () => ref(s)));
}

export interface RateLabels {
  readonly title: string;
  readonly hits: string;
  readonly atBats: string;
}

/** 타율(피안타율) = 안타 ÷ 타수 */
export function averageOf(pas: readonly ScopedPlateAppearance[], labels: RateLabels): Calculation {
  const hits = term(labels.hits, withOutcome(pas, 'hit'));
  const abs = term(labels.atBats, atBats(pas));
  const value = safeDivide(hits.value, abs.value);
  return {
    title: labels.title,
    formula: `${labels.hits.replace(/ \(.*\)$/, '')} ÷ ${labels.atBats.replace(/ \(.*\)$/, '')}`,
    terms: [hits, abs],
    expression: `${hits.value} ÷ ${abs.value}`,
    value,
    display: formatRate(value),
    note: value === null ? '타수가 0이라 계산할 수 없음' : undefined,
  };
}

/** 장타율(피장타율) = 루타 ÷ 타수. 루타: 1루타 1, 2루타 2, 3루타 3, 홈런 4 */
export function sluggingOf(pas: readonly ScopedPlateAppearance[], labels: Omit<RateLabels, 'hits'>): Calculation {
  const bases = term(
    '루타 (1루타 1, 2루타 2, 3루타 3, 홈런 4)',
    repeatedSources(completed(pas), (pa) => (pa.hitType ? HIT_BASES[pa.hitType] : 0)),
  );
  const abs = term(labels.atBats, atBats(pas));
  const value = safeDivide(bases.value, abs.value);
  return {
    title: labels.title,
    formula: '루타 ÷ 타수 (장타가 많을수록 높아요)',
    terms: [bases, abs],
    expression: `${bases.value} ÷ ${abs.value}`,
    value,
    display: formatRate(value),
    note: value === null ? '타수가 0이라 계산할 수 없음' : undefined,
  };
}

/** 기록에 나온 종료 카운트만 볼·스트라이크 순으로 (타석이 없는 카운트는 표에서 뺀다) */
export function endCountsOf(pas: readonly ScopedPlateAppearance[]): Count[] {
  const seen = new Map<string, Count>();
  for (const s of completed(pas)) {
    if (s.pa.endCount) seen.set(countKey(s.pa.endCount), s.pa.endCount);
  }
  return [...seen.values()].sort(compareCounts);
}

export function inCount(pas: readonly ScopedPlateAppearance[], count: Count): ScopedPlateAppearance[] {
  return completed(pas).filter((s) => s.pa.endCount && countKey(s.pa.endCount) === countKey(count));
}
