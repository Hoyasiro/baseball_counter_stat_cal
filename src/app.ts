// 앱 화면: 기록 입력 / 기록 보기 / 투수 분석 / 타자 분석 / 경기 목록
// 입력은 상황 기준 하나, 분석은 투수·타자로 나눈다. (CLAUDE.md 0.5)
// 여기서는 상태를 들고 화면을 다시 그리는 일만 한다. 각 화면은 *-view.ts에 있다.

import { batterAnalysisView } from './batter/analysis-view';
import { AnalysisScope, AnalysisTab } from './common/analysis-ui';
import { h } from './common/dom';
import { BaseIndex, HitType, PitchResult, Role, activeEvents, playEvents } from './common/events';
import {
  Game,
  GameInfo,
  addAdjust,
  addAppearance,
  addExit,
  addPitch,
  addPlay,
  addScore,
  addVoid,
  createGame,
  gameInfo,
  gameShortLabel,
  setGameInfo,
  today,
} from './common/game';
import { GameForm, gamesView } from './common/games-view';
import { Chooser, SituationDraft, inputView } from './common/input-view';
import { AppTab, ChildRunnerAction, RunnerAction, TAB_LABEL } from './common/labels';
import { lineScore } from './common/line-score';
import { ScoreDraft, recordsView } from './common/records-view';
import { ActiveState, GameReplay, replayGame } from './common/replay';
import { SceneDraft, defaultRole, defaultSceneDraft } from './common/scene-setup-view';
import { GameForStats } from './common/stat-base';
import { hasSeenTutorial, loadGames, markTutorialSeen, saveGames } from './common/storage';
import { manualView, tutorialView } from './common/help-view';
import { pitcherAnalysisView } from './pitcher/analysis-view';

const STORAGE_KEY = 'baseball-counter.games.v3';
const LEGACY_STORAGE_KEYS = ['baseball-counter.pitcher.games.v2', 'baseball-counter.pitcher.games.v1'];

type Tab = AppTab;

const TABS: readonly Tab[] = ['input', 'records', 'pitcher', 'batter', 'games'];

interface State {
  games: Game[];
  currentGameId: string | null;
  tab: Tab;
  analysisTab: AnalysisTab;
  analysisScope: AnalysisScope;
  notice: string | null;
  situationDraft: SituationDraft | null;
  chooser: Chooser;
  sceneDraft: SceneDraft | null;
  scoreDraft: ScoreDraft | null;
  form: GameForm | null;
  /** 도움말(사용 설명서)을 보고 있는지 */
  helpOpen: boolean;
  /** 처음 사용 안내의 몇 번째 단계인지. 닫혀 있으면 null */
  tutorialStep: number | null;
}

export function replayOf(game: Game): GameReplay {
  const info = gameInfo(game);
  return replayGame(playEvents(activeEvents(game.events)), { battingFirst: info.battingFirst });
}

const ERROR_REASON = '실책으로 바뀐 주자·아웃·점수를 맞춰 주세요. 바뀐 게 없으면 취소를 누르세요.';
const BLOCKED_ADVANCE_REASON = '다음 베이스에 주자가 있어요. 주자들이 어떻게 움직였는지 맞춰 주세요.';

