// 경기 결과 화면 (공통): 스코어보드와 장면별 기록

import { basesLabel } from './bases';
import { countLabel } from './count';
import { h } from './dom';
import { MAX_RUNS, Team, UndoableEvent } from './events';
import { GAME_TYPE_LABEL, GameInfo, dateLabel, opponentLabel, orderLabel, ourTeamLabel } from './game';
import { ACTOR_LABEL, GAME_RESULT_LABEL, RUNNER_EVENT_LABEL, SCORE_CELL_LABEL, eventLabel, outcomeLabel, sceneTitle } from './labels';
import { popup } from './popup';
import { LineScore } from './line-score';
import { lineScoreTable } from './line-score-view';
import { GameReplay, PlateAppearance, Scene, SceneEnd } from './replay';

const END_LABEL: Record<SceneEnd, string> = {
  exit: '교체됨',
  next: '다음 장면으로',
  childDone: '아이 차례 끝',
  halfOver: '3아웃',
};

function chip(event: UndoableEvent): HTMLElement {
  const kindClass = event.kind === 'pitch' ? event.result : event.kind;
  return h('span', { className: `chip ${kindClass}`, text: eventLabel(event) });
}

function paCard(pa: PlateAppearance): HTMLElement {
  const runs = pa.runs > 0 ? ` · ${pa.runs}점` : '';
  return h('article', { className: `pa ${pa.actor}${pa.outcome === null ? ' current' : ''}` }, [
    h('h3', { text: `${pa.number}번째 타석 · ${ACTOR_LABEL[pa.actor]} · ${outcomeLabel(pa)}${runs}` }),
    h('p', { className: 'sub', text: `${pa.inning}회 시작: ${basesLabel(pa.basesBefore)} · ${pa.outsBefore}아웃 · 투구 ${pa.pitches.length}` }),
    pa.endCount ? h('p', { className: 'sub', text: `${countLabel(pa.endCount)}에서 끝남` }) : null,
    h('p', { className: 'chips' }, pa.timeline.map(chip)),
  ]);
}

function sceneBlock(scene: Scene, replay: GameReplay): HTMLElement {
  const pas = replay.plateAppearances.filter((pa) => pa.sceneId === scene.id);
  const runs = replay.runnerEvents.filter((e) => e.sceneId === scene.id);
  const start = `시작: ${scene.outs}아웃 · ${basesLabel(scene.bases)}${scene.count.balls || scene.count.strikes ? ` · ${countLabel(scene.count)}` : ''}`;
  return h('section', { className: 'scene-block' }, [
    h('h2', { className: 'inning-title', text: sceneTitle(scene.role, scene.inning, scene.half, scene.position) }),
    h('p', { className: 'sub', text: `${start}${scene.endedBy ? ` · 끝: ${END_LABEL[scene.endedBy]}` : ' · 진행 중'}` }),
    runs.length > 0
      ? h('p', { className: 'chips' }, runs.map((e) => h('span', { className: 'chip runner', text: `아이 ${RUNNER_EVENT_LABEL[e.kind]} (${e.inning}회)` })))
      : null,
    ...pas.map(paCard),
  ]);
}

/** 스코어보드 칸 하나를 고치는 중 */
export interface ScoreCellDraft {
  readonly team: Team;
  readonly inning: number;
  readonly runs: number;
  /** 이미 직접 넣은 점수가 있는 칸인지 (있으면 "기록대로 되돌리기"를 보여준다) */
  readonly manual: boolean;
}

export interface ResultActions {
  back: () => void;
  toggleScoreboard: () => void;
  editCell: (draft: ScoreCellDraft | null) => void;
  saveCell: (draft: ScoreCellDraft) => void;
  resetCell: (draft: ScoreCellDraft) => void;
  openChildRecord: () => void;
}

