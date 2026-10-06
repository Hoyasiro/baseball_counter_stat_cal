// 스코어보드 표. 칸을 누르면 그 이닝 점수를 직접 고칠 수 있다.

import { h } from './dom';
import { Team } from './events';
import { LineScore } from './line-score';

export interface TeamNames {
  readonly us: string;
  readonly them: string;
}

/** 기록이 없는 칸도 0으로 보여준다. 아이 기록이 먼저라 점수는 대충 넣어도 되고, 0이 아닌 칸만 눌러 고치면 된다. */
function cell(value: number | null, manual: boolean, current: boolean, onTap: (() => void) | null, label: string): HTMLElement {
  const classes = [manual ? 'manual' : '', current ? 'now' : ''].filter(Boolean).join(' ');
  const text = String(value ?? 0);
  if (!onTap) return h('td', { text, className: classes });
  return h('td', { className: classes }, [h('button', { className: 'score-cell', text, attrs: { 'aria-label': `${label} ${text}점, 눌러서 고치기` }, onClick: onTap })]);
}

export function lineScoreTable(
  score: LineScore,
  names: TeamNames,
  currentInning: number | null,
  onCell: ((team: Team, inning: number) => void) | null = null,
): HTMLElement {
  const row = (team: Team): HTMLElement =>
    h('tr', {}, [
      h('th', { className: 'team', text: names[team] }),
      ...score.runs[team].map((r, i) => {
        const inning = score.innings[i];
        return cell(r, score.manual[team][i], inning === currentInning, onCell ? () => onCell(team, inning) : null, `${names[team]} ${inning}회`);
      }),
      h('td', { className: 'total', text: String(score.totalRuns[team]) }),
      h('td', { className: 'total', text: String(score.hits[team]) }),
      h('td', { className: 'total', text: String(score.errors[team]) }),
    ]);

  return h('div', { className: `table-wrap line-score${onCell ? ' editable' : ''}` }, [
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
      h('tbody', {}, [row('them'), row('us')]),
    ]),
    h('p', {
      className: 'help',
      text: `R 점수 · H 안타 · E 실책. 아이가 나온 장면은 기록에서 자동으로 세고, 밑줄 친 칸은 직접 넣은 점수입니다.${onCell ? ' 칸을 누르면 점수를 고칠 수 있어요.' : ''}`,
    }),
  ]);
}
