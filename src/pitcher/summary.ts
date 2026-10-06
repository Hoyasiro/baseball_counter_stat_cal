// 투수 한 줄 요약 (예: "2 1/3이닝 35구 3삼진 1실점"). 숫자는 투수 통계 함수에서 그대로 가져온다. (CLAUDE.md 5.2)

import { GameForStats } from '../common/stat-base';
import { inningsPitched, pitchCount, runsAllowed, strikeouts } from './stats';

/** 아이가 던진 공이 없으면 null */
export function pitcherLine(games: readonly GameForStats[]): string | null {
  const pitches = pitchCount(games).value;
  if (!pitches) return null;
  const k = strikeouts(games).value;
  return `${inningsPitched(games).display}이닝 ${pitches}구${k ? ` ${k}삼진` : ''} ${runsAllowed(games).value}실점`;
}
