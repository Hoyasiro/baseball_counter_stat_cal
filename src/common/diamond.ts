// 내야 다이아몬드: 주자 상황을 보여주고, 고칠 때는 베이스를 눌러 바꾼다. 우리 아이가 있는 베이스는 따로 표시한다.

import { BASE_NAMES } from './bases';
import { BaseIndex, Bases } from './events';
import { h } from './dom';

const SVG_NS = 'http://www.w3.org/2000/svg';

// 다이아몬드 안 베이스 위치 (viewBox 0 0 100 100): 1루 오른쪽, 2루 위, 3루 왼쪽
const BASE_POSITIONS: Record<BaseIndex, { x: number; y: number }> = {
  0: { x: 78, y: 50 },
  1: { x: 50, y: 22 },
  2: { x: 22, y: 50 },
};
const BASE_SIZE = 18;

export function diamond(bases: Bases, onToggle?: (base: BaseIndex) => void, childBase: BaseIndex | null = null): HTMLElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('class', 'diamond-svg');
  svg.setAttribute('aria-hidden', 'true');

  const field = document.createElementNS(SVG_NS, 'path');
  field.setAttribute('d', 'M50 22 L78 50 L50 78 L22 50 Z');
  field.setAttribute('class', 'diamond-line');
  svg.append(field);

  const home = document.createElementNS(SVG_NS, 'path');
  home.setAttribute('d', 'M50 72 L56 78 L56 84 L44 84 L44 78 Z');
  home.setAttribute('class', 'diamond-home');
  svg.append(home);

  for (const b of [0, 1, 2] as const) {
    const { x, y } = BASE_POSITIONS[b];
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', String(x - BASE_SIZE / 2));
    rect.setAttribute('y', String(y - BASE_SIZE / 2));
    rect.setAttribute('width', String(BASE_SIZE));
    rect.setAttribute('height', String(BASE_SIZE));
    rect.setAttribute('transform', `rotate(45 ${x} ${y})`);
    rect.setAttribute('class', b === childBase ? 'diamond-base child' : bases[b] ? 'diamond-base on' : 'diamond-base');
    svg.append(rect);
    if (b === childBase) {
      const label = document.createElementNS(SVG_NS, 'text');
      label.setAttribute('x', String(x));
      label.setAttribute('y', String(y + BASE_SIZE + 4));
      label.setAttribute('class', 'diamond-child-label');
      label.textContent = '아이';
      svg.append(label);
    }
  }

  const wrapper = h('div', { className: onToggle ? 'diamond editable' : 'diamond' }, [svg]);
  if (onToggle) {
    // 누르기 쉽도록 베이스 위에 투명한 버튼을 겹친다.
    for (const b of [0, 1, 2] as const) {
      const { x, y } = BASE_POSITIONS[b];
      const button = h('button', {
        className: 'diamond-hit',
        onClick: () => onToggle(b),
        attrs: {
          'aria-label': `${BASE_NAMES[b]} 주자 ${bases[b] ? '없애기' : '넣기'}`,
          style: `left:${x}%;top:${y}%`,
        },
      });
      wrapper.append(button);
    }
  }
  return wrapper;
}
