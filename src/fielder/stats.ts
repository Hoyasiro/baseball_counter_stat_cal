// 수비 기준 통계: 우리 아이가 수비하던 타석(투수 장면 포함)에서 아이가 받은 수비 기록만 센다.
// 자살·보살·실책은 공식 기록 규칙(MLB 공식 야구 규칙 9.09 자살, 9.10 보살, 9.12 실책)의 뜻을 따른다.
// 모든 값은 Calculation으로 돌려주어 결과와 계산 과정을 함께 보여준다. (CLAUDE.md 5.2)

import { Calculation, SourceRef, safeDivide, tally, term } from '../common/calculation';
import { OUTS_PER_INNING } from '../common/count';
import { BattedBall, FieldingCredit, FieldingPosition, PlayKind } from '../common/events';
import { formatInningsFromOuts, formatRate } from '../common/format';
import { FIELDING_POSITION_LABEL } from '../common/labels';
import { ChartPoint, GameForStats, ScopedPlateAppearance, ref, repeatedSources, shareOf } from '../common/stat-base';

export type { GameForStats };

/** 아이가 수비하던 타석 */
function defended(games: readonly GameForStats[], position?: FieldingPosition): ScopedPlateAppearance[] {
  return games.flatMap((g) =>
    g.replay.plateAppearances
      .filter((pa) => pa.fieldingPosition !== null && (position === undefined || pa.fieldingPosition === position))
      .map((pa) => ({ game: g.label, pa })),
  );
}

/** 아이가 받은 수비 기록 하나 */
export interface CreditSample {
  readonly credit: FieldingCredit;
  readonly position: FieldingPosition;
  readonly source: SourceRef;
  /** 타구에서 받은 기록이면 그 타구 */
  readonly ball: BattedBall | null;
}

/**
 * 투구·주자 기록에 붙은 수비 기록을 모은다.
 * 포수는 삼진 아웃 때 공을 잡아 아웃을 완성하므로 자살 1개를 자동으로 받는다. (공식 야구 규칙 9.09(a)(2))
 */
export function creditsOf(pas: readonly ScopedPlateAppearance[]): CreditSample[] {
  return pas.flatMap((s) => {
    const position = s.pa.fieldingPosition as FieldingPosition;
    const source = ref(s);
    const fromPitches = s.pa.pitches.flatMap((p) => (p.fielding ?? []).map((credit) => ({ credit, position, source, ball: p.battedBall ?? null })));
    const fromPlays = s.pa.plays.flatMap((p) => (p.fielding ?? []).map((credit) => ({ credit, position, source, ball: null })));
    const strikeoutPutout: CreditSample[] =
      position === 'catcher' && s.pa.outcome === 'strikeout' ? [{ credit: 'putout', position, source, ball: null }] : [];
    return [...fromPitches, ...fromPlays, ...strikeoutPutout];
  });
}

function sourcesOf(samples: readonly CreditSample[], credit: FieldingCredit): SourceRef[] {
  return samples.filter((c) => c.credit === credit).map((c) => c.source);
}

const PUTOUT_LABEL = '잡아서 아웃 (자살)';
const ASSIST_LABEL = '던져서 아웃 도움 (보살)';
const ERROR_LABEL = '실책';

/** 수비 이닝 = 아이가 수비하는 동안 잡은 아웃 ÷ 3 */
export function fieldingInnings(games: readonly GameForStats[], position?: FieldingPosition): Calculation {
  const outs = repeatedSources(defended(games, position), (pa) => pa.outsRecorded);
  return {
    title: '수비 이닝',
    formula: `수비하는 동안 잡은 아웃 ÷ ${OUTS_PER_INNING} (아웃 ${OUTS_PER_INNING}개 = 1이닝)`,
    terms: [term('수비하는 동안 우리 팀이 잡은 아웃', outs)],
    expression: `${outs.length} ÷ ${OUTS_PER_INNING}`,
    value: outs.length / OUTS_PER_INNING,
    display: formatInningsFromOuts(outs.length),
  };
}

export function putouts(games: readonly GameForStats[], position?: FieldingPosition): Calculation {
  return tally(PUTOUT_LABEL, '공을 잡거나 베이스를 밟거나 태그해서 직접 아웃시킨 수 (포수는 삼진 아웃 포함)', sourcesOf(creditsOf(defended(games, position)), 'putout'));
}

export function assists(games: readonly GameForStats[], position?: FieldingPosition): Calculation {
  return tally(ASSIST_LABEL, '던지거나 공을 막아 아웃을 도운 수', sourcesOf(creditsOf(defended(games, position)), 'assist'));
}

export function errors(games: readonly GameForStats[], position?: FieldingPosition): Calculation {
  return tally(ERROR_LABEL, '공을 놓치거나 잘못 던져 주자를 살리거나 더 가게 한 수', sourcesOf(creditsOf(defended(games, position)), 'error'));
}

