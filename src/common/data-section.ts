// 데이터 관리(내려받기·불러오기) 화면 조각. 설정 탭에서 쓴다.

import { h } from './dom';
import { DOWNLOAD_LABEL, IMPORT_LABEL } from './labels';

export interface DataActions {
  download: (kind: 'backup' | 'pitches') => void;
  importBackup: (file: File) => void;
}

/** 숨긴 파일 선택 칸을 버튼으로 연다. */
function importButton(actions: DataActions): HTMLElement {
  const input = h('input', { className: 'visually-hidden', attrs: { type: 'file', accept: '.json,application/json', tabindex: '-1', 'aria-hidden': 'true' } });
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (file) actions.importBackup(file);
    input.value = '';
  });
  return h('div', {}, [
    input,
    h('button', { className: 'secondary', onClick: () => input.click() }, [
      h('strong', { text: IMPORT_LABEL }),
      h('small', { text: '지금 기록은 지우지 않고 합칩니다' }),
    ]),
  ]);
}

export function dataSection(hasGames: boolean, actions: DataActions): HTMLElement {
  return h('div', { className: 'settings-item data-section' }, [
    h('h3', { text: '데이터 관리' }),
    h('h4', { text: '데이터 내려받기' }),
    hasGames
      ? h('p', { className: 'help', text: '모든 경기 기록을 파일로 저장합니다. 휴대폰을 바꾸거나 브라우저 데이터를 지우기 전에 백업해 두세요.' })
      : h('p', { className: 'help', text: '아직 기록한 경기가 없어 내려받을 게 없습니다.' }),
    h('button', { className: 'secondary', disabled: !hasGames, onClick: () => actions.download('backup') }, [
      h('strong', { text: DOWNLOAD_LABEL.json }),
      h('small', { text: '모든 기록을 그대로 저장 (보관·옮기기용)' }),
    ]),
    h('button', { className: 'secondary', disabled: !hasGames, onClick: () => actions.download('pitches') }, [
      h('strong', { text: DOWNLOAD_LABEL.csv }),
      h('small', { text: '공 하나당 한 줄 · 엑셀·구글 시트에서 열기' }),
    ]),
    h('h4', { text: '백업 불러오기' }),
    h('p', { className: 'help', text: '내려받아 둔 백업 파일(JSON)에서 기록을 가져옵니다. 지금 기록은 지우지 않고, 이미 있는 경기는 늘어난 기록만 덧붙입니다.' }),
    importButton(actions),
  ]);
}
