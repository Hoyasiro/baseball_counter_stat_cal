// 스코어보드 표. 칸을 누르면 그 이닝 점수를 직접 고칠 수 있다.

import { h } from './dom';
import { Team, TotalField } from './events';
import { TOTAL_FIELD_LABEL } from './labels';
import { LineScore } from './line-score';

/** 스코어보드에서 고칠 칸: 이닝 점수(숫자) 또는 합계 칸 */
export type ScoreCellTarget = number | TotalField;

export interface TeamNames {
  readonly us: string;
  readonly them: string;
}

/** 기록이 없는 칸도 0으로 보여준다. 아이 기록이 먼저라 점수는 대충 넣어도 되고, 0이 아닌 칸만 눌러 고치면 된다. */
function cell(value: number | null, manual: boolean, current: boolean, onTap: (() => void) | null, label: string, extraClass = ''): HTMLElement {
  const classes = [manual ? 'manual' : '', current ? 'now' : '', extraClass].filter(Boolean).join(' ');
  const text = String(value ?? 0);
  if (!onTap) return h('td', { text, className: classes });
  return h('td', { className: classes }, [h('button', { className: 'score-cell', text, attrs: { 'aria-label': `${label} ${text}점, 눌러서 고치기` }, onClick: onTap })]);
}

export function lineScoreTable(
  score: LineScore,
  names: TeamNames,
  currentInning: number | null,
  onCell: ((team: Team, target: ScoreCellTarget) => void) | null = null,
): HTMLElement {
  const totals: [TotalField, Record<Team, number>][] = [
    ['runs', score.totalRuns],
    ['hits', score.hits],
    ['errors', score.errors],
  ];
  const row = (team: Team): HTMLElement =>
    h('tr', {}, [
      h('th', { className: 'team', text: names[team] }),
      ...score.runs[team].map((r, i) => {
        const inning = score.innings[i];
        return cell(r, score.manual[team][i], inning === currentInning, onCell ? () => onCell(team, inning) : null, `${names[team]} ${inning}회`);
      }),
      ...totals.map(([field, values]) =>
        cell(values[team], score.manualTotals[team][field], false, onCell ? () => onCell(team, field) : null, `${names[team]} ${TOTAL_FIELD_LABEL[field]}`, 'total'),
      ),
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
      text: `R 점수 · H 안타 · E 실책. 아이가 나온 장면은 기록에서 자동으로 세고, 밑줄 친 칸은 직접 넣은 값입니다.${onCell ? ' 모든 칸을 눌러 고칠 수 있어요. 최종 점수만 알면 R 칸만 넣어도 돼요.' : ''}`,
    }),
  ]);
}
