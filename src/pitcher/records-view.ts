// 투수 기록 보기 화면: 스코어보드와 이닝별 타석

import { basesLabel } from '../common/bases';
import { countLabel } from '../common/count';
import { h } from '../common/dom';
import { MAX_INNING, MAX_RUNS, Team, UndoableEvent } from '../common/events';
import { GAME_TYPE_LABEL, Game, dateLabel, gameInfo, opponentLabel } from '../common/game';
import { LineScore } from '../common/line-score';
import { lineScoreTable } from '../common/line-score-view';
import { GameReplay, PlateAppearance } from '../common/replay';
import { eventLabel, outcomeLabel } from './labels';

export interface ScoreDraft {
  readonly team: Team;
  readonly inning: number;
  readonly runs: number;
}

interface ScoreActions {
  edit: (draft: ScoreDraft | null) => void;
  save: (draft: ScoreDraft) => void;
}

function chip(event: UndoableEvent): HTMLElement {
  const kindClass = event.kind === 'pitch' ? event.result : event.kind;
  return h('span', { className: `chip ${kindClass}`, text: eventLabel(event) });
}

function paCard(pa: PlateAppearance): HTMLElement {
  return h('article', { className: `pa${pa.outcome === null ? ' current' : ''}` }, [
    h('h3', { text: `${pa.number}번째 타석 · ${outcomeLabel(pa)}${pa.runs > 0 ? ` · ${pa.runs}점` : ''}` }),
    h('p', { className: 'sub', text: `시작: ${basesLabel(pa.basesBefore)} · ${pa.outsBefore}아웃 · 투구 ${pa.pitches.length}` }),
    pa.endCount ? h('p', { className: 'sub', text: `${countLabel(pa.endCount)}에서 끝남` }) : null,
    pa.outcome === 'inningEnded' ? h('p', { className: 'sub', text: '같은 타자가 다음 이닝에 다시 칩니다.' }) : null,
    h('p', { className: 'chips' }, pa.timeline.map(chip)),
  ]);
}

function scoreEditor(draft: ScoreDraft | null, score: LineScore, actions: ScoreActions): HTMLElement {
  if (!draft) {
    return h('button', {
      className: 'secondary',
      text: '점수 넣기',
      onClick: () => actions.edit({ team: 'us', inning: 1, runs: 0 }),
    });
  }
  const set = (change: Partial<ScoreDraft>): void => actions.edit({ ...draft, ...change });
  const recordedIndex = score.innings.indexOf(draft.inning);
  const locked = draft.team === 'them' && recordedIndex >= 0 && score.recorded[recordedIndex];
  const teamButton = (team: Team, label: string): HTMLElement =>
    h('button', { className: draft.team === team ? 'active' : '', text: label, onClick: () => set({ team }) });

  return h('section', { className: 'score-editor' }, [
    h('p', { className: 'section-title', text: '점수 넣기' }),
    h('div', { className: 'team-picker' }, [teamButton('us', '우리 팀'), teamButton('them', '상대팀')]),
    h('div', { className: 'stepper' }, [
      h('span', { text: '이닝' }),
      h('button', { text: '−', disabled: draft.inning <= 1, onClick: () => set({ inning: draft.inning - 1 }), attrs: { 'aria-label': '이닝 줄이기' } }),
      h('strong', { text: `${draft.inning}회` }),
      h('button', { text: '+', disabled: draft.inning >= MAX_INNING, onClick: () => set({ inning: draft.inning + 1 }), attrs: { 'aria-label': '이닝 늘리기' } }),
    ]),
    h('div', { className: 'stepper' }, [
      h('span', { text: '점수' }),
      h('button', { text: '−', disabled: draft.runs <= 0, onClick: () => set({ runs: draft.runs - 1 }), attrs: { 'aria-label': '점수 줄이기' } }),
      h('strong', { text: `${draft.runs}점` }),
      h('button', { text: '+', disabled: draft.runs >= MAX_RUNS, onClick: () => set({ runs: draft.runs + 1 }), attrs: { 'aria-label': '점수 늘리기' } }),
    ]),
    locked ? h('p', { className: 'help', text: `${draft.inning}회는 투구 기록이 있어 상대 점수를 자동으로 계산합니다.` }) : null,
    h('div', { className: 'confirm-buttons' }, [
      h('button', { className: 'secondary', text: '닫기', onClick: () => actions.edit(null) }),
      h('button', { className: 'primary', text: '저장', disabled: locked, onClick: () => actions.save(draft) }),
    ]),
  ]);
}

export function recordsView(
  game: Game,
  replay: GameReplay,
  score: LineScore,
  scoreDraft: ScoreDraft | null,
  scoreActions: ScoreActions,
): HTMLElement {
  const info = gameInfo(game);
  const pas = replay.plateAppearances;
  const innings = [...new Set(pas.map((pa) => pa.inning))].sort((a, b) => b - a);

  return h('section', { className: 'records' }, [
    h('p', { className: 'game-title', text: `${dateLabel(info.date)} · ${opponentLabel(info.opponent)} · ${GAME_TYPE_LABEL[info.gameType]}` }),
    h('h2', { className: 'inning-title', attrs: { id: 'scoreboard' }, text: '스코어보드' }),
    lineScoreTable(score, opponentLabel(info.opponent), replay.state.inning),
    scoreEditor(scoreDraft, score, scoreActions),
    pas.length === 0 ? h('p', { className: 'empty', text: '아직 기록이 없습니다. 기록 입력에서 공을 기록하세요.' }) : null,
    ...innings.flatMap((inning) => {
      const inInning = pas.filter((pa) => pa.inning === inning);
      const pitches = inInning.reduce((n, pa) => n + pa.pitches.length, 0);
      const runs = inInning.reduce((n, pa) => n + pa.runs, 0);
      return [
        h('h2', { className: 'inning-title', text: `${inning}회 · 투구 ${pitches} · ${runs}점` }),
        ...inInning.slice().reverse().map(paCard),
      ];
    }),
  ]);
}
