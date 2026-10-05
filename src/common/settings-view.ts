// 설정 화면: 이 휴대폰에서 쓰는 편의 설정

import { DataActions, dataSection } from './data-section';
import { h } from './dom';
import { TEAM_NAME_MAX_LENGTH } from './events';
import { DEFAULT_TEAM_NAME } from './game';
import { HAND_LABEL, PITCH_DETAIL_LABEL } from './labels';
import { Hand } from './settings';

export interface SettingsActions extends DataActions {
  hand: (hand: Hand) => void;
  teamName: (name: string) => void;
}

const HANDS: readonly Hand[] = ['right', 'left'];

export function settingsView(hand: Hand, teamName: string, hasGames: boolean, lastBackupAt: string | null, actions: SettingsActions): HTMLElement {
  const teamInput = h('input', {
    attrs: {
      id: 'team-name',
      type: 'text',
      value: teamName,
      placeholder: `예: ○○초 (비우면 "${DEFAULT_TEAM_NAME}")`,
      autocomplete: 'off',
      enterkeyhint: 'done',
      maxlength: String(TEAM_NAME_MAX_LENGTH),
    },
  });
  teamInput.addEventListener('input', () => actions.teamName(teamInput.value.trim()));
  return h('section', { className: 'settings' }, [
    h('h2', { text: '설정' }),
    h('div', { className: 'settings-item' }, [
      h('h3', {}, [h('label', { text: '우리 팀 이름', attrs: { for: 'team-name' } })]),
      h('p', { className: 'help', text: '새 경기를 만들 때 자동으로 들어가고, 스코어보드와 경기 목록에 보여요. 이미 만든 경기는 "정보 고치기"에서 바꿉니다.' }),
      teamInput,
    ]),
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
    h('p', { className: 'help', text: '팀 이름과 손 설정은 이 휴대폰에만 저장됩니다. 기록에는 영향이 없습니다.' }),
    dataSection(hasGames, lastBackupAt, actions),
  ]);
}
