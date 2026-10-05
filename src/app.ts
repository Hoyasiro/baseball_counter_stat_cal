// 앱 화면: 기록 입력 / 경기(이 경기 기록·경기 목록) / 분석(투수·타자·수비) / 설정
// 입력은 상황 기준 하나, 분석은 투수·타자로 나눈다. (CLAUDE.md 0.5)
// 여기서는 상태를 들고 화면을 다시 그리는 일만 한다. 각 화면은 *-view.ts에 있다.

import { batterAnalysisView } from './batter/analysis-view';
import { AnalysisScope, AnalysisTab } from './common/analysis-ui';
import { h, segmented } from './common/dom';
import { BaseIndex, FieldingCredit, HitType, PitchResult, Role, activeEvents, playEvents } from './common/events';
import { mergeGames, mergeSummary, parseBackup } from './common/backup-import';
import { downloadFile } from './common/download';
import { backupJson, exportFileName, pitchesCsv } from './common/export';
import { EMPTY_PITCH_DETAIL, FieldDraft, PitchDetail, PitchSheet, isBattedResult } from './common/pitch-detail-view';
import { Hand, loadHand, saveHand } from './common/settings';
import { FIELDING_PLAYS, PlayFieldingDraft } from './common/fielding-view';
import { settingsView } from './common/settings-view';
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
  OPPONENT_MAX_LENGTH,
} from './common/game';
import { GameForm, GameListView, gamesView } from './common/games-view';
import { Chooser, SituationDraft, inputView } from './common/input-view';
import {
  ANALYSIS_KIND_LABEL,
  AnalysisKind,
  AppTab,
  ChildRunnerAction,
  GAMES_PANE_LABEL,
  GamesPane,
  RunnerAction,
  TAB_LABEL,
} from './common/labels';
import { lineScore } from './common/line-score';
import { ScoreDraft, recordsView } from './common/records-view';
import { ActiveState, GameReplay, replayGame } from './common/replay';
import { SceneDraft, defaultRole, defaultSceneDraft } from './common/scene-setup-view';
import { GameForStats } from './common/stat-base';
import { hasSeenTutorial, loadGames, markTutorialSeen, saveGames } from './common/storage';
import { manualView, tutorialView } from './common/help-view';
import { pitcherAnalysisView } from './pitcher/analysis-view';
import { fielderAnalysisView } from './fielder/analysis-view';

const STORAGE_KEY = 'baseball-counter.games.v3';
const LEGACY_STORAGE_KEYS = ['baseball-counter.pitcher.games.v2', 'baseball-counter.pitcher.games.v1'];

type Tab = AppTab;

const TABS: readonly Tab[] = ['input', 'games', 'analysis', 'settings'];

const GAMES_PANES: readonly GamesPane[] = ['current', 'list'];

const ANALYSIS_KINDS: readonly AnalysisKind[] = ['pitcher', 'batter', 'fielder'];

/** 분석 종류마다 화면이 따로 있다 (투수·타자·수비 계산을 섞지 않는다. CLAUDE.md 0.5) */
function analysisView(kind: AnalysisKind): typeof pitcherAnalysisView {
  if (kind === 'batter') return batterAnalysisView;
  return kind === 'fielder' ? fielderAnalysisView : pitcherAnalysisView;
}

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
  /** 투구 상세(구종·존·구속)를 함께 기록하는지 */
  detailMode: boolean;
  pitchSheet: PitchSheet | null;
  fieldDraft: FieldDraft | null;
  /** 엄지가 닿는 쪽 (설정) */
  hand: Hand;
  /** 경기 목록 정렬·찾기 */
  gameList: GameListView;
  /** 수비 중 주자 상황에서 아이의 수비 기록을 고르는 중 */
  playFielding: PlayFieldingDraft | null;
  /** "경기" 탭에서 보고 있는 것 */
  gamesPane: GamesPane;
  /** "분석" 탭에서 보고 있는 것 */
  analysisKind: AnalysisKind;
}

