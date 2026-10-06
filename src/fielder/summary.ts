// 수비 한 줄 요약 (예: "수비 잡아서 아웃 2 · 실책 1"). 숫자는 수비 통계 함수에서 그대로 가져온다. (CLAUDE.md 5.2)

import { FIELDING_CREDIT_LABEL } from '../common/labels';
import { GameForStats } from '../common/stat-base';
import { assists, errors, putouts } from './stats';

/** 아이가 처리한 수비 기록이 없으면 null */
export function fielderLine(games: readonly GameForStats[]): string | null {
  const parts: [number | null, string][] = [
    [putouts(games).value, FIELDING_CREDIT_LABEL.putout],
    [assists(games).value, FIELDING_CREDIT_LABEL.assist],
    [errors(games).value, FIELDING_CREDIT_LABEL.error],
  ];
  const shown = parts.filter(([n]) => n).map(([n, label]) => `${label} ${n}`);
  return shown.length > 0 ? `수비 ${shown.join(' · ')}` : null;
}
