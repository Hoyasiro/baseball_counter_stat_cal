// 경기 결과의 장면별 기록에서 지난 기록 하나를 고치거나 지우는 창.
// 고쳐도 원래 기록은 남고 고침·취소 기록이 덧붙는다. 뒤 기록의 카운트·주자·점수는 다시 계산된다.

import { h } from './dom';
import { HitType, PitchResult, UndoableEvent } from './events';
import { EDIT_EVENT_LABEL, HIT_BUTTONS, PITCH_LABEL, eventLabel } from './labels';
import { popup } from './popup';

export interface EventEditActions {
  close: () => void;
  saveResult: (targetId: string, result: PitchResult, hitType?: HitType) => void;
  remove: (targetId: string) => void;
}

/** 공 결과로 고를 수 있는 것 (안타는 종류별로) */
const RESULT_CHOICES: readonly { result: PitchResult; hitType?: HitType; label: string }[] = [
  { result: 'ball', label: PITCH_LABEL.ball },
  { result: 'strike', label: PITCH_LABEL.strike },
  { result: 'foul', label: PITCH_LABEL.foul },
  { result: 'buntFoul', label: PITCH_LABEL.buntFoul },
  { result: 'wildPitch', label: PITCH_LABEL.wildPitch },
  { result: 'hitByPitch', label: PITCH_LABEL.hitByPitch },
  ...HIT_BUTTONS.map((b) => ({ result: 'hit' as const, hitType: b.hitType, label: b.label })),
  { result: 'out', label: PITCH_LABEL.out },
  { result: 'reachedOnError', label: PITCH_LABEL.reachedOnError },
];

export function eventEditPopup(event: UndoableEvent, actions: EventEditActions): HTMLElement {
  const isPitch = event.kind === 'pitch';
  const current = (c: (typeof RESULT_CHOICES)[number]): boolean =>
    isPitch && event.result === c.result && (c.result !== 'hit' || (event.hitType ?? 'single') === c.hitType);
  return popup('edit-popup', EDIT_EVENT_LABEL.title, actions.close, [
    h('div', { className: 'sheet-head' }, [
      h('p', { className: 'section-title', text: `${EDIT_EVENT_LABEL.title}: ${eventLabel(event)}` }),
      h('button', { className: 'link-button', text: '← 돌아가기', onClick: actions.close }),
    ]),
    isPitch
      ? h(
          'div',
          { className: 'edit-results', attrs: { role: 'group', 'aria-label': '이 공의 결과' } },
          RESULT_CHOICES.map((c) =>
            h('button', {
              className: current(c) ? 'active' : '',
              text: c.label,
              disabled: current(c),
              onClick: () => actions.saveResult(event.id, c.result, c.hitType),
            }),
          ),
        )
      : null,
    h('p', {
      className: 'help',
      text: `${isPitch ? '다른 결과를 누르면 바로 고쳐져요. ' : ''}뒤 기록의 카운트·주자·점수는 다시 계산돼요. 기록 입력에서 그대로 이어서 기록하면 돼요. 원래 기록은 이력으로 남아요.`,
    }),
    h('div', { className: 'confirm-buttons sheet-buttons' }, [
      h('button', { className: 'secondary danger', text: EDIT_EVENT_LABEL.remove, onClick: () => actions.remove(event.id) }),
      h('button', { className: 'secondary', text: '닫기', onClick: actions.close }),
    ]),
  ]);
}