const DETAIL_MODE_KEY = 'baseball-counter.pitch-detail';

/** 투구 상세 켜짐/꺼짐은 이 휴대폰에만 기억한다 (편의 설정). */
function loadDetailMode(): boolean {
  try {
    return localStorage.getItem(DETAIL_MODE_KEY) === '1';
  } catch {
    return false;
  }
}

function saveDetailMode(on: boolean): void {
  try {
    localStorage.setItem(DETAIL_MODE_KEY, on ? '1' : '0');
  } catch {
    // 기억하지 못해도 이번에는 그대로 쓴다.
  }
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
  if (info.opponent.trim().length > OPPONENT_MAX_LENGTH) return `상대팀 이름은 ${OPPONENT_MAX_LENGTH}자까지 넣을 수 있어요.`;
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
    detailMode: loadDetailMode(),
    pitchSheet: null,
    fieldDraft: null,
    hand: loadHand(),
    gameList: { order: 'newest', type: 'all', query: '' },
    playFielding: null,
    gamesPane: latest ? 'current' : 'list',
    analysisKind: 'pitcher',
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
    state.fieldDraft = null;
    state.pitchSheet = null;
    state.playFielding = null;
    render();
    window.scrollTo(0, 0);
  };

  /** 공 하나를 기록한다. 투구 상세 창에서 고른 구종·존·구속이 있으면 함께 남긴다. */
  const recordPitch = (
    result: PitchResult,
    extra: { hitType?: HitType; doublePlay?: BaseIndex; pitch: PitchDetail; battedBall?: FieldDraft | null; fielding?: readonly FieldingCredit[] | null },
  ): void => {
    const detail = extra.pitch;
    const ball = extra.battedBall;
    state.pitchSheet = null;
    state.fieldDraft = null;
    state.chooser = null;
    updateCurrent((g) =>
      addPitch(g, result, {
        hitType: extra.hitType,
        doublePlay: extra.doublePlay,
        pitchType: detail.pitchType ?? undefined,
        zone: detail.zone ?? undefined,
        speed: detail.speed ?? undefined,
        battedBall: ball ? { x: ball.x, y: ball.y, type: ball.type, strength: ball.strength } : undefined,
        fielding: extra.fielding ?? undefined,
      }),
    );
  };

  const currentReplay = (): GameReplay | null => {
    const game = currentGame();
    return game ? replayOf(game) : null;
  };

  /** 아이가 수비 중인지 (투수 또는 수비수 장면) */
  const childIsFielding = (): boolean => {
    const role = currentReplay()?.state?.role;
    return role === 'pitcher' || role === 'fielder';
  };

  /** 친 공은 야구장 그림에서 낙구 지점과 질(수비 중이면 아이의 수비 기록도)을 고른 뒤 기록한다. 나머지는 바로 기록한다. */
  const afterPitchDetail = (result: PitchResult, hitType: HitType | undefined, pitch: PitchDetail, doublePlay?: BaseIndex): void => {
    if (isBattedResult(result)) {
      state.pitchSheet = null;
      state.fieldDraft = { result, hitType, doublePlay, x: null, y: null, type: null, strength: null, pitch, fielding: childIsFielding() ? [] : null };
      render();
      return;
    }
    recordPitch(result, { hitType, pitch });
  };

  /** 주자 상황 기록. 실책 뒤에는 바로 상황 고치기를 열어 바뀐 주자·점수를 맞추게 한다. */
  const recordRunnerPlay = (action: RunnerAction, base: BaseIndex | undefined, fielding: readonly FieldingCredit[]): void => {
    updateCurrent((g) => addPlay(g, action, base, fielding));
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
  };

  const inputActions = {
    pitch: (result: PitchResult, hitType?: HitType) => {
      state.chooser = null;
      // 투구 상세를 켜 두었으면 그 공의 구종·존·구속을 고르는 창부터 연다.
      if (state.detailMode) {
        state.pitchSheet = { result, hitType, ...EMPTY_PITCH_DETAIL };
        render();
        return;
      }
      afterPitchDetail(result, hitType, EMPTY_PITCH_DETAIL);
    },
    doublePlay: (base: BaseIndex) => {
      state.chooser = null;
      if (state.detailMode) {
        state.pitchSheet = { result: 'out', doublePlay: base, ...EMPTY_PITCH_DETAIL };
        render();
        return;
      }
      afterPitchDetail('out', undefined, EMPTY_PITCH_DETAIL, base);
    },
    toggleDetail: () => {
      state.detailMode = !state.detailMode;
      saveDetailMode(state.detailMode);
      render();
    },
    sheet: {
      change: (sheet: PitchSheet) => {
        state.pitchSheet = sheet;
        render();
      },
      changeSpeed: (speed: number | null) => {
        if (state.pitchSheet) state.pitchSheet = { ...state.pitchSheet, speed };
      },
      save: (sheet: PitchSheet) =>
        afterPitchDetail(sheet.result, sheet.hitType, { pitchType: sheet.pitchType, zone: sheet.zone, speed: sheet.speed }, sheet.doublePlay),
      skip: (sheet: PitchSheet) => afterPitchDetail(sheet.result, sheet.hitType, EMPTY_PITCH_DETAIL, sheet.doublePlay),
      cancel: () => {
        state.pitchSheet = null;
        render();
      },
    },
    field: {
      change: (draft: FieldDraft) => {
        state.fieldDraft = draft;
        render();
      },
      save: (draft: FieldDraft) =>
        recordPitch(draft.result, { hitType: draft.hitType, doublePlay: draft.doublePlay, pitch: draft.pitch, battedBall: draft, fielding: draft.fielding }),
      // 낙구 지점·질만 건너뛴다. 고른 수비 기록은 남긴다.
      skip: (draft: FieldDraft) => recordPitch(draft.result, { hitType: draft.hitType, doublePlay: draft.doublePlay, pitch: draft.pitch, fielding: draft.fielding }),
      cancel: () => {
        state.fieldDraft = null;
        render();
      },
    },
    runner: (action: RunnerAction, base?: BaseIndex) => {
      state.chooser = null;
      // 수비 중이면 아이가 잡거나 던졌는지(또는 실책인지) 먼저 묻는다.
      if (childIsFielding() && FIELDING_PLAYS.includes(action)) {
        state.playFielding = { action, base, fielding: [] };
        render();
        return;
      }
      recordRunnerPlay(action, base, []);
    },
    playFielding: {
      change: (draft: PlayFieldingDraft) => {
        state.playFielding = draft;
        render();
      },
      save: (draft: PlayFieldingDraft) => {
        state.playFielding = null;
        recordRunnerPlay(draft.action, draft.base, draft.fielding);
      },
      cancel: () => {
        state.playFielding = null;
        render();
      },
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
    openGames: () => {
      state.gamesPane = 'list';
      go('games');
    },
    openScoreboard: () => {
      state.gamesPane = 'current';
      go('games');
    },
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
      state.gamesPane = 'current';
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
        state.gamesPane = 'current';
        persist();
        go('input');
        return;
      }
      const game = state.games.find((g) => g.id === form.gameId);
      if (game) replaceGame(setGameInfo(game, form.info));
    },
    openSettings: () => {
      state.form = null;
      go('settings');
    },
    changeList: (list: GameListView) => {
      // 찾는 말은 목록만 바꿔 그리므로 여기서는 담기만 하고, 정렬·구분이 바뀌면 다시 그린다.
      const redraw = list.order !== state.gameList.order || list.type !== state.gameList.type;
      state.gameList = list;
      if (redraw) render();
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

  const settingsActions = {
    hand: (hand: Hand) => {
      state.hand = hand;
      saveHand(hand);
      render();
    },
    download: (kind: 'backup' | 'pitches') => {
      const file =
        kind === 'backup'
          ? { name: exportFileName('backup', today()), data: backupJson(state.games, new Date().toISOString()), type: 'application/json' }
          : { name: exportFileName('pitches', today()), data: pitchesCsv(state.games, replayOf), type: 'text/csv' };
      void downloadFile(file.name, file.data, file.type).then((result) => {
        if (result === 'saved') return;
        state.notice = result === 'declined' ? '내려받기를 취소했습니다.' : '이 화면에서는 파일을 내려받을 수 없습니다. 휴대폰 브라우저에서 앱을 열어 다시 해 보세요.';
        render();
      });
    },
    importBackup: (file: File) => {
      void file
        .text()
        .then((text) => {
          const parsed = parseBackup(text);
          if (!parsed.ok) {
            state.notice = parsed.message;
            render();
            return;
          }
          const merged = mergeGames(state.games, parsed.games);
          state.games = [...merged.games];
          // 첫 화면(경기가 하나도 없을 때)에서 불러왔다면 새 경기 입력 대신 경기 목록을 보여준다.
          if (state.form?.gameId === null && merged.games.length > 0) state.form = null;
          state.currentGameId ??= state.games[state.games.length - 1]?.id ?? null;
          state.notice = saveGames(STORAGE_KEY, state.games)
            ? mergeSummary(merged)
            : '불러온 기록을 저장하지 못했습니다. 저장 공간을 확인하세요. 앱을 닫으면 불러온 기록이 사라집니다.';
          render();
        })
        .catch(() => {
          state.notice = '파일을 열 수 없습니다. 다시 골라 주세요.';
          render();
        });
    },
  };

  const renderBody = (game: Game | undefined): HTMLElement => {
    if (state.helpOpen) return manualView(helpActions);
    if (state.tab === 'settings') return settingsView(state.hand, state.games.length > 0, settingsActions);
    if (!game || state.form || (state.tab === 'games' && state.gamesPane === 'list')) {
      return withPanes(game, gamesView(state.games, state.currentGameId, state.form, state.gameList, gamesActions, replayOf));
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
            detailMode: state.detailMode,
            pitchSheet: state.pitchSheet,
            hand: state.hand,
            fieldDraft: state.fieldDraft,
            playFielding: state.playFielding,
          },
          inputActions,
        );
      case 'games':
        return withPanes(game, recordsView(info, replay, score, state.scoreDraft, scoreActions));
      case 'analysis':
        return h('div', { className: 'analysis-page' }, [
          segmented<AnalysisKind>(
            ANALYSIS_KINDS.map((k) => [k, ANALYSIS_KIND_LABEL[k]]),
            state.analysisKind,
            (k) => {
              state.analysisKind = k;
              render();
            },
            'kind-tabs',
          ),
          analysisView(state.analysisKind)(scopedGames(game, replay), state.games.length, state.analysisScope, state.analysisTab, analysisActions),
        ]);
    }
  };

  /** "경기" 탭 위쪽의 작은 탭: 이 경기 기록 / 경기 목록 (경기가 있고 정보 입력 중이 아닐 때) */
  const withPanes = (game: Game | undefined, body: HTMLElement): HTMLElement => {
    if (!game || state.form) return body;
    return h('div', { className: 'games-page' }, [
      segmented<GamesPane>(
        GAMES_PANES.map((p) => [p, GAMES_PANE_LABEL[p]]),
        state.gamesPane,
        (p) => {
          state.gamesPane = p;
          state.scoreDraft = null;
          render();
        },
        'kind-tabs',
      ),
      body,
    ]);
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
            disabled: (tab === 'input' || tab === 'analysis') && !game,
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
    // 손 설정에 따라 CSS가 자주 누르는 단추를 엄지 쪽으로 옮긴다.
    root.dataset.hand = state.hand;
    root.replaceChildren(...children);
  };

  render();
}
