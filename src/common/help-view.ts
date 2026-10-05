// 튜토리얼(처음 사용 안내)과 도움말(사용 설명서) 화면

import { h } from './dom';
import { MANUAL_SECTIONS, TUTORIAL_STEPS } from './help-content';

export interface TutorialActions {
  go: (step: number) => void;
  close: () => void;
}

export interface ManualActions {
  close: () => void;
  openTutorial: () => void;
}

/** 버튼 예시는 실제 버튼 색을 따른다. */
const SAMPLE_CLASS: Record<string, string> = {
  볼: 'ball',
  스트라이크: 'strike',
  파울: 'foul',
  안타: 'hit',
  아웃: 'out',
  '몸에 맞음': 'hitByPitch',
};

export function tutorialView(step: number, actions: TutorialActions): HTMLElement {
  const current = TUTORIAL_STEPS[step];
  const isLast = step === TUTORIAL_STEPS.length - 1;
  return h('div', { className: 'overlay', attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'tutorial-title' } }, [
    h('section', { className: 'tutorial-card' }, [
      h('p', { className: 'tutorial-step', text: `처음 사용 안내 ${step + 1} / ${TUTORIAL_STEPS.length}` }),
      h('h2', { text: current.title, attrs: { id: 'tutorial-title' } }),
      ...current.lines.map((line) => h('p', { text: line })),
      current.sample
        ? h(
            'div',
            { className: 'tutorial-sample' },
            current.sample.map((label) => h('span', { className: `sample-chip ${SAMPLE_CLASS[label] ?? ''}`, text: label })),
          )
        : null,
      h(
        'div',
        { className: 'tutorial-dots', attrs: { 'aria-hidden': 'true' } },
        TUTORIAL_STEPS.map((_, i) => h('span', { className: i === step ? 'on' : '' })),
      ),
      h('div', { className: 'confirm-buttons' }, [
        step > 0
          ? h('button', { className: 'secondary', text: '이전', onClick: () => actions.go(step - 1) })
          : h('button', { className: 'secondary', text: '건너뛰기', onClick: actions.close }),
        h('button', {
          className: 'primary',
          text: isLast ? '시작하기' : '다음',
          onClick: () => (isLast ? actions.close() : actions.go(step + 1)),
        }),
      ]),
    ]),
  ]);
}

export function manualView(actions: ManualActions): HTMLElement {
  return h('section', { className: 'manual' }, [
    h('div', { className: 'manual-head' }, [
      h('h2', { text: '도움말' }),
      h('button', { className: 'secondary', text: '닫기', onClick: actions.close }),
    ]),
    h('button', { className: 'primary', text: '처음 사용 안내 다시 보기', onClick: actions.openTutorial }),
    h(
      'nav',
      { className: 'manual-index', attrs: { 'aria-label': '도움말 목차' } },
      MANUAL_SECTIONS.map((s) => h('a', { text: s.title, attrs: { href: `#help-${s.id}` } })),
    ),
    ...MANUAL_SECTIONS.map((section) =>
      h('section', { className: 'manual-section', attrs: { id: `help-${section.id}` } }, [
        h('h3', { text: section.title }),
        ...section.items.map((item) =>
          h('details', { className: 'manual-item' }, [h('summary', { text: item.title }), ...item.text.map((t) => h('p', { text: t }))]),
        ),
      ]),
    ),
  ]);
}
