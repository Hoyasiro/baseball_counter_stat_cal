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

/** 그림에 보이는 범위 (그림 좌표). 저장하는 0~1 좌표는 언제나 0~FIELD_SIZE 범위를 기준으로 한다. */
interface ViewArea {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * 그림을 누르거나 끌면 고른 점이 손가락을 따라오고, 손을 떼면 그 자리로 정한다.
 * 끄는 동안은 다시 그리지 않고 점만 옮긴다. (다시 그리면 손가락을 놓친다)
 */
function pickHandler(svg: SVGSVGElement, onPick: (x: number, y: number) => void, view: ViewArea): void {
  const toUnit = (e: PointerEvent): { x: number; y: number } => {
    const rect = svg.getBoundingClientRect();
    const x = view.left + ((e.clientX - rect.left) / rect.width) * view.width;
    const y = view.top + ((e.clientY - rect.top) / rect.height) * view.height;
    return { x: clampUnit(x / FIELD_SIZE), y: clampUnit(y / FIELD_SIZE) };
  };
  let dragging = false;
  const follow = (e: PointerEvent): void => {
    const p = toUnit(e);
    movePicked(svg, p.x, p.y);
  };
  svg.addEventListener('pointerdown', (e) => {
    dragging = true;
    svg.setPointerCapture(e.pointerId);
    follow(e);
  });
  svg.addEventListener('pointermove', (e) => {
    if (dragging) follow(e);
  });
  const finish = (e: PointerEvent): void => {
    if (!dragging) return;
    dragging = false;
    const p = toUnit(e);
    onPick(p.x, p.y);
  };
  svg.addEventListener('pointerup', finish);
  svg.addEventListener('pointercancel', () => {
    dragging = false;
  });
}

/** 고른 점(고리 + 가운데 점)을 옮긴다. 아직 없으면 만든다. */
function movePicked(svg: SVGSVGElement, x: number, y: number): void {
  let ring = svg.querySelector<SVGCircleElement>('.picked-ring');
  let dot = svg.querySelector<SVGCircleElement>('.picked-dot');
  if (!ring || !dot) {
    ring = svgEl('circle', { r: 4.5, class: 'picked-ring' });
    dot = svgEl('circle', { r: 2, class: 'picked-dot' });
    svg.append(ring, dot);
  }
  for (const el of [ring, dot]) {
    el.setAttribute('cx', String(x * FIELD_SIZE));
    el.setAttribute('cy', String(y * FIELD_SIZE));
  }
}

function drawPoints(svg: SVGSVGElement, points: readonly DrawPoint[], radius: number): void {
  for (const p of points) {
    svg.append(svgEl('circle', { cx: p.x * FIELD_SIZE, cy: p.y * FIELD_SIZE, r: radius, class: `chart-dot ${p.kind}` }));
  }
}

function drawPicked(svg: SVGSVGElement, picked: { x: number; y: number } | null): void {
  if (picked) movePicked(svg, picked.x, picked.y);
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
 * 존 그림 둘레에 더 보여주는 여백 (그림 좌표). 존이 그림에서 차지하는 크기를 예전보다 10% 줄이고,
 * 양옆에 타자 그림을 그릴 자리를 만든다. 저장 좌표(0~1)와 존 범위(ZONE_MIN~ZONE_MAX)는 그대로다.
 */
const ZONE_VIEW_MARGIN = 5.6;

/** 타격 자세를 잡은 어린이 실루엣 (우타자 기준, 포수 쪽에서 본 모습: 홈플레이트 쪽을 보고 배트는 뒤로 든다) */
function batterFigure(hand: BatterHand, on: boolean): SVGGElement {
  // 우타자는 왼쪽(3루 쪽), 좌타자는 오른쪽(1루 쪽)에 좌우를 뒤집어 그린다.
  const transform = hand === 'right' ? 'translate(-4 4)' : `translate(${FIELD_SIZE + 4} 4) scale(-1 1)`;
  const g = svgEl('g', { transform, class: `batter-figure${on ? ' on' : ''}`, 'aria-hidden': 'true' });
  // 배트: 손에서 뒤쪽 위로
  g.append(svgEl('line', { x1: 6, y1: 22, x2: 1, y2: 2, class: 'batter-bat' }));
  // 헬멧 쓴 머리
  g.append(svgEl('circle', { cx: 11, cy: 13, r: 5.2, class: 'batter-body' }));
  g.append(svgEl('path', { d: 'M15 12.5 L19 14 L15.5 15.2 Z', class: 'batter-body' }));
  // 몸통 (살짝 앞으로 숙임)
  g.append(svgEl('line', { x1: 11, y1: 20, x2: 9, y2: 46, class: 'batter-limb thick' }));
  // 팔: 어깨에서 뒤쪽 손으로
  g.append(svgEl('polyline', { points: '12,23 9,25 6,22', class: 'batter-limb' }));
  // 다리: 앞다리는 홈플레이트 쪽으로 벌리고, 뒷다리는 굽힌다
  g.append(svgEl('polyline', { points: '10,46 16,64 17,86', class: 'batter-limb' }));
  g.append(svgEl('polyline', { points: '8,46 4,65 5,86', class: 'batter-limb' }));
  return g;
}

/**
 * 포수 쪽에서 본 모습임을 알 수 있게 양옆 타자 실루엣과 아래 홈플레이트를 그린다.
 * 포수 쪽에서 보면 우타자는 왼쪽(3루 쪽), 좌타자는 오른쪽(1루 쪽)에 선다.
 */
function drawBatters(svg: SVGSVGElement, highlight: BatterHand | null): void {
  const labels: [BatterHand, number, string][] = [
    ['right', 8, '우타자'],
    ['left', FIELD_SIZE - 8, '좌타자'],
  ];
  for (const [hand, x, text] of labels) {
    const on = highlight === hand;
    svg.append(batterFigure(hand, on));
    const label = svgEl('text', { x, y: FIELD_SIZE + 2.5, class: `batter-label${on ? ' on' : ''}`, 'text-anchor': 'middle' });
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
  if (options.onPick) pickHandler(svg, options.onPick, { left: 0, top: FIELD_TOP, width: FIELD_SIZE, height: FIELD_VIEW_HEIGHT });
  return svg;
}

export function zoneSvg(options: FieldOptions): SVGSVGElement {
  const m = ZONE_VIEW_MARGIN;
  const view: ViewArea = { left: -m, top: -m, width: FIELD_SIZE + 2 * m, height: FIELD_SIZE + 2 * m };
  const svg = svgEl('svg', {
    viewBox: `${view.left} ${view.top} ${view.width} ${view.height}`,
    class: `zone-svg${options.onPick ? ' pickable' : ''}`,
    role: 'img',
    'aria-label': options.label,
  });
  svg.append(svgEl('rect', { x: view.left, y: view.top, width: view.width, height: view.height, class: 'zone-bg' }));
  const min = ZONE_MIN * FIELD_SIZE;
  const size = (ZONE_MAX - ZONE_MIN) * FIELD_SIZE;
  svg.append(svgEl('rect', { x: min, y: min, width: size, height: size, class: 'zone-box' }));
  for (const i of [1, 2]) {
    const offset = min + (size * i) / 3;
    svg.append(svgEl('line', { x1: offset, y1: min, x2: offset, y2: min + size, class: 'zone-grid' }));
    svg.append(svgEl('line', { x1: min, y1: offset, x2: min + size, y2: offset, class: 'zone-grid' }));
  }
  if (options.batters) drawBatters(svg, options.batters.highlight);
  drawPoints(svg, options.points ?? [], 3);
  drawPicked(svg, options.picked ?? null);
  if (options.onPick) pickHandler(svg, options.onPick, view);
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
