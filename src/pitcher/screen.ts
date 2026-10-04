// 투수용 화면: 기록 입력 / 기록 보기 / 경기 분석 / 경기 목록 (CLAUDE.md 0.5)
// 상태를 들고 화면을 다시 그리는 역할만 한다. 각 화면은 *-view.ts에 있다.

import { h } from '../common/dom';
import { BaseIndex, HitType, PitchResult, activeEvents, playEvents } from '../common/events';
import {
  Game,
  GameInfo,
  addAdjust,
  addPitch,
  addPlay,
  addScore,
  addVoid,
  createGame,
  gameInfo,
  gameShortLabel,
  setGameInfo,
  today,
} from '../common/game';
import { lineScore } from '../common/line-score';
import { GameReplay, replayGame } from '../common/replay';
import { loadGames, saveGames } from '../common/storage';
import { AnalysisScope, AnalysisTab, analysisView } from './analysis-view';
import { GameForm, gamesView } from './games-view';
import { Chooser, SituationDraft, inputView } from './input-view';
import { RunnerAction } from './labels';
import { ScoreDraft, recordsView } from './records-view';
import { GameForStats } from './stats';

const STORAGE_KEY = 'baseball-counter.pitcher.games.v2';
const LEGACY_STORAGE_KEYS = ['baseball-counter.pitcher.games.v1'];

type Tab = 'input' | 'records' | 'analysis' | 'games';

const TABS: readonly [Tab, string][] = [
  ['input', '기록 입력'],
  ['records', '기록 보기'],
  ['analysis', '경기 분석'],
  ['games', '경기 목록'],
];

interface State {
  games: Game[];
  currentGameId: string | null;
  tab: Tab;
  analysisTab: AnalysisTab;
  analysisScope: AnalysisScope;
  notice: string | null;
  /** "상황 고치기" 중인 값 */
  situationDraft: SituationDraft | null;
  /** 안타 종류나 주자를 고르는 중 */
  chooser: Chooser;
  scoreDraft: ScoreDraft | null;
  form: GameForm | null;
}

export function replayOf(game: Game): GameReplay {
  return replayGame(playEvents(activeEvents(game.events)), gameInfo(game).startInning);
}

const ERROR_REASON = '실책으로 바뀐 주자·아웃·점수를 맞춰 주세요. 바뀐 게 없으면 취소를 누르세요.';

function newGameForm(): GameForm {
  return { gameId: null, info: { date: today(), opponent: '', gameType: 'practice', startInning: 1 }, error: null };
}

