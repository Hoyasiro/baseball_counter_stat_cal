// 스코어보드 표. 투수용·타자용이 함께 쓴다.

import { h } from './dom';
import { LineScore } from './line-score';
import { NO_VALUE_DISPLAY } from './format';

function cell(value: number | null): string {
  return value === null ? '' : String(value);
}

export function lineScoreTable(score: LineScore, opponentName: string, currentInning: number | null): HTMLElement {
  const inningHead = score.innings.map((i) =>
    h('th', { text: String(i), className: i === currentInning ? 'now' : '' }),
  );
  const row = (name: string, runs: readonly (number | null)[], total: number, hits: string, errors: string): HTMLElement =>
    h('tr', {}, [
      h('th', { className: 'team', text: name }),
      ...runs.map((r, idx) => h('td', { text: cell(r), className: score.innings[idx] === currentInning ? 'now' : '' })),
      h('td', { className: 'total', text: String(total) }),
      h('td', { className: 'total', text: hits }),
      h('td', { className: 'total', text: errors }),
    ]);

  return h('div', { className: 'table-wrap line-score' }, [
    h('table', {}, [
      h('thead', {}, [
        h('tr', {}, [h('th', { className: 'team', text: '' }), ...inningHead, h('th', { text: 'R' }), h('th', { text: 'H' }), h('th', { text: 'E' })]),
      ]),
      h('tbody', {}, [
        row(opponentName, score.runs.them, score.totalRuns.them, String(score.opponentHits), NO_VALUE_DISPLAY),
        row('우리 팀', score.runs.us, score.totalRuns.us, NO_VALUE_DISPLAY, String(score.ourErrors)),
      ]),
    ]),
    h('p', { className: 'help', text: 'R 점수 · H 안타 · E 실책. 아이가 던진 이닝의 상대 점수·안타와 우리 실책은 자동으로 셉니다. 우리 팀 점수와 그 밖의 이닝은 "점수 넣기"로 넣어요.' }),
  ]);
}
