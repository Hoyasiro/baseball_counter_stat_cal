// 스코어보드 표

import { h } from './dom';
import { Team } from './events';
import { LineScore } from './line-score';

function cell(value: number | null, manual: boolean, current: boolean): HTMLElement {
  const classes = [manual ? 'manual' : '', current ? 'now' : ''].filter(Boolean).join(' ');
  return h('td', { text: value === null ? '' : String(value), className: classes });
}

export function lineScoreTable(score: LineScore, opponentName: string, currentInning: number | null): HTMLElement {
  const row = (team: Team, name: string): HTMLElement =>
    h('tr', {}, [
      h('th', { className: 'team', text: name }),
      ...score.runs[team].map((r, i) => cell(r, score.manual[team][i], score.innings[i] === currentInning)),
      h('td', { className: 'total', text: String(score.totalRuns[team]) }),
      h('td', { className: 'total', text: String(score.hits[team]) }),
      h('td', { className: 'total', text: String(score.errors[team]) }),
    ]);

  return h('div', { className: 'table-wrap line-score' }, [
    h('table', {}, [
      h('thead', {}, [
        h('tr', {}, [
          h('th', { className: 'team', text: '' }),
          ...score.innings.map((i) => h('th', { text: String(i), className: i === currentInning ? 'now' : '' })),
          h('th', { text: 'R' }),
          h('th', { text: 'H' }),
          h('th', { text: 'E' }),
        ]),
      ]),
      h('tbody', {}, [row('them', opponentName), row('us', '우리 팀')]),
    ]),
    h('p', {
      className: 'help',
      text: 'R 점수 · H 안타 · E 실책. 아이가 나온 장면의 기록에서 자동으로 세고, 밑줄 친 칸은 직접 넣은 점수입니다. 안타·실책은 기록한 장면만 셉니다.',
    }),
  ]);
}