export function mountPitcher(root: HTMLElement, onBack: () => void): void {
  const loaded = loadGames(STORAGE_KEY, LEGACY_STORAGE_KEYS);
  const latest = loaded.games[loaded.games.length - 1];
  const state: State = {
    games: loaded.games,
    currentGameId: latest?.id ?? null,
    tab: latest ? 'input' : 'games',
    analysisTab: 'result',
    analysisScope: 'game',
    notice: loaded.ok ? null : loaded.message,
    situationDraft: null,
    chooser: null,
    scoreDraft: null,
    form: latest ? null : newGameForm(),
  };

  const currentGame = (): Game | undefined => state.games.find((g) => g.id === state.currentGameId);

  const persist = (): void => {
    if (!saveGames(STORAGE_KEY, state.games)) state.notice = '기록을 저장하지 못했습니다. 저장 공간을 확인하세요.';
  };

  const replaceGame = (game: Game): void => {
    state.games = state.games.map((g) => (g.id === game.id ? game : g));
    persist();
    render();
  };

  const updateCurrent = (change: (g: Game) => Game): void => {
    const game = currentGame();
    if (game) replaceGame(change(game));
  };

  const go = (tab: Tab): void => {
    state.tab = tab;
    state.situationDraft = null;
    state.chooser = null;
    state.scoreDraft = null;
    render();
    window.scrollTo(0, 0);
  };

  const inputActions = {
    pitch: (result: PitchResult, hitType?: HitType) => {
      state.notice = null;
      state.chooser = null;
      updateCurrent((g) => addPitch(g, result, hitType));
    },
    runner: (action: RunnerAction, base?: BaseIndex) => {
      state.chooser = null;
      updateCurrent((g) => addPlay(g, action, base));
      if (action === 'error') {
        // 실책 뒤에는 바로 상황 고치기를 열어 바뀐 주자·점수를 맞추게 한다.
        const game = currentGame();
        if (!game) return;
        const { inning, outs, bases } = replayOf(game).state;
        state.situationDraft = { inning, outs, bases, runs: 0, reason: ERROR_REASON };
        render();
      }
    },
    choose: (chooser: Chooser) => {
      state.chooser = chooser;
      render();
    },
    undo: (targetId: string) => updateCurrent((g) => addVoid(g, targetId)),
    editSituation: (draft: SituationDraft | null) => {
      state.situationDraft = draft;
      render();
    },
    saveSituation: (draft: SituationDraft) => {
      state.situationDraft = null;
      updateCurrent((g) => addAdjust(g, draft.inning, draft.outs, draft.bases, draft.runs));
    },
    openGames: () => go('games'),
    openScoreboard: () => go('records'),
  };

  const scoreActions = {
    edit: (draft: ScoreDraft | null) => {
      state.scoreDraft = draft;
      render();
    },
    save: (draft: ScoreDraft) => {
      state.scoreDraft = null;
      updateCurrent((g) => addScore(g, draft.team, draft.inning, draft.runs));
    },
  };

  const gamesActions = {
    select: (id: string) => {
      state.currentGameId = id;
      go('input');
    },
    openNew: () => {
      state.form = newGameForm();
      render();
    },
    openEdit: (game: Game) => {
      state.form = { gameId: game.id, info: gameInfo(game), error: null };
      render();
    },
    changeForm: (form: GameForm) => {
      state.form = form;
    },
    cancelForm: () => {
      state.form = null;
      render();
    },
    saveForm: (form: GameForm) => {
      const error = validateInfo(form.info);
      if (error) {
        state.form = { ...form, error };
        render();
        return;
      }
      state.form = null;
      if (form.gameId === null) {
        const game = createGame(form.info);
        state.games = [...state.games, game];
        state.currentGameId = game.id;
        persist();
        go('input');
        return;
      }
      const game = state.games.find((g) => g.id === form.gameId);
      if (game) replaceGame(setGameInfo(game, form.info));
    },
  };

  const render = (): void => {
    const game = currentGame();
    const body = renderBody(game);

    const children: Node[] = [
      h('header', { className: 'topbar' }, [
        h('button', { className: 'back', text: '‹ 처음으로', onClick: onBack }),
        h('h1', { text: '투수 기록' }),
      ]),
      h('main', { className: 'content' }, [body]),
      h(
        'nav',
        { className: 'tabbar' },
        TABS.map(([tab, label]) =>
          h('button', {
            className: state.tab === tab ? 'active' : '',
            text: label,
            disabled: tab !== 'games' && !game,
            onClick: () => go(tab),
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

  const renderBody = (game: Game | undefined): HTMLElement => {
    if (state.tab === 'games' || !game) {
      return gamesView(state.games, state.currentGameId, state.form, gamesActions, replayOf);
    }
    const replay = replayOf(game);
    const events = activeEvents(game.events);
    const score = lineScore(replay, events);
    switch (state.tab) {
      case 'input':
        return inputView(
          { game, replay, events, score, draft: state.situationDraft, chooser: state.chooser },
          inputActions,
        );
      case 'records':
        return recordsView(game, replay, score, state.scoreDraft, scoreActions);
      case 'analysis': {
        const scoped: GameForStats[] =
          state.analysisScope === 'game'
            ? [{ label: gameShortLabel(game), replay }]
            : state.games.map((g) => ({ label: gameShortLabel(g), replay: replayOf(g) }));
        return analysisView(scoped, state.games.length, state.analysisScope, state.analysisTab, {
          scope: (s) => {
            state.analysisScope = s;
            render();
          },
          tab: (t) => {
            state.analysisTab = t;
            render();
          },
        });
      }
    }
  };

  render();
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function validateInfo(info: GameInfo): string | null {
  if (!DATE_PATTERN.test(info.date)) return '경기 날짜를 골라 주세요.';
  if (!Number.isInteger(info.startInning) || info.startInning < 1) return '시작 이닝은 1회 이상이어야 합니다.';
  return null;
}
