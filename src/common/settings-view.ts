// 설정 화면: 이 휴대폰에서 쓰는 편의 설정

import { DataActions, dataSection } from './data-section';
import { h } from './dom';
import { HAND_LABEL, PITCH_DETAIL_LABEL } from './labels';
import { Hand } from './settings';

export interface SettingsActions extends DataActions {
  hand: (hand: Hand) => void;
}

const HANDS: readonly Hand[] = ['right', 'left'];

export function settingsView(hand: Hand, hasGames: boolean, actions: SettingsActions): HTMLElement {
  return h('section', { className: 'settings' }, [
    h('h2', { text: '설정' }),
    h('div', { className: 'settings-item' }, [
      h('h3', { text: '휴대폰을 드는 손' }),
      h('p', { className: 'help', text: `자주 누르는 "${PITCH_DETAIL_LABEL}" 켜고 끄기 단추, 존 그림, 기록 단추를 엄지가 닿는 쪽에 둡니다.` }),
      h(
        'div',
        { className: 'hand-picker' },
        HANDS.map((option) =>
          h('button', {
            className: option === hand ? 'active' : '',
            text: HAND_LABEL[option],
            attrs: { 'aria-pressed': option === hand ? 'true' : 'false' },
            onClick: () => actions.hand(option),
          }),
        ),
      ),
    ]),
    h('p', { className: 'help', text: '손 설정은 이 휴대폰에만 저장됩니다. 기록에는 영향이 없습니다.' }),
    dataSection(hasGames, actions),
  ]);
}
