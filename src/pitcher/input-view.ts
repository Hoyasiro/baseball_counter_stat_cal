// 투수 기록 입력 화면
// 상황판(이닝·아웃·카운트·주자·점수·투구 수)은 위에 고정하고, 버튼은 스크롤 없이 한 화면에 들어가게 한다.

import { BASE_NAMES, STEAL_NAMES, basesLabel, hasRunner, occupiedBases, stealableBases } from '../common/bases';
import { MAX_BALLS_IN_COUNT, MAX_STRIKES_IN_COUNT, OUTS_PER_INNING } from '../common/count';
import { diamond } from '../common/diamond';
import { h } from '../common/dom';
import { BaseIndex, Bases, HitType, MAX_INNING, MAX_RUNS, PitchResult, UndoableEvent } from '../common/events';
import { Game, dateLabel, gameInfo, opponentLabel } from '../common/game';
import { LineScore } from '../common/line-score';
import { GameReplay } from '../common/replay';
import {
  CHOOSER_QUESTION,
  EXTRA_PITCH_BUTTONS,
  HIT_BUTTONS,
  MAIN_PITCH_BUTTONS,
  PitchButton,
  RUNNER_BUTTONS,
  RunnerAction,
  eventLabel,
  outcomeLabel,
} from './labels';

export interface SituationDraft {
  readonly inning: number;
  readonly outs: number;
  readonly bases: Bases;
  readonly runs: number;
  /** 왜 고치는지 안내 (예: 실책 뒤) */
  readonly reason: string | null;
}

/** 지금 열려 있는 고르기 화면 */
export type Chooser = 'hit' | Exclude<RunnerAction, 'error'> | null;

export interface InputActions {
  pitch: (result: PitchResult, hitType?: HitType) => void;
  runner: (action: RunnerAction, base?: BaseIndex) => void;
  choose: (chooser: Chooser) => void;
  undo: (targetId: string) => void;
  editSituation: (draft: SituationDraft | null) => void;
  saveSituation: (draft: SituationDraft) => void;
  openGames: () => void;
  openScoreboard: () => void;
}

export interface InputModel {
  readonly game: Game;
  readonly replay: GameReplay;
  readonly events: readonly UndoableEvent[];
  readonly score: LineScore;
  readonly draft: SituationDraft | null;
  readonly chooser: Chooser;
}

function dots(filled: number, total: number, kind: string, label: string): HTMLElement {
  return h(
    'span',
    { className: `dots ${kind}`, attrs: { role: 'img', 'aria-label': `${label} ${filled}` } },
    Array.from({ length: total }, (_, i) => h('span', { className: i < filled ? 'dot on' : 'dot' })),
  );
}

function pitchCounts(replay: GameReplay): { total: number; inning: number } {
  const pas = replay.plateAppearances;
  const total = pas.reduce((n, pa) => n + pa.pitches.length, 0);
  const inning = pas.filter((pa) => pa.inning === replay.state.inning).reduce((n, pa) => n + pa.pitches.length, 0);
  return { total, inning };
}

function message(replay: GameReplay): string {
  const pas = replay.plateAppearances;
  const last = pas[pas.length - 1];
  if (!last) return '공을 던질 때마다 결과 버튼을 누르세요.';
  if (last.outcome === null) {
    const lastEvent = last.timeline[last.timeline.length - 1];
    return lastEvent ? `방금: ${eventLabel(lastEvent)}` : '공을 던질 때마다 결과 버튼을 누르세요.';
  }
  const runs = last.runs > 0 ? ` ${last.runs}점 줌.` : '';
  const outcome = `${last.number}번째 타석: ${outcomeLabel(last)}.${runs}`;
  return replay.state.inning !== last.inning ? `${outcome} 3아웃! 이제 ${replay.state.inning}회` : outcome;
}

