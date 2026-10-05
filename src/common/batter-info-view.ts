// 상대 타자 정보(좌타·우타, 학년)를 고르는 단추와 창. 아이가 던지거나 수비할 때만 보인다.

import { h } from './dom';
import { BATTER_HANDS, BatterHand, GRADE_MAX, GRADE_MIN } from './events';
import { BATTER_HAND_LABEL, BATTER_INFO_LABEL, batterInfoText } from './labels';
import { popup } from './popup';

/** 타자 정보 창에서 고르는 중인 값. 모르면 null */
export interface BatterDraft {
  readonly hand: BatterHand | null;
  readonly grade: number | null;
}

export interface BatterActions {
  open: () => void;
  change: (draft: BatterDraft) => void;
  save: (draft: BatterDraft) => void;
  cancel: () => void;
}

const GRADES = Array.from({ length: GRADE_MAX - GRADE_MIN + 1 }, (_, i) => GRADE_MIN + i);

/** 상황판 이닝 옆의 작은 단추. 고른 값이 있으면 그대로 보여준다. */
export function batterPill(hand: BatterHand | null, grade: number | null, onOpen: () => void): HTMLElement {
  const text = batterInfoText(hand, grade);
  return h('button', {
    className: `batter-pill${text ? ' set' : ''}`,
    text: `${text ?? BATTER_INFO_LABEL.open} ›`,
    attrs: { 'aria-label': `지금 타자 정보${text ? `: ${text}` : ''}, 눌러서 고르기` },
    onClick: onOpen,
  });
}

function choiceRow<T>(label: string, options: readonly [T | null, string][], selected: T | null, onPick: (v: T | null) => void): HTMLElement {
  return h('div', { className: 'batter-row' }, [
    h('span', { className: 'batter-row-label', text: label }),
    h(
      'div',
      { className: 'batter-choices', attrs: { role: 'group', 'aria-label': label } },
      options.map(([value, text]) =>
        h('button', {
          className: value === selected ? 'active' : '',
          text,
          attrs: { 'aria-pressed': value === selected ? 'true' : 'false' },
          onClick: () => onPick(value),
        }),
      ),
    ),
  ]);
}

export function batterPopup(draft: BatterDraft, actions: BatterActions): HTMLElement {
  return popup('batter-popup', '지금 타자 정보', actions.cancel, [
    h('div', { className: 'sheet-head' }, [
      h('p', { className: 'section-title', text: '지금 타자 정보' }),
      h('button', { className: 'link-button', text: '← 돌아가기', onClick: actions.cancel }),
    ]),
    h('p', { className: 'help', text: '아는 것만 고르세요. 다음 타자에게는 이어지지 않아요. 투수 분석에서 좌타·우타별로 나눠 봅니다.' }),
    choiceRow<BatterHand>(
      '서는 쪽',
      [...BATTER_HANDS.map((hand): [BatterHand, string] => [hand, BATTER_HAND_LABEL[hand]]), [null, BATTER_INFO_LABEL.unknown]],
      draft.hand,
      (hand) => actions.change({ ...draft, hand }),
    ),
    choiceRow<number>(
      '학년',
      [...GRADES.map((g): [number, string] => [g, `${g}`]), [null, BATTER_INFO_LABEL.unknown]],
      draft.grade,
      (grade) => actions.change({ ...draft, grade }),
    ),
    h('div', { className: 'confirm-buttons sheet-buttons' }, [
      h('button', { className: 'primary', text: BATTER_INFO_LABEL.save, onClick: () => actions.save(draft) }),
    ]),
  ]);
}
