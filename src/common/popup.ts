// 화면 위에 뜨는 작은 창(팝업). 투구 상세·타구 기록·수비 기록 창이 함께 쓴다.

import { h } from './dom';

/**
 * 화면 위에 뜨는 작은 창(팝업). 뒤 화면은 어둡게 깔리고, 창 바깥을 누르면 기록하지 않고 닫는다.
 * 위쪽 상황판이 보이도록 창은 아래쪽에 띄운다.
 */
export function popup(className: string, label: string, onCancel: () => void, children: (HTMLElement | null)[]): HTMLElement {
  const dialog = h('section', { className: `popup ${className}`, attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-label': label, tabindex: '-1' } }, children);
  const backdrop = h('div', { className: 'popup-backdrop' }, [dialog]);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) onCancel();
  });
  // 화면 읽기 프로그램·키보드 사용자를 위해 창으로 초점을 옮긴다. 다시 그릴 때 화면이 튀지 않게 스크롤은 하지 않는다.
  requestAnimationFrame(() => dialog.focus({ preventScroll: true }));
  return backdrop;
}
