// 투수 경기 분석 화면: 결과 탭과 계산 과정 탭 (CLAUDE.md 5.2)

import { Calculation, formatSources } from '../common/calculation';
import { countLabel } from '../common/count';
import { h } from '../common/dom';
import { END_COUNT_BASIS, GameForStats, summarize } from './stats';

export type AnalysisTab = 'result' | 'process';
export type AnalysisScope = 'game' | 'all';

interface AnalysisActions {
  scope: (s: AnalysisScope) => void;
  tab: (t: AnalysisTab) => void;
}

function segmented<T extends string>(
  options: readonly [T, string][],
  selected: T,
  onSelect: (v: T) => void,
  className: string,
): HTMLElement {
  return h(
    'div',
    { className },
    options.map(([value, label]) =>
      h('button', { className: value === selected ? 'active' : '', text: label, onClick: () => onSelect(value) }),
    ),
  );
}

function processCard(c: Calculation): HTMLElement {
  return h('article', { className: 'process' }, [
    h('h3', { text: c.title }),
    h('p', {}, [h('b', { text: '① 공식 ' }), c.formula]),
    h('p', {}, [h('b', { text: '② 들어간 숫자 ' }), c.expression]),
    h(
      'ul',
      {},
      c.terms.map((t) =>
        h('li', {}, [`${t.label}: ${t.value}`, h('small', { text: ` (${formatSources(t.sources)})` })]),
      ),
    ),
    h('p', {}, [h('b', { text: '③ 결과 ' }), c.display]),
    c.note ? h('p', { className: 'note', text: c.note }) : null,
  ]);
}

export function analysisView(
  games: readonly GameForStats[],
  totalGames: number,
  scope: AnalysisScope,
  tab: AnalysisTab,
  actions: AnalysisActions,
): HTMLElement {
  const summary = summarize(games);
  const header = [
    segmented<AnalysisScope>(
      [
        ['game', '이 경기'],
        ['all', `전체 ${totalGames}경기`],
      ],
      scope,
      actions.scope,
      'scope-tabs',
    ),
    segmented<AnalysisTab>(
      [
        ['result', '결과'],
        ['process', '계산 과정'],
      ],
      tab,
      actions.tab,
      'subtabs',
    ),
  ];

  if (tab === 'process') {
    return h('section', { className: 'analysis' }, [
      ...header,
      ...summary.sections.flatMap((section) => [h('h2', { text: section.title }), ...section.items.map(processCard)]),
      h('h2', { text: '카운트별 피안타율' }),
      h('p', { className: 'basis', text: END_COUNT_BASIS }),
      ...summary.byCount.map((row) => processCard(row.battingAverageAgainst)),
    ]);
  }

  return h('section', { className: 'analysis' }, [
    ...header,
    ...summary.sections.flatMap((section) => [
      h('h2', { text: section.title }),
      h(
        'div',
        { className: 'cards' },
        section.items.map((c) =>
          h('div', { className: 'card' }, [h('small', { text: c.title }), h('strong', { text: c.display })]),
        ),
      ),
    ]),
    h('h2', { text: '카운트별 피안타율' }),
    h('p', { className: 'basis', text: END_COUNT_BASIS }),
    summary.byCount.length === 0
      ? h('p', { className: 'empty', text: '끝난 타석이 없습니다.' })
      : h('div', { className: 'table-wrap' }, [
          h('table', {}, [
            h('thead', {}, [
              h('tr', {}, [h('th', { text: '카운트' }), h('th', { text: '타석' }), h('th', { text: '피안타율' })]),
            ]),
            h(
              'tbody',
              {},
              summary.byCount.map((row) =>
                h('tr', {}, [
                  h('td', { text: countLabel(row.count) }),
                  h('td', { text: row.plateAppearances.display }),
                  h('td', { text: row.battingAverageAgainst.display }),
                ]),
              ),
            ),
          ]),
        ]),
  ]);
}
