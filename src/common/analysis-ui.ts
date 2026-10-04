// 분석 화면 조각 (투수·타자 분석이 함께 쓴다): 범위·탭 고르기, 결과 카드, 계산 과정 카드, 카운트 표

import { Calculation, formatSources } from './calculation';
import { Count, countLabel } from './count';
import { h } from './dom';

export type AnalysisTab = 'result' | 'process';
export type AnalysisScope = 'game' | 'all';

export interface AnalysisActions {
  scope: (s: AnalysisScope) => void;
  tab: (t: AnalysisTab) => void;
}

export interface Section {
  readonly title: string;
  readonly items: readonly Calculation[];
}

export interface CountTableRow {
  readonly count: Count;
  readonly plateAppearances: Calculation;
  readonly rate: Calculation;
}

function segmented<T extends string>(options: readonly [T, string][], selected: T, onSelect: (v: T) => void, className: string): HTMLElement {
  return h(
    'div',
    { className },
    options.map(([value, label]) =>
      h('button', { className: value === selected ? 'active' : '', text: label, onClick: () => onSelect(value) }),
    ),
  );
}

export function analysisHeader(totalGames: number, scope: AnalysisScope, tab: AnalysisTab, actions: AnalysisActions): HTMLElement[] {
  return [
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
}

/** 계산 과정 카드: ① 공식 ② 들어간 숫자(출처) ③ 결과 (CLAUDE.md 5.2) */
export function processCard(c: Calculation): HTMLElement {
  return h('article', { className: 'process' }, [
    h('h3', { text: c.title }),
    h('p', {}, [h('b', { text: '① 공식 ' }), c.formula]),
    h('p', {}, [h('b', { text: '② 들어간 숫자 ' }), c.expression]),
    h(
      'ul',
      {},
      c.terms.map((t) => h('li', {}, [`${t.label}: ${t.value}`, h('small', { text: ` (${formatSources(t.sources)})` })])),
    ),
    h('p', {}, [h('b', { text: '③ 결과 ' }), c.display]),
    c.note ? h('p', { className: 'note', text: c.note }) : null,
  ]);
}

export function resultCards(section: Section): HTMLElement[] {
  return [
    h('h2', { text: section.title }),
    h(
      'div',
      { className: 'cards' },
      section.items.map((c) => h('div', { className: 'card' }, [h('small', { text: c.title }), h('strong', { text: c.display })])),
    ),
  ];
}

export function countTable(rows: readonly CountTableRow[], rateTitle: string): HTMLElement {
  if (rows.length === 0) return h('p', { className: 'empty', text: '끝난 타석이 없습니다.' });
  return h('div', { className: 'table-wrap' }, [
    h('table', {}, [
      h('thead', {}, [h('tr', {}, [h('th', { text: '카운트' }), h('th', { text: '타석' }), h('th', { text: rateTitle })])]),
      h(
        'tbody',
        {},
        rows.map((row) =>
          h('tr', {}, [
            h('td', { text: countLabel(row.count) }),
            h('td', { text: row.plateAppearances.display }),
            h('td', { text: row.rate.display }),
          ]),
        ),
      ),
    ]),
  ]);
}
