// 투수용 화면: 기록 입력 / 기록 보기 / 경기 분석 (CLAUDE.md 0.5)

import { Calculation } from '../common/calculation';
import { MAX_BALLS_IN_COUNT, MAX_STRIKES_IN_COUNT, countLabel } from '../common/count';
import { h } from '../common/dom';
import { Game, addPitch, addVoid, createGame } from '../common/game';
import { PitchResult, PlateAppearance, activePitches, buildPlateAppearances } from '../common/pitch-log';
import { loadGames, saveGames } from '../common/storage';
import { OUTCOME_LABEL, PITCH_BUTTONS, PITCH_LABEL } from './labels';
import { END_COUNT_BASIS, summarize } from './stats';

const STORAGE_KEY = 'baseball-counter.pitcher.games.v1';

type Tab = 'input' | 'records' | 'analysis';
type AnalysisTab = 'result' | 'process';

interface State {
  games: Game[];
  tab: Tab;
  analysisTab: AnalysisTab;
  notice: string | null;
}

export function mountPitcher(root: HTMLElement, onBack: () => void): void {
  const loaded = loadGames(STORAGE_KEY);
  const state: State = {
    games: loaded.games.length > 0 ? loaded.games : [createGame()],
    tab: 'input',
    analysisTab: 'result',
    notice: loaded.ok ? null : loaded.message,
  };

  const currentGame = (): Game => state.games[state.games.length - 1];

  const updateGame = (game: Game): void => {
    state.games = [...state.games.slice(0, -1), game];
    if (!saveGames(STORAGE_KEY, state.games)) state.notice = '기록을 저장하지 못했습니다. 저장 공간을 확인하세요.';
    render();
  };

  const render = (): void => {
    const pas = buildPlateAppearances(activePitches(currentGame().events));
    const body =
      state.tab === 'input'
        ? inputView(pas, state, updateGame, currentGame)
        : state.tab === 'records'
          ? recordsView(pas, () => {
              if (!confirm('지금 경기를 끝내고 새 경기를 시작할까요? 지금까지의 기록은 저장됩니다.')) return;
              state.games = [...state.games, createGame()];
              saveGames(STORAGE_KEY, state.games);
              state.tab = 'input';
              render();
            })
          : analysisView(pas, state.analysisTab, (t) => {
              state.analysisTab = t;
              render();
            });

    const children: Node[] = [
      h('header', { className: 'topbar' }, [
        h('button', { className: 'back', text: '‹ 처음으로', onClick: onBack }),
        h('h1', { text: '투수 기록' }),
      ]),
      h('main', { className: 'content' }, [body]),
      h(
        'nav',
        { className: 'tabbar' },
        (
          [
            ['input', '기록 입력'],
            ['records', '기록 보기'],
            ['analysis', '경기 분석'],
          ] as const
        ).map(([tab, label]) =>
          h('button', {
            className: state.tab === tab ? 'active' : '',
            text: label,
            onClick: () => {
              state.tab = tab;
              render();
            },
          }),
        ),
      ),
    ];
    if (state.notice) {
      const dismiss = (): void => {
        state.notice = null;
        render();
      };
      children.splice(1, 0, h('p', { className: 'notice', text: state.notice, onClick: dismiss }));
    }
    root.replaceChildren(...children);
  };

  render();
}

function dots(filled: number, total: number, kind: string): HTMLElement {
  return h(
    'span',
    { className: `dots ${kind}` },
    Array.from({ length: total }, (_, i) => h('span', { className: i < filled ? 'dot on' : 'dot' })),
  );
}

