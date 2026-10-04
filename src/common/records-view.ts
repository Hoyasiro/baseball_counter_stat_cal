// 기록 보기 화면 (공통): 스코어보드와 장면별 기록

import { basesLabel } from './bases';
import { countLabel } from './count';
import { h } from './dom';
import { MAX_INNING, MAX_RUNS, Team, UndoableEvent } from './events';
import { GAME_TYPE_LABEL, GameInfo, dateLabel, opponentLabel } from './game';
import { ACTOR_LABEL, RUNNER_EVENT_LABEL, eventLabel, outcomeLabel, sceneTitle } from './labels';
import { LineScore } from './line-score';
import { lineScoreTable } from './line-score-view';
import { GameReplay, PlateAppearance, Scene, SceneEnd } from './replay';

export interface ScoreDraft {
  readonly team: Team;
  readonly inning: number;
  readonly runs: number;
}

export interface ScoreActions {
  edit: (draft: ScoreDraft | null) => void;
  save: (draft: ScoreDraft) => void;
}

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

function stepper(label: string, value: string, onMinus: (() => void) | null, onPlus: (() => void) | null): HTMLElement {
  return h('div', { className: 'stepper' }, [
    h('span', { text: label }),
    h('button', { text: '−', disabled: !onMinus, onClick: () => onMinus?.(), attrs: { 'aria-label': `${label} 줄이기` } }),
    h('strong', { text: value }),
    h('button', { text: '+', disabled: !onPlus, onClick: () => onPlus?.(), attrs: { 'aria-label': `${label} 늘리기` } }),
  ]);
}

function scoreEditor(draft: ScoreDraft | null, actions: ScoreActions): HTMLElement {
  if (!draft) {
    return h('button', { className: 'secondary', text: '점수 넣기', onClick: () => actions.edit({ team: 'us', inning: 1, runs: 0 }) });
  }
  const set = (change: Partial<ScoreDraft>): void => actions.edit({ ...draft, ...change });
  const teamButton = (team: Team, label: string): HTMLElement =>
    h('button', { className: draft.team === team ? 'active' : '', text: label, onClick: () => set({ team }) });

  return h('section', { className: 'score-editor' }, [
    h('p', { className: 'section-title', text: '점수 넣기' }),
    h('p', { className: 'help', text: '넣은 점수가 기록에서 센 점수보다 우선합니다.' }),
    h('div', { className: 'team-picker' }, [teamButton('us', '우리 팀'), teamButton('them', '상대팀')]),
    stepper('이닝', `${draft.inning}회`, draft.inning > 1 ? () => set({ inning: draft.inning - 1 }) : null, draft.inning < MAX_INNING ? () => set({ inning: draft.inning + 1 }) : null),
    stepper('점수', `${draft.runs}점`, draft.runs > 0 ? () => set({ runs: draft.runs - 1 }) : null, draft.runs < MAX_RUNS ? () => set({ runs: draft.runs + 1 }) : null),
    h('div', { className: 'confirm-buttons' }, [
      h('button', { className: 'secondary', text: '닫기', onClick: () => actions.edit(null) }),
      h('button', { className: 'primary', text: '저장', onClick: () => actions.save(draft) }),
    ]),
  ]);
}

export function recordsView(
  info: GameInfo,
  replay: GameReplay,
  score: LineScore,
  scoreDraft: ScoreDraft | null,
  scoreActions: ScoreActions,
): HTMLElement {
  const scenes = [...replay.scenes].reverse();
  return h('section', { className: 'records' }, [
    h('p', { className: 'game-title', text: `${dateLabel(info.date)} · ${opponentLabel(info.opponent)} · ${GAME_TYPE_LABEL[info.gameType]} · ${info.battingFirst === 'us' ? '선공' : '후공'}` }),
    h('h2', { className: 'inning-title', attrs: { id: 'scoreboard' }, text: '스코어보드' }),
    lineScoreTable(score, opponentLabel(info.opponent), replay.state?.inning ?? null),
    scoreEditor(scoreDraft, scoreActions),
    scenes.length === 0 ? h('p', { className: 'empty', text: '아직 기록이 없습니다. 기록 입력에서 아이가 나오는 장면을 시작하세요.' }) : null,
    ...scenes.map((scene) => sceneBlock(scene, replay)),
  ]);
}