/** 위에 고정되는 상황판 */
function board(model: InputModel, actions: InputActions): HTMLElement {
  const { replay, game, score } = model;
  const { inning, outs, bases, count } = replay.state;
  const info = gameInfo(game);
  const pitches = pitchCounts(replay);
  const pas = replay.plateAppearances;
  const last = pas[pas.length - 1];
  const paNumber = last && last.outcome === null ? last.number : pas.length + 1;

  return h('div', { className: 'board' }, [
    h('button', { className: 'board-game', onClick: actions.openGames }, [
      `${dateLabel(info.date)} · ${opponentLabel(info.opponent)}`,
      h('span', { text: '경기 ›' }),
    ]),
    h('div', { className: 'board-main' }, [
      h('div', { className: 'board-left' }, [
        h('p', { className: 'inning' }, [h('strong', { text: `${inning}회` }), h('span', { text: `${paNumber}번째 타석` })]),
        h('div', { className: 'count-row' }, [h('span', { text: '볼' }), dots(count.balls, MAX_BALLS_IN_COUNT, 'ball', '볼')]),
        h('div', { className: 'count-row' }, [
          h('span', { text: '스트라이크' }),
          dots(count.strikes, MAX_STRIKES_IN_COUNT, 'strike', '스트라이크'),
        ]),
        h('div', { className: 'count-row' }, [h('span', { text: '아웃' }), dots(outs, OUTS_PER_INNING - 1, 'out', '아웃')]),
      ]),
      h('div', { className: 'board-right' }, [diamond(bases), h('p', { className: 'bases-text', text: basesLabel(bases) })]),
    ]),
    h('div', { className: 'board-stats' }, [
      h('span', { className: 'pill' }, [h('small', { text: '투구 ' }), `${pitches.total}`, h('small', { text: ` (이번 회 ${pitches.inning})` })]),
      h('button', { className: 'pill score', onClick: actions.openScoreboard }, [
        h('small', { text: '상대 ' }),
        `${score.totalRuns.them} : ${score.totalRuns.us}`,
        h('small', { text: ' 우리 ›' }),
      ]),
    ]),
    h('p', { className: 'message', text: message(replay), attrs: { 'aria-live': 'polite' } }),
  ]);
}

function pitchButton(b: PitchButton, onClick: () => void, extra = false): HTMLElement {
  return h('button', { className: `pitch ${b.result}${extra ? ' extra' : ''}`, onClick }, [
    h('strong', { text: b.label }),
    h('small', { text: b.hint }),
  ]);
}

function pitchPad(actions: InputActions, chooser: Chooser): HTMLElement {
  if (chooser === 'hit') {
    return h('section', { className: 'chooser' }, [
      h('p', { className: 'section-title', text: '어떤 안타인가요?' }),
      h(
        'div',
        { className: 'hit-grid' },
        HIT_BUTTONS.map((b) =>
          h('button', { className: `pitch hit`, onClick: () => actions.pitch('hit', b.hitType) }, [
            h('strong', { text: b.label }),
            h('small', { text: b.hint }),
          ]),
        ),
      ),
      h('button', { className: 'secondary', text: '취소', onClick: () => actions.choose(null) }),
    ]);
  }
  return h('div', { className: 'pitch-pad' }, [
    h(
      'div',
      { className: 'pitch-buttons' },
      MAIN_PITCH_BUTTONS.map((b) =>
        pitchButton(b, () => (b.result === 'hit' ? actions.choose('hit') : actions.pitch(b.result))),
      ),
    ),
    h(
      'div',
      { className: 'extra-buttons' },
      EXTRA_PITCH_BUTTONS.map((b) => pitchButton(b, () => actions.pitch(b.result), true)),
    ),
  ]);
}

/** 이 동작을 할 수 있는 베이스 */
function basesFor(action: RunnerAction, bases: Bases): BaseIndex[] {
  if (action === 'stolenBase' || action === 'caughtStealing') return stealableBases(bases);
  return occupiedBases(bases);
}

function baseChoiceLabel(action: RunnerAction, base: BaseIndex): string {
  return action === 'stolenBase' || action === 'caughtStealing' ? STEAL_NAMES[base] : `${BASE_NAMES[base]}`;
}

