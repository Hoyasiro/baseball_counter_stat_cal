// 투수 기준 통계. 모든 값은 Calculation으로 돌려주어 결과와 계산 과정을 함께 보여준다.

import { Calculation, SourceRef, safeDivide, tally, term } from '../common/calculation';
import { Count, allCounts, countKey, countLabel } from '../common/count';
import { PitchResult, PlayKind } from '../common/events';
import { formatInningsFromOuts, formatPercent, formatRate } from '../common/format';
import { GameReplay, PlateAppearance, PlateAppearanceOutcome } from '../common/replay';

/** 분석할 경기 하나 */
export interface GameForStats {
  /** 출처 표시에 쓰는 경기 이름 */
  readonly label: string;
  readonly replay: GameReplay;
}

/** 스트라이크로 세는 공. 파울·번트 파울과 친 공(안타·아웃)도 스트라이크로 센다. 몸에 맞는 공은 볼로 센다. */
const STRIKE_LIKE: ReadonlySet<PitchResult> = new Set(['strike', 'foul', 'buntFoul', 'hit', 'out']);

/** 상대 타수에서 빠지는 결과 (데모에는 희생타 구분이 없다) */
const NOT_AT_BAT: ReadonlySet<PlateAppearanceOutcome> = new Set(['walk', 'hitByPitch']);

interface ScopedPlateAppearance {
  readonly game: string;
  readonly pa: PlateAppearance;
}

function flatten(games: readonly GameForStats[]): ScopedPlateAppearance[] {
  return games.flatMap((g) => g.replay.plateAppearances.map((pa) => ({ game: g.label, pa })));
}

function ref(s: ScopedPlateAppearance): SourceRef {
  return { game: s.game, inning: s.pa.inning, plateAppearance: s.pa.number };
}

/** 상대한 타자로 세는 타석: 끝났고, 이닝 종료로 중단되지 않은 타석 */
function completed(pas: readonly ScopedPlateAppearance[]): ScopedPlateAppearance[] {
  return pas.filter((s) => s.pa.outcome !== null && s.pa.outcome !== 'inningEnded');
}

function withOutcome(pas: readonly ScopedPlateAppearance[], outcome: PlateAppearanceOutcome): SourceRef[] {
  return pas.filter((s) => s.pa.outcome === outcome).map(ref);
}

function atBats(pas: readonly ScopedPlateAppearance[]): SourceRef[] {
  return completed(pas)
    .filter((s) => s.pa.outcome !== null && !NOT_AT_BAT.has(s.pa.outcome))
    .map(ref);
}

/** 조건에 맞는 공마다 출처 하나 */
function pitchSources(pas: readonly ScopedPlateAppearance[], match: (r: PitchResult) => boolean): SourceRef[] {
  return pas.flatMap((s) => s.pa.pitches.filter((p) => match(p.result)).map(() => ref(s)));
}

function playSources(pas: readonly ScopedPlateAppearance[], kinds: readonly PlayKind[]): SourceRef[] {
  return pas.flatMap((s) => s.pa.plays.filter((p) => kinds.includes(p.play)).map(() => ref(s)));
}

export function pitchCount(games: readonly GameForStats[]): Calculation {
  const multiGame = games.length > 1;
  const parts = new Map<string, number>();
  for (const s of flatten(games)) {
    const key = multiGame ? s.game : `${s.pa.inning}회`;
    parts.set(key, (parts.get(key) ?? 0) + s.pa.pitches.length);
  }
  const sources = pitchSources(flatten(games), () => true);
  const total = sources.length;
  return {
    title: '투구 수',
    formula: multiGame ? '경기별 투구 수를 모두 더한 수' : '이닝별 투구 수를 모두 더한 수 (취소한 공 제외)',
    terms: [term('던진 공', sources)],
    expression: [...parts.entries()].map(([k, n]) => `${k} ${n}`).join(' + ') || '0',
    value: total,
    display: `${total}`,
  };
}

export function strikeRate(games: readonly GameForStats[]): Calculation {
  const pas = flatten(games);
  const strikes = term('스트라이크 (헛스윙·지켜본 스트라이크·파울·번트 파울·친 공)', pitchSources(pas, (r) => STRIKE_LIKE.has(r)));
  const total = term('투구 수', pitchSources(pas, () => true));
  const value = safeDivide(strikes.value, total.value);
  return {
    title: '스트라이크 비율',
    formula: '스트라이크 ÷ 투구 수',
    terms: [strikes, total],
    expression: `${strikes.value} ÷ ${total.value}`,
    value,
    display: formatPercent(value),
    note: value === null ? '던진 공이 없어 계산할 수 없음' : undefined,
  };
}

