// 야구장 그림(낙구 지점 찍기·타구 분포)과 스트라이크 존 그림(통과 지점 찍기·존 분포).
// 같은 그림을 입력과 분석에서 함께 쓴다.

import { h } from './dom';
import { BatterHand, ZONE_MAX, ZONE_MIN } from './events';
import { BASE_DISTANCE, FENCE_RADIUS, FIELD_SIZE, HOME, INFIELD_RADIUS } from './field';

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface DrawPoint {
  readonly x: number;
  readonly y: number;
  readonly kind: string;
}

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

/** 야구장 그림은 담장 위 빈 곳을 잘라 낸다. 담장 너머 타구를 찍을 만큼은 남긴다. */
const FIELD_TOP = HOME.y - FENCE_RADIUS - 12;
const FIELD_VIEW_HEIGHT = FIELD_SIZE - FIELD_TOP;

/** 그림을 누른 곳을 0~1 좌표로 바꾼다. top: 그림이 잘려 보이기 시작하는 높이 */
function pickHandler(svg: SVGSVGElement, onPick: (x: number, y: number) => void, top = 0): void {
  svg.addEventListener('click', (e) => {
    const rect = svg.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const shown = (e.clientY - rect.top) / rect.height;
    const y = Math.min(1, Math.max(0, (top + shown * (FIELD_SIZE - top)) / FIELD_SIZE));
    onPick(x, y);
  });
}

function drawPoints(svg: SVGSVGElement, points: readonly DrawPoint[], radius: number): void {
  for (const p of points) {
    svg.append(svgEl('circle', { cx: p.x * FIELD_SIZE, cy: p.y * FIELD_SIZE, r: radius, class: `chart-dot ${p.kind}` }));
  }
}

function drawPicked(svg: SVGSVGElement, picked: { x: number; y: number } | null): void {
  if (!picked) return;
  const cx = picked.x * FIELD_SIZE;
  const cy = picked.y * FIELD_SIZE;
  svg.append(svgEl('circle', { cx, cy, r: 4.5, class: 'picked-ring' }));
  svg.append(svgEl('circle', { cx, cy, r: 2, class: 'picked-dot' }));
}

function pointOnCircle(angleDegrees: number, radius: number): { x: number; y: number } {
  const rad = (angleDegrees * Math.PI) / 180;
  return { x: HOME.x + radius * Math.sin(rad), y: HOME.y - radius * Math.cos(rad) };
}

/** 부채꼴(홈에서 좌우 45도) 경로 */
function fanPath(radius: number): string {
  const left = pointOnCircle(-45, radius);
  const right = pointOnCircle(45, radius);
  return `M${HOME.x} ${HOME.y} L${left.x} ${left.y} A${radius} ${radius} 0 0 1 ${right.x} ${right.y} Z`;
}

export interface FieldOptions {
  readonly points?: readonly DrawPoint[];
  readonly picked?: { x: number; y: number } | null;
  readonly onPick?: (x: number, y: number) => void;
  readonly label: string;
  /** 존 그림 양옆에 타석(우타자·좌타자 자리)을 그린다. highlight는 지금 타자가 선 쪽 */
  readonly batters?: { readonly highlight: BatterHand | null };
}

/**
 * 포수 쪽에서 본 모습임을 알 수 있게 양옆 타석과 아래 홈플레이트를 그린다.
 * 포수 쪽에서 보면 우타자는 왼쪽(3루 쪽), 좌타자는 오른쪽(1루 쪽)에 선다.
 */
function drawBatterBoxes(svg: SVGSVGElement, highlight: BatterHand | null): void {
  const margin = ZONE_MIN * FIELD_SIZE;
  const top = margin + 2;
  const height = (ZONE_MAX - ZONE_MIN) * FIELD_SIZE - 4;
  const sides: [BatterHand, number, string][] = [
    ['right', 3, '우타자'],
    ['left', FIELD_SIZE - margin + 3, '좌타자'],
  ];
  for (const [hand, x, text] of sides) {
    const on = highlight === hand;
    svg.append(svgEl('rect', { x, y: top, width: margin - 6, height, rx: 2, class: `batter-box${on ? ' on' : ''}` }));
    const label = svgEl('text', { x: x + (margin - 6) / 2, y: top + height / 2, class: `batter-label${on ? ' on' : ''}`, 'text-anchor': 'middle', 'dominant-baseline': 'middle' });
    label.textContent = text;
    svg.append(label);
  }
  // 홈플레이트: 뾰족한 쪽이 포수(아래)를 향한다.
  const c = FIELD_SIZE / 2;
  const plateTop = ZONE_MAX * FIELD_SIZE + 6;
  svg.append(svgEl('path', { d: `M${c - 7} ${plateTop} L${c + 7} ${plateTop} L${c + 7} ${plateTop + 4} L${c} ${plateTop + 9} L${c - 7} ${plateTop + 4} Z`, class: 'zone-plate' }));
}