function runnerPad(bases: Bases, chooser: Chooser, actions: InputActions, onEdit: () => void): HTMLElement {
  if (chooser && chooser !== 'hit') {
    return h('section', { className: 'runner-section' }, [
      h('p', { className: 'section-title', text: CHOOSER_QUESTION[chooser] }),
      h('div', { className: 'choice-row' }, [
        ...basesFor(chooser, bases).map((b) =>
          h('button', { className: 'play', text: baseChoiceLabel(chooser, b), onClick: () => actions.runner(chooser, b) }),
        ),
        h('button', { className: 'secondary', text: '취소', onClick: () => actions.choose(null) }),
      ]),
    ]);
  }

  const onRunner = (action: RunnerAction): void => {
    if (action === 'error') return actions.runner('error');
    const choices = basesFor(action, bases);
    if (choices.length === 1) actions.runner(action, choices[0]);
    else actions.choose(action);
  };

  return h('section', { className: 'runner-section' }, [
    h('p', { className: 'section-title' }, [
      '주자 상황',
      h('small', { text: hasRunner(bases) ? ` · ${basesLabel(bases)}` : ' · 주자가 있을 때 눌러요' }),
    ]),
    h('div', { className: 'play-grid' }, [
      ...RUNNER_BUTTONS.map((b) =>
        h('button', { className: 'play', disabled: basesFor(b.action, bases).length === 0, onClick: () => onRunner(b.action) }, [
          h('strong', { text: b.label }),
          h('small', { text: b.hint }),
        ]),
      ),
      h('button', { className: 'play edit', onClick: onEdit }, [h('strong', { text: '상황 고치기' }), h('small', { text: '주자·아웃·점수' })]),
    ]),
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

function situationEditor(draft: SituationDraft, actions: InputActions): HTMLElement {
  const set = (change: Partial<SituationDraft>): void => actions.editSituation({ ...draft, ...change });
  const toggleBase = (b: BaseIndex): void => {
    const bases: [boolean, boolean, boolean] = [draft.bases[0], draft.bases[1], draft.bases[2]];
    bases[b] = !bases[b];
    set({ bases });
  };
  return h('section', { className: 'situation-editor' }, [
    h('p', { className: 'section-title', text: '상황 고치기' }),
    h('p', {
      className: 'help',
      text: draft.reason ?? '실제 경기와 다르면 맞춰 주세요. 베이스를 누르면 주자를 넣거나 뺍니다.',
    }),
    h('div', { className: 'editor-grid' }, [
      h('div', { className: 'editor-fields' }, [
        stepper(
          '이닝',
          `${draft.inning}회`,
          draft.inning > 1 ? () => set({ inning: draft.inning - 1 }) : null,
          draft.inning < MAX_INNING ? () => set({ inning: draft.inning + 1 }) : null,
        ),
        h('div', { className: 'outs-picker' }, [
          h('span', { text: '아웃' }),
          ...Array.from({ length: OUTS_PER_INNING + 1 }, (_, n) =>
            h('button', { className: draft.outs === n ? 'active' : '', text: `${n}`, onClick: () => set({ outs: n }) }),
          ),
        ]),
        stepper(
          '들어온 점수',
          `${draft.runs}점`,
          draft.runs > 0 ? () => set({ runs: draft.runs - 1 }) : null,
          draft.runs < MAX_RUNS ? () => set({ runs: draft.runs + 1 }) : null,
        ),
      ]),
      diamond(draft.bases, toggleBase),
    ]),
    draft.outs === OUTS_PER_INNING ? h('p', { className: 'help', text: '3아웃으로 저장하면 다음 이닝으로 넘어갑니다.' }) : null,
    h('div', { className: 'confirm-buttons' }, [
      h('button', { className: 'secondary', text: '취소', onClick: () => actions.editSituation(null) }),
      h('button', { className: 'primary', text: '저장', onClick: () => actions.saveSituation(draft) }),
    ]),
  ]);
}

export function inputView(model: InputModel, actions: InputActions): HTMLElement {
  const { replay, events, draft, chooser } = model;
  const { inning, outs, bases } = replay.state;
  const lastEvent = events[events.length - 1];
  const openEditor = (): void => actions.editSituation({ inning, outs, bases, runs: 0, reason: null });

  return h('section', { className: 'input' }, [
    h('div', { className: 'board-sticky' }, [board(model, actions)]),
    draft
      ? situationEditor(draft, actions)
      : h('div', { className: 'controls' }, [
          pitchPad(actions, chooser),
          runnerPad(bases, chooser, actions, openEditor),
          h('button', {
            className: 'undo',
            text: lastEvent ? `↶ 취소: ${eventLabel(lastEvent)}` : '↶ 마지막 기록 취소',
            disabled: !lastEvent,
            onClick: () => lastEvent && actions.undo(lastEvent.id),
          }),
        ]),
  ]);
}