function inputView(
  pas: PlateAppearance[],
  state: State,
  updateGame: (g: Game) => void,
  currentGame: () => Game,
): HTMLElement {
  const last = pas[pas.length - 1];
  const inProgress = last && last.outcome === null ? last : null;
  const count = inProgress ? inProgress.currentCount : { balls: 0, strikes: 0 };
  const batterNumber = inProgress ? inProgress.number : pas.length + 1;
  const justEnded = last && last.outcome !== null ? last : null;
  const lastPitch = last?.pitches[last.pitches.length - 1];

  const record = (result: PitchResult): void => {
    state.notice = null;
    updateGame(addPitch(currentGame(), result));
  };

  return h('section', { className: 'input' }, [
    h('div', { className: 'scoreboard' }, [
      h('p', { className: 'batter', text: `${batterNumber}번째 타자` }),
      h('div', { className: 'count-row' }, [h('span', { text: '볼' }), dots(count.balls, MAX_BALLS_IN_COUNT, 'ball')]),
      h('div', { className: 'count-row' }, [
        h('span', { text: '스트라이크' }),
        dots(count.strikes, MAX_STRIKES_IN_COUNT, 'strike'),
      ]),
      h('p', { className: 'count-text', text: countLabel(count) }),
    ]),
    h('p', {
      className: 'message',
      text: justEnded?.outcome
        ? `${justEnded.number}번째 타자: ${OUTCOME_LABEL[justEnded.outcome]}. 다음 타자 공을 기록하세요.`
        : lastPitch
          ? `방금 공: ${PITCH_LABEL[lastPitch.result]}`
          : '공을 던질 때마다 결과 버튼을 누르세요.',
    }),
    h(
      'div',
      { className: 'pitch-buttons' },
      PITCH_BUTTONS.map((b) =>
        h('button', { className: `pitch ${b.result}`, onClick: () => record(b.result) }, [
          h('strong', { text: b.label }),
          h('small', { text: b.hint }),
        ]),
      ),
    ),
    h('button', {
      className: 'undo',
      text: '↶ 마지막 공 취소',
      disabled: !lastPitch,
      onClick: () => {
        if (lastPitch) updateGame(addVoid(currentGame(), lastPitch.id));
      },
    }),
  ]);
}

function recordsView(pas: PlateAppearance[], onNewGame: () => void): HTMLElement {
  return h('section', { className: 'records' }, [
    pas.length === 0 ? h('p', { className: 'empty', text: '아직 기록이 없습니다.' }) : null,
    ...pas
      .slice()
      .reverse()
      .map((pa) =>
        h('article', { className: 'pa' }, [
          h('h3', {
            text: `${pa.number}번째 타자 · ${pa.outcome ? OUTCOME_LABEL[pa.outcome] : '진행 중'}`,
          }),
          pa.endCount ? h('p', { className: 'sub', text: `${countLabel(pa.endCount)}에서 끝남` }) : null,
          h(
            'p',
            { className: 'chips' },
            pa.pitches.map((p) => h('span', { className: `chip ${p.result}`, text: PITCH_LABEL[p.result] })),
          ),
        ]),
      ),
    h('button', { className: 'secondary', text: '새 경기 시작', onClick: onNewGame }),
  ]);
}

function analysisView(
  pas: PlateAppearance[],
  tab: AnalysisTab,
  onTab: (t: AnalysisTab) => void,
): HTMLElement {
  const summary = summarize(pas);
  const tabs = h('div', { className: 'subtabs' }, [
    h('button', { className: tab === 'result' ? 'active' : '', text: '결과', onClick: () => onTab('result') }),
    h('button', { className: tab === 'process' ? 'active' : '', text: '계산 과정', onClick: () => onTab('process') }),
  ]);

  if (tab === 'result') {
    return h('section', { className: 'analysis' }, [
      tabs,
      h(
        'div',
        { className: 'cards' },
        summary.totals.map((c) =>
          h('div', { className: 'card' }, [h('small', { text: c.title }), h('strong', { text: c.display })]),
        ),
      ),
      h('h2', { text: '카운트별 피안타율' }),
      h('p', { className: 'basis', text: END_COUNT_BASIS }),
      summary.byCount.length === 0
        ? h('p', { className: 'empty', text: '끝난 타석이 없습니다.' })
        : h('table', {}, [
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
    ]);
  }

  return h('section', { className: 'analysis' }, [
    tabs,
    ...summary.totals.map(processCard),
    h('h2', { text: '카운트별 피안타율' }),
    h('p', { className: 'basis', text: END_COUNT_BASIS }),
    ...summary.byCount.map((row) => processCard(row.battingAverageAgainst)),
  ]);
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
        h('li', {}, [
          `${t.label}: ${t.value}`,
          h('small', {
            text: t.plateAppearances.length ? ` (타석 ${t.plateAppearances.join(', ')})` : ' (해당 타석 없음)',
          }),
        ]),
      ),
    ),
    h('p', {}, [h('b', { text: '③ 결과 ' }), c.display]),
    c.note ? h('p', { className: 'note', text: c.note }) : null,
  ]);
}