export function fieldSvg(options: FieldOptions): SVGSVGElement {
  const svg = svgEl('svg', { viewBox: `0 ${FIELD_TOP} ${FIELD_SIZE} ${FIELD_VIEW_HEIGHT}`, class: `field-svg${options.onPick ? ' pickable' : ''}`, role: 'img', 'aria-label': options.label });
  svg.append(svgEl('rect', { x: 0, y: 0, width: FIELD_SIZE, height: FIELD_SIZE, class: 'field-foul-ground' }));
  svg.append(svgEl('path', { d: fanPath(FENCE_RADIUS), class: 'field-grass' }));
  svg.append(svgEl('path', { d: fanPath(INFIELD_RADIUS), class: 'field-dirt' }));
  const first = pointOnCircle(45, BASE_DISTANCE);
  const second = pointOnCircle(0, BASE_DISTANCE * Math.SQRT2);
  const third = pointOnCircle(-45, BASE_DISTANCE);
  svg.append(svgEl('path', { d: `M${HOME.x} ${HOME.y} L${first.x} ${first.y} L${second.x} ${second.y} L${third.x} ${third.y} Z`, class: 'field-infield-grass' }));
  const leftLine = pointOnCircle(-45, FENCE_RADIUS + 6);
  const rightLine = pointOnCircle(45, FENCE_RADIUS + 6);
  svg.append(svgEl('line', { x1: HOME.x, y1: HOME.y, x2: leftLine.x, y2: leftLine.y, class: 'field-line' }));
  svg.append(svgEl('line', { x1: HOME.x, y1: HOME.y, x2: rightLine.x, y2: rightLine.y, class: 'field-line' }));
  for (const b of [first, second, third]) svg.append(svgEl('rect', { x: b.x - 1.6, y: b.y - 1.6, width: 3.2, height: 3.2, transform: `rotate(45 ${b.x} ${b.y})`, class: 'field-base' }));
  svg.append(svgEl('circle', { cx: HOME.x, cy: HOME.y, r: 1.8, class: 'field-base' }));
  drawPoints(svg, options.points ?? [], 2.2);
  drawPicked(svg, options.picked ?? null);
  if (options.onPick) pickHandler(svg, options.onPick, FIELD_TOP);
  return svg;
}

export function zoneSvg(options: FieldOptions): SVGSVGElement {
  const svg = svgEl('svg', { viewBox: `0 0 ${FIELD_SIZE} ${FIELD_SIZE}`, class: `zone-svg${options.onPick ? ' pickable' : ''}`, role: 'img', 'aria-label': options.label });
  svg.append(svgEl('rect', { x: 0, y: 0, width: FIELD_SIZE, height: FIELD_SIZE, class: 'zone-bg' }));
  const min = ZONE_MIN * FIELD_SIZE;
  const size = (ZONE_MAX - ZONE_MIN) * FIELD_SIZE;
  svg.append(svgEl('rect', { x: min, y: min, width: size, height: size, class: 'zone-box' }));
  for (const i of [1, 2]) {
    const offset = min + (size * i) / 3;
    svg.append(svgEl('line', { x1: offset, y1: min, x2: offset, y2: min + size, class: 'zone-grid' }));
    svg.append(svgEl('line', { x1: min, y1: offset, x2: min + size, y2: offset, class: 'zone-grid' }));
  }
  if (options.batters) drawBatterBoxes(svg, options.batters.highlight);
  drawPoints(svg, options.points ?? [], 3);
  drawPicked(svg, options.picked ?? null);
  if (options.onPick) pickHandler(svg, options.onPick);
  return svg;
}

export interface LegendItem {
  readonly kind: string;
  readonly label: string;
}

/** 분석 화면의 그림 카드: 제목 + 그림 + 범례 */
export function chartCard(title: string, svg: SVGSVGElement, legend: readonly LegendItem[], note: string): HTMLElement {
  return h('article', { className: 'chart-card' }, [
    h('h3', { text: title }),
    h('div', { className: 'chart-frame' }, [svg]),
    h(
      'p',
      { className: 'chart-legend' },
      legend.map((l) => h('span', {}, [h('i', { className: `legend-dot ${l.kind}` }), l.label])),
    ),
    h('p', { className: 'help', text: note }),
  ]);
}