/** 수비 기회 = 자살 + 보살 + 실책 */
export function totalChances(games: readonly GameForStats[], position?: FieldingPosition): Calculation {
  const credits = creditsOf(defended(games, position));
  const terms = [term(PUTOUT_LABEL, sourcesOf(credits, 'putout')), term(ASSIST_LABEL, sourcesOf(credits, 'assist')), term(ERROR_LABEL, sourcesOf(credits, 'error'))];
  const total = terms.reduce((n, t) => n + t.value, 0);
  return {
    title: '수비 기회',
    formula: '잡아서 아웃 + 던져서 아웃 도움 + 실책',
    terms,
    expression: terms.map((t) => t.value).join(' + '),
    value: total,
    display: `${total}`,
  };
}

/** 수비율 = (자살 + 보살) ÷ (자살 + 보살 + 실책) */
export function fieldingPercentage(games: readonly GameForStats[], position?: FieldingPosition): Calculation {
  const credits = creditsOf(defended(games, position));
  const clean = term('실수 없이 처리 (잡아서 아웃 + 던져서 아웃 도움)', [...sourcesOf(credits, 'putout'), ...sourcesOf(credits, 'assist')]);
  const chances = term('수비 기회 (잡아서 아웃 + 던져서 아웃 도움 + 실책)', credits.map((c) => c.source));
  const value = safeDivide(clean.value, chances.value);
  return {
    title: '수비율',
    formula: '실수 없이 처리 ÷ 수비 기회',
    terms: [clean, chances],
    expression: `${clean.value} ÷ ${chances.value}`,
    value,
    display: formatRate(value),
    note: value === null ? '수비 기회가 0이라 계산할 수 없음' : undefined,
  };
}

const STOLEN: readonly PlayKind[] = ['stolenBase', 'stolenSecond'];
const CAUGHT: readonly PlayKind[] = ['caughtStealing', 'caughtStealingSecond'];

function catcherPlays(games: readonly GameForStats[], kinds: readonly PlayKind[]): SourceRef[] {
  return defended(games, 'catcher').flatMap((s) => s.pa.plays.filter((p) => kinds.includes(p.play)).map(() => ref(s)));
}

/** 포수일 때: 도루 허용, 도루 저지, 도루 저지율 = 도루 저지 ÷ (도루 허용 + 도루 저지) */
export function catcherItems(games: readonly GameForStats[]): Calculation[] {
  const stolen = catcherPlays(games, STOLEN);
  const caught = catcherPlays(games, CAUGHT);
  return [
    tally('도루 허용', '아이가 포수일 때 상대가 도루에 성공한 수', stolen),
    tally('도루 저지', '아이가 포수일 때 도루하던 주자를 잡은 수', caught),
    shareOf('도루 저지율', { label: '도루 저지', sources: caught }, { label: '도루 시도 (허용 + 저지)', sources: [...stolen, ...caught] }),
  ];
}

export interface PositionRow {
  readonly position: FieldingPosition;
  readonly innings: Calculation;
  readonly putouts: Calculation;
  readonly assists: Calculation;
  readonly errors: Calculation;
  readonly fieldingPercentage: Calculation;
}

/** 포지션별 수비 기록. 수비한 적 있는 자리만 */
export function byPosition(games: readonly GameForStats[]): PositionRow[] {
  const positions = [...new Set(defended(games).map((s) => s.pa.fieldingPosition as FieldingPosition))];
  const withLabel = (c: Calculation, position: FieldingPosition): Calculation => ({ ...c, title: `${FIELDING_POSITION_LABEL[position]} ${c.title}` });
  return positions.map((position) => ({
    position,
    innings: withLabel(fieldingInnings(games, position), position),
    putouts: withLabel(putouts(games, position), position),
    assists: withLabel(assists(games, position), position),
    errors: withLabel(errors(games, position), position),
    fieldingPercentage: withLabel(fieldingPercentage(games, position), position),
  }));
}

/** 아이가 처리한 타구의 낙구 지점: 실책이 있으면 실책, 아니면 아웃 처리 */
export function handledBallPoints(games: readonly GameForStats[]): ChartPoint[] {
  const byBall = new Map<BattedBall, Set<FieldingCredit>>();
  for (const c of creditsOf(defended(games))) {
    if (!c.ball || c.ball.x === null || c.ball.y === null) continue;
    const set = byBall.get(c.ball) ?? new Set<FieldingCredit>();
    set.add(c.credit);
    byBall.set(c.ball, set);
  }
  return [...byBall.entries()].map(([ball, credits]) => ({ x: ball.x as number, y: ball.y as number, kind: credits.has('error') ? 'error' : 'out' }));
}

export interface StatSection {
  readonly title: string;
  readonly items: readonly Calculation[];
}

export interface FielderSummary {
  readonly sections: readonly StatSection[];
  readonly byPosition: readonly PositionRow[];
  readonly handledBalls: readonly ChartPoint[];
  /** 수비한 타석이 하나라도 있는지 */
  readonly hasData: boolean;
}

export function summarize(games: readonly GameForStats[]): FielderSummary {
  const caughtAsCatcher = defended(games, 'catcher').length > 0;
  return {
    sections: [
      {
        title: '수비 기록',
        items: [fieldingInnings(games), totalChances(games), putouts(games), assists(games), errors(games), fieldingPercentage(games)],
      },
      ...(caughtAsCatcher ? [{ title: '포수일 때', items: catcherItems(games) }] : []),
    ],
    byPosition: byPosition(games),
    handledBalls: handledBallPoints(games),
    hasData: defended(games).length > 0,
  };
}
