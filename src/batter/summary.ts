// 타자 한 줄 요약 (예: "3타수 1안타 1볼넷 1타점"). 숫자는 타자 통계 함수에서 그대로 가져온다. (CLAUDE.md 5.2)

import { GameForStats } from '../common/stat-base';
import { atBatCount, hitByPitches, hits, plateAppearances, runsBattedIn, stolenBases, walks } from './stats';

/** 아이 타석이 없으면 null */
export function batterLine(games: readonly GameForStats[]): string | null {
  if (plateAppearances(games).value === 0) return null;
  const parts = [`${atBatCount(games).value}타수 ${hits(games).value}안타`];
  const extras: [number | null, (n: number) => string][] = [
    [walks(games).value, (n) => `${n}볼넷`],
    [hitByPitches(games).value, (n) => `몸에 맞는 공 ${n}`],
    [runsBattedIn(games).value, (n) => `${n}타점`],
    [stolenBases(games).value, (n) => `${n}도루`],
  ];
  for (const [n, text] of extras) if (n) parts.push(text(n));
  return parts.join(' ');
}
