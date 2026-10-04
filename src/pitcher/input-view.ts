// 투수 기록 입력 화면

import { BASE_NAMES, basesLabel, canStealSecond, hasRunner, occupiedBases } from '../common/bases';
import { MAX_BALLS_IN_COUNT, MAX_STRIKES_IN_COUNT, OUTS_PER_INNING, countLabel } from '../common/count';
import { diamond } from '../common/diamond';
import { h } from '../common/dom';
import { BaseIndex, Bases, MAX_INNING, PitchResult, PlayKind, activeEvents } from '../common/events';
import { GAME_TYPE_LABEL, Game, dateLabel, gameInfo, opponentLabel } from '../common/game';
import { GameReplay } from '../common/replay';
import { EXTRA_PITCH_BUTTONS, MAIN_PITCH_BUTTONS, OUTCOME_LABEL, PLAY_BUTTONS, PitchButton, eventLabel } from './labels';

export interface SituationDraft {
  readonly inning: number;
  readonly outs: number;
  readonly bases: Bases;
}

export interface InputActions {
  pitch: (result: PitchResult) => void;
  play: (play: PlayKind, base?: BaseIndex) => void;
  choosePickoffBase: (choosing: boolean) => void;
  undo: (targetId: string) => void;
  startSituationEdit: (draft: SituationDraft) => void;
  changeSituationDraft: (draft: SituationDraft) => void;
  cancelSituationEdit: () => void;
  saveSituation: (inning: number, outs: number, bases: Bases) => void;
  openGames: () => void;
}

function dots(filled: number, total: number, kind: string): HTMLElement {
  return h(
    'span',
    { className: `dots ${kind}`, attrs: { 'aria-label': `${filled}개` } },
    Array.from({ length: total }, (_, i) => h('span', { className: i < filled ? 'dot on' : 'dot' })),
  );
}

function gameStrip(game: Game, onOpenGames: () => void): HTMLElement {
  const info = gameInfo(game);
  return h('button', { className: 'game-strip', onClick: onOpenGames }, [
    h('span', { text: `${dateLabel(info.date)} · ${opponentLabel(info.opponent)} · ${GAME_TYPE_LABEL[info.gameType]}` }),
    h('small', { text: '경기 바꾸기 ›' }),
  ]);
}

function scoreboard(replay: GameReplay, paNumber: number): HTMLElement {
  const { inning, outs, bases, count } = replay.state;
  return h('div', { className: 'scoreboard' }, [
    h('div', { className: 'board-left' }, [
      h('p', { className: 'inning' }, [h('strong', { text: `${inning}회` }), h('span', { text: `${paNumber}번째 타석` })]),
      h('div', { className: 'count-row' }, [h('span', { text: '볼' }), dots(count.balls, MAX_BALLS_IN_COUNT, 'ball')]),
      h('div', { className: 'count-row' }, [
        h('span', { text: '스트라이크' }),
        dots(count.strikes, MAX_STRIKES_IN_COUNT, 'strike'),
      ]),
      h('div', { className: 'count-row' }, [h('span', { text: '아웃' }), dots(outs, OUTS_PER_INNING - 1, 'out')]),
    ]),
    h('div', { className: 'board-right' }, [diamond(bases), h('p', { className: 'bases-text', text: basesLabel(bases) })]),
    h('p', { className: 'count-text', text: `${countLabel(count)} · ${outs}아웃` }),
  ]);
}

function message(replay: GameReplay): string {
  const pas = replay.plateAppearances;
  const last = pas[pas.length - 1];
  if (!last) return '공을 던질 때마다 결과 버튼을 누르세요.';
  if (last.outcome === null) {
    const lastEvent = last.timeline[last.timeline.length - 1];
    return lastEvent ? `방금 기록: ${eventLabel(lastEvent)}` : '공을 던질 때마다 결과 버튼을 누르세요.';
  }
  const inningChanged = replay.state.inning !== last.inning;
  const outcome = `${last.number}번째 타석: ${OUTCOME_LABEL[last.outcome]}.`;
  return inningChanged ? `${outcome} 3아웃! 이제 ${replay.state.inning}회입니다.` : `${outcome} 다음 타자 공을 기록하세요.`;
}

function pitchButton(b: PitchButton, onPitch: (r: PitchResult) => void, extra = false): HTMLElement {
  return h('button', { className: `pitch ${b.result}${extra ? ' extra' : ''}`, onClick: () => onPitch(b.result) }, [
    h('strong', { text: b.label }),
    h('small', { text: b.hint }),
  ]);
}