/** 숫자 키보드 대신 0~9 단추와 −/+ 로 점수를 넣는 창 */
function scoreCellPopup(draft: ScoreCellDraft, teamName: string, actions: ResultActions): HTMLElement {
  const set = (runs: number): void => actions.editCell({ ...draft, runs: Math.min(MAX_RUNS, Math.max(0, runs)) });
  return popup('score-cell-popup', `${draft.inning}회 ${teamName} 점수`, () => actions.editCell(null), [
    h('div', { className: 'sheet-head' }, [
      h('p', { className: 'section-title', text: `${draft.inning}회 ${teamName} 점수` }),
      h('button', { className: 'link-button', text: '← 돌아가기', onClick: () => actions.editCell(null) }),
    ]),
    h('div', { className: 'score-cell-value' }, [
      h('button', { text: '−', disabled: draft.runs <= 0, attrs: { 'aria-label': '1점 빼기' }, onClick: () => set(draft.runs - 1) }),
      h('strong', { text: `${draft.runs}점` }),
      h('button', { text: '+', disabled: draft.runs >= MAX_RUNS, attrs: { 'aria-label': '1점 더하기' }, onClick: () => set(draft.runs + 1) }),
    ]),
    h(
      'div',
      { className: 'score-keypad', attrs: { role: 'group', 'aria-label': '점수 고르기' } },
      Array.from({ length: SCORE_KEYPAD_SIZE }, (_, n) => h('button', { className: draft.runs === n ? 'active' : '', text: String(n), onClick: () => set(n) })),
    ),
    h('div', { className: 'confirm-buttons sheet-buttons' }, [
      draft.manual ? h('button', { className: 'secondary', text: SCORE_CELL_LABEL.reset, onClick: () => actions.resetCell(draft) }) : null,
      h('button', { className: 'primary', text: SCORE_CELL_LABEL.save, onClick: () => actions.saveCell(draft) }),
    ]),
  ]);
}

/** 0~9점 단추. 그보다 많으면 + 로 넣는다. */
const SCORE_KEYPAD_SIZE = 10;

export interface ResultModel {
  readonly info: GameInfo;
  readonly replay: GameReplay;
  readonly score: LineScore;
  readonly showScoreboard: boolean;
  readonly cellDraft: ScoreCellDraft | null;
}

/** 경기 결과: 스코어보드(선택) · 내 아이 기록 보기 · 장면별 기록 */
export function recordsView(model: ResultModel, actions: ResultActions): HTMLElement {
  const { info, replay, score } = model;
  const names = { us: ourTeamLabel(info), them: opponentLabel(info.opponent) };
  const scenes = [...replay.scenes].reverse();
  return h('section', { className: 'records' }, [
    h('button', { className: 'link-button back-button', text: GAME_RESULT_LABEL.back, onClick: actions.back }),
    h('p', { className: 'game-title', text: `${dateLabel(info.date)} · ${names.us} vs ${names.them} · ${GAME_TYPE_LABEL[info.gameType]} · ${orderLabel(info)}` }),
    h('div', { className: 'scoreboard-head' }, [
      h('h2', { className: 'inning-title', attrs: { id: 'scoreboard' }, text: GAME_RESULT_LABEL.scoreboard }),
      h('button', {
        className: `view-toggle${model.showScoreboard ? ' on' : ''}`,
        text: model.showScoreboard ? '보기 켜짐' : '보기 꺼짐',
        attrs: { 'aria-pressed': model.showScoreboard ? 'true' : 'false', 'aria-label': '스코어보드 보기' },
        onClick: actions.toggleScoreboard,
      }),
    ]),
    model.showScoreboard
      ? lineScoreTable(score, names, replay.state?.inning ?? null, (team, inning) => {
          const i = score.innings.indexOf(inning);
          actions.editCell({ team, inning, runs: score.runs[team][i] ?? 0, manual: score.manual[team][i] });
        })
      : h('p', { className: 'help', text: `안 써도 괜찮아요. 아이 기록이 먼저예요. (지금 ${names.them} ${score.totalRuns.them} : ${score.totalRuns.us} ${names.us})` }),
    h('button', { className: 'primary child-record', text: GAME_RESULT_LABEL.childRecord, onClick: actions.openChildRecord }),
    h('h2', { className: 'inning-title', text: '장면별 기록' }),
    scenes.length === 0 ? h('p', { className: 'empty', text: '아직 기록이 없습니다. 기록 입력에서 아이가 나오는 장면을 시작하세요.' }) : null,
    ...scenes.map((scene) => sceneBlock(scene, replay)),
    model.cellDraft ? scoreCellPopup(model.cellDraft, names[model.cellDraft.team], actions) : null,
  ]);
}