function newGameForm(): GameForm {
  return {
    gameId: null,
    info: { date: today(), opponent: '', gameType: 'practice', battingFirst: 'them' },
    error: null,
  };
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function validateInfo(info: GameInfo): string | null {
  if (!DATE_PATTERN.test(info.date)) return '경기 날짜를 골라 주세요.';
  return null;
}

/** 주자인 아이를 한 칸 옮기거나 홈인·아웃시키는 고침 */
function childRunnerAdjust(state: ActiveState, action: 'advance' | 'scored' | 'out'): SituationDraft | 'blocked' {
  const base = state.childBase;
  const bases: [boolean, boolean, boolean] = [state.bases[0], state.bases[1], state.bases[2]];
  if (base !== null) bases[base] = false;
  const common = { inning: state.inning, reason: null };
  if (action === 'out') return { ...common, outs: state.outs + 1, bases, runs: 0, child: 'out' };
  if (action === 'scored' || base === 2) return { ...common, outs: state.outs, bases, runs: 1, child: 'scored' };
  const target = ((base ?? -1) + 1) as BaseIndex;
  if (state.bases[target]) return 'blocked';
  bases[target] = true;
  return { ...common, outs: state.outs, bases, runs: 0, child: target };
}

export function mountApp(root: HTMLElement): void {
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
    sceneDraft: null,
    scoreDraft: null,
    form: latest ? null : newGameForm(),
    helpOpen: false,
    tutorialStep: hasSeenTutorial() ? null : 0,
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
    state.helpOpen = false;
    state.situationDraft = null;
    state.chooser = null;
    state.sceneDraft = null;
    state.scoreDraft = null;
    render();
    window.scrollTo(0, 0);
  };

  const currentReplay = (): GameReplay | null => {
    const game = currentGame();
    return game ? replayOf(game) : null;
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
        const active = currentReplay()?.state;
        if (!active) return;
        state.situationDraft = {
          inning: active.inning,
          outs: active.outs,
          bases: active.bases,
          runs: 0,
          child: active.role === 'runner' ? active.childBase : null,
          reason: ERROR_REASON,
        };
        render();
      }
    },
    childRunner: (action: ChildRunnerAction) => {
      const active = currentReplay()?.state;
      if (!active || active.childBase === null) return;
      if (action === 'advance' || action === 'scored' || action === 'out') {
        const draft = childRunnerAdjust(active, action);
        if (draft === 'blocked') {
          state.situationDraft = {
            inning: active.inning,
            outs: active.outs,
            bases: active.bases,
            runs: 0,
            child: active.childBase,
            reason: BLOCKED_ADVANCE_REASON,
          };
          render();
          return;
        }
        updateCurrent((g) => addAdjust(g, { ...draft, child: draft.child ?? undefined }));
        return;
      }
      const base = active.childBase;
      updateCurrent((g) => addPlay(g, action, base));
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
      updateCurrent((g) => addAdjust(g, { ...draft, child: draft.child ?? undefined }));
    },
    openScene: () => {
      const replay = currentReplay();
      if (!replay) return;
      state.sceneDraft = defaultSceneDraft(replay, defaultRole(replay));
      state.chooser = null;
      state.situationDraft = null;
      render();
    },
    openGames: () => go('games'),
    openScoreboard: () => go('records'),
    scene: {
      change: (draft: SceneDraft) => {
        state.sceneDraft = draft;
        render();
      },
      changeRole: (role: Role) => {
        const replay = currentReplay();
        if (!replay) return;
        state.sceneDraft = defaultSceneDraft(replay, role);
        render();
      },
      start: (draft: SceneDraft) => {
        state.sceneDraft = null;
        updateCurrent((g) =>
          addAppearance(g, {
            role: draft.role,
            inning: draft.inning,
            outs: draft.outs,
            bases: draft.bases,
            balls: draft.balls,
            strikes: draft.strikes,
            childBase: draft.childBase ?? undefined,
            position: draft.position ?? undefined,
          }),
        );
      },
      cancel: () => {
        state.sceneDraft = null;
        render();
      },
      exit: () => {
        state.sceneDraft = null;
        updateCurrent((g) => addExit(g));
      },
    },
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

  const analysisActions = {
    scope: (s: AnalysisScope) => {
      state.analysisScope = s;
      render();
    },
    tab: (t: AnalysisTab) => {
      state.analysisTab = t;
      render();
    },
  };

  const scopedGames = (game: Game, replay: GameReplay): GameForStats[] =>
    state.analysisScope === 'game'
      ? [{ label: gameShortLabel(game), replay }]
      : state.games.map((g) => ({ label: gameShortLabel(g), replay: replayOf(g) }));

  const helpActions = {
    close: () => {
      state.helpOpen = false;
      render();
    },
    openTutorial: () => {
      state.tutorialStep = 0;
      render();
    },
  };

  const tutorialActions = {
    go: (step: number) => {
      state.tutorialStep = step;
      render();
    },
    close: () => {
      state.tutorialStep = null;
      markTutorialSeen();
      render();
    },
  };

  const renderBody = (game: Game | undefined): HTMLElement => {
    if (state.helpOpen) return manualView(helpActions);
    if (state.tab === 'games' || !game) {
      return gamesView(state.games, state.currentGameId, state.form, gamesActions, replayOf);
    }
    const info = gameInfo(game);
    const replay = replayOf(game);
    const events = activeEvents(game.events);
    const score = lineScore(replay, events);
    switch (state.tab) {
      case 'input':
        return inputView(
          {
            game,
            info,
            replay,
            events,
            score,
            draft: state.situationDraft,
            chooser: state.chooser,
            sceneDraft: state.sceneDraft,
          },
          inputActions,
        );
      case 'records':
        return recordsView(info, replay, score, state.scoreDraft, scoreActions);
      case 'pitcher':
        return pitcherAnalysisView(scopedGames(game, replay), state.games.length, state.analysisScope, state.analysisTab, analysisActions);
      case 'batter':
        return batterAnalysisView(scopedGames(game, replay), state.games.length, state.analysisScope, state.analysisTab, analysisActions);
    }
  };

  const render = (): void => {
    const game = currentGame();
    const children: Node[] = [
      h('header', { className: 'topbar' }, [
        h('h1', { text: '우리 아이 야구 기록' }),
        h('button', {
          className: 'help-button',
          text: '도움말',
          onClick: () => {
            state.helpOpen = true;
            render();
            window.scrollTo(0, 0);
          },
        }),
      ]),
      h('main', { className: 'content' }, [renderBody(game)]),
      h(
        'nav',
        { className: 'tabbar' },
        TABS.map((tab) =>
          h('button', {
            className: state.tab === tab && !state.helpOpen ? 'active' : '',
            text: TAB_LABEL[tab],
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
    if (state.tutorialStep !== null) children.push(tutorialView(state.tutorialStep, tutorialActions));
    root.replaceChildren(...children);
  };

  render();
}