function runnerSection(bases: Bases, choosing: boolean, actions: InputActions): HTMLElement {
  const runners = hasRunner(bases);
  if (choosing) {
    return h('section', { className: 'runner-section' }, [
      h('p', { className: 'section-title', text: '어느 주자를 견제로 잡았나요?' }),
      h('div', { className: 'choice-row' }, [
        ...occupiedBases(bases).map((b) =>
          h('button', { className: 'play', text: `${BASE_NAMES[b]} 주자`, onClick: () => actions.play('pickoffOut', b) }),
        ),
        h('button', { className: 'secondary', text: '취소', onClick: () => actions.choosePickoffBase(false) }),
      ]),
    ]);
  }

  const enabled: Record<PlayKind, boolean> = {
    pickoff: runners,
    pickoffOut: runners,
    stolenSecond: canStealSecond(bases),
    caughtStealingSecond: canStealSecond(bases),
  };
  const onPlay = (play: PlayKind): void => {
    if (play !== 'pickoffOut') return actions.play(play);
    const occupied = occupiedBases(bases);
    if (occupied.length === 1) actions.play('pickoffOut', occupied[0]);
    else actions.choosePickoffBase(true);
  };

  return h('section', { className: 'runner-section' }, [
    h('p', { className: 'section-title' }, [
      '주자 상황',
      h('small', { text: runners ? ` · ${basesLabel(bases)}` : ' · 주자가 있을 때 쓸 수 있어요' }),
    ]),
    h(
      'div',
      { className: 'play-row' },
      PLAY_BUTTONS.map((b) =>
        h('button', { className: 'play', disabled: !enabled[b.play], onClick: () => onPlay(b.play) }, [
          h('strong', { text: b.label }),
          h('small', { text: b.hint }),
        ]),
      ),
    ),
  ]);
}

function situationEditor(draft: SituationDraft, actions: InputActions): HTMLElement {
  const set = (change: Partial<SituationDraft>): void => actions.changeSituationDraft({ ...draft, ...change });
  const toggleBase = (b: BaseIndex): void => {
    const bases: [boolean, boolean, boolean] = [draft.bases[0], draft.bases[1], draft.bases[2]];
    bases[b] = !bases[b];
    set({ bases });
  };
  return h('section', { className: 'situation-editor' }, [
    h('p', { className: 'section-title', text: '상황 고치기' }),
    h('p', { className: 'help', text: '실제 경기와 다르면 맞춰 주세요. 베이스를 누르면 주자를 넣거나 뺍니다.' }),
    h('div', { className: 'editor-grid' }, [
      h('div', { className: 'editor-fields' }, [
        h('div', { className: 'stepper' }, [
          h('span', { text: '이닝' }),
          h('button', {
            text: '−',
            disabled: draft.inning <= 1,
            onClick: () => set({ inning: draft.inning - 1 }),
            attrs: { 'aria-label': '이닝 줄이기' },
          }),
          h('strong', { text: `${draft.inning}회` }),
          h('button', {
            text: '+',
            disabled: draft.inning >= MAX_INNING,
            onClick: () => set({ inning: draft.inning + 1 }),
            attrs: { 'aria-label': '이닝 늘리기' },
          }),
        ]),
        h('div', { className: 'outs-picker' }, [
          h('span', { text: '아웃' }),
          ...Array.from({ length: OUTS_PER_INNING + 1 }, (_, n) =>
            h('button', { className: draft.outs === n ? 'active' : '', text: `${n}`, onClick: () => set({ outs: n }) }),
          ),
        ]),
        draft.outs === OUTS_PER_INNING
          ? h('p', { className: 'help', text: '3아웃으로 저장하면 다음 이닝으로 넘어갑니다.' })
          : null,
      ]),
      diamond(draft.bases, toggleBase),
    ]),
    h('div', { className: 'confirm-buttons' }, [
      h('button', { className: 'secondary', text: '취소', onClick: actions.cancelSituationEdit }),
      h('button', {
        className: 'primary',
        text: '저장',
        onClick: () => actions.saveSituation(draft.inning, draft.outs, draft.bases),
      }),
    ]),
  ]);
}

export function inputView(
  game: Game,
  replay: GameReplay,
  draft: SituationDraft | null,
  choosingPickoffBase: boolean,
  actions: InputActions,
): HTMLElement {
  const pas = replay.plateAppearances;
  const last = pas[pas.length - 1];
  const paNumber = last && last.outcome === null ? last.number : pas.length + 1;
  const events = activeEvents(game.events);
  const lastEvent = events[events.length - 1];
  const { inning, outs, bases } = replay.state;

  return h('section', { className: 'input' }, [
    gameStrip(game, actions.openGames),
    scoreboard(replay, paNumber),
    h('p', { className: 'message', text: message(replay), attrs: { 'aria-live': 'polite' } }),
    draft
      ? situationEditor(draft, actions)
      : h('div', { className: 'input-controls' }, [
          h('div', { className: 'pitch-buttons' }, MAIN_PITCH_BUTTONS.map((b) => pitchButton(b, actions.pitch))),
          h('div', { className: 'extra-buttons' }, EXTRA_PITCH_BUTTONS.map((b) => pitchButton(b, actions.pitch, true))),
          runnerSection(bases, choosingPickoffBase, actions),
          h('div', { className: 'tool-row' }, [
            h('button', {
              className: 'undo',
              text: lastEvent ? `↶ 취소: ${eventLabel(lastEvent)}` : '↶ 마지막 기록 취소',
              disabled: !lastEvent,
              onClick: () => lastEvent && actions.undo(lastEvent.id),
            }),
            h('button', {
              className: 'secondary',
              text: '상황 고치기',
              onClick: () => actions.startSituationEdit({ inning, outs, bases }),
            }),
          ]),
        ]),
  ]);
}