export function inningsPitched(games: readonly GameForStats[]): Calculation {
  const outs = flatten(games).flatMap((s) => Array.from({ length: s.pa.outsRecorded }, () => ref(s)));
  return {
    title: '던진 이닝',
    formula: '잡은 아웃 ÷ 3 (아웃 3개 = 1이닝)',
    terms: [term('잡은 아웃 (삼진·아웃·견제 아웃·도루 저지·고쳐서 더한 아웃)', outs)],
    expression: `${outs.length} ÷ 3`,
    value: outs.length / 3,
    display: formatInningsFromOuts(outs.length),
  };
}

export function battersFaced(games: readonly GameForStats[]): Calculation {
  return tally('상대한 타자', '끝난 타석 수 (이닝 종료로 중단된 타석 제외)', completed(flatten(games)).map(ref));
}

export function strikeouts(games: readonly GameForStats[]): Calculation {
  return tally('삼진', '삼진으로 끝난 타석 수 (쓰리번트 아웃 포함)', withOutcome(flatten(games), 'strikeout'));
}

export function walks(games: readonly GameForStats[]): Calculation {
  return tally('볼넷', '볼넷으로 끝난 타석 수', withOutcome(flatten(games), 'walk'));
}

export function hitByPitches(games: readonly GameForStats[]): Calculation {
  return tally('몸에 맞는 공', '몸에 맞는 공으로 끝난 타석 수', withOutcome(flatten(games), 'hitByPitch'));
}

export function hitsAllowed(games: readonly GameForStats[]): Calculation {
  return tally('맞은 안타', '안타로 끝난 타석 수', withOutcome(flatten(games), 'hit'));
}

function battingAverageAgainstOf(pas: readonly ScopedPlateAppearance[], title: string): Calculation {
  const hits = term('맞은 안타', withOutcome(pas, 'hit'));
  const abs = term('상대 타수 (끝난 타석에서 볼넷·몸에 맞는 공 제외)', atBats(pas));
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

/** 피안타율 = 맞은 안타 ÷ 상대 타수 */
export function battingAverageAgainst(games: readonly GameForStats[]): Calculation {
  return battingAverageAgainstOf(flatten(games), '피안타율');
}

export function wildPitches(games: readonly GameForStats[]): Calculation {
  return tally('와일드피치', '와일드피치로 기록한 공 수', pitchSources(flatten(games), (r) => r === 'wildPitch'));
}

export function pickoffAttempts(games: readonly GameForStats[]): Calculation {
  return tally('견제', '견제한 횟수 (견제 아웃 포함)', playSources(flatten(games), ['pickoff', 'pickoffOut']));
}

export function pickoffOuts(games: readonly GameForStats[]): Calculation {
  return tally('견제 아웃', '견제로 주자를 잡은 횟수', playSources(flatten(games), ['pickoffOut']));
}

export function stolenSecondAllowed(games: readonly GameForStats[]): Calculation {
  return tally('2루 도루 허용', '2루 도루를 성공한 횟수', playSources(flatten(games), ['stolenSecond']));
}

export function caughtStealingSecond(games: readonly GameForStats[]): Calculation {
  return tally('2루 도루 저지', '2루 도루를 잡은 횟수', playSources(flatten(games), ['caughtStealingSecond']));
}

export interface CountRow {
  readonly count: Count;
  readonly plateAppearances: Calculation;
  readonly battingAverageAgainst: Calculation;
}

/** 카운트별 기록 (종료 카운트 기준: 그 카운트에서 다음 공으로 타석이 끝난 경우) */
export function byEndCount(games: readonly GameForStats[]): CountRow[] {
  const pas = completed(flatten(games));
  return allCounts()
    .map((count) => {
      const inCount = pas.filter((s) => s.pa.endCount && countKey(s.pa.endCount) === countKey(count));
      return {
        count,
        plateAppearances: tally(`${countLabel(count)} 타석`, `${countLabel(count)}에서 끝난 타석 수`, inCount.map(ref)),
        battingAverageAgainst: battingAverageAgainstOf(inCount, `${countLabel(count)} 피안타율`),
      };
    })
    .filter((row) => row.plateAppearances.value !== 0);
}

export const END_COUNT_BASIS = '종료 카운트 기준: 그 카운트에서 던진 다음 공으로 타석이 끝난 경우만 셉니다.';

export interface StatSection {
  readonly title: string;
  readonly items: readonly Calculation[];
}

export interface PitcherSummary {
  readonly sections: readonly StatSection[];
  readonly byCount: readonly CountRow[];
}

export function summarize(games: readonly GameForStats[]): PitcherSummary {
  return {
    sections: [
      { title: '던진 공', items: [pitchCount(games), strikeRate(games), inningsPitched(games)] },
      {
        title: '타자 상대',
        items: [
          battersFaced(games),
          strikeouts(games),
          walks(games),
          hitByPitches(games),
          hitsAllowed(games),
          battingAverageAgainst(games),
        ],
      },
      {
        title: '주자 상황',
        items: [
          wildPitches(games),
          pickoffAttempts(games),
          pickoffOuts(games),
          stolenSecondAllowed(games),
          caughtStealingSecond(games),
        ],
      },
    ],
    byCount: byEndCount(games),
  };
}
