// 구속 다이얼: 시계처럼 생긴 반원. 바늘을 손가락으로 돌려 80~160 km/h를 고른다. (키보드 없이, CLAUDE.md 0.4)
// 오른손이면 오른쪽 반원(평평한 쪽이 왼쪽), 왼손이면 왼쪽 반원. 위 끝이 80, 아래 끝이 160이다.
// 손대기 전에는 바늘이 100에 있지만 "구속 안 잼"이라 기록하지 않는다. (지난 값이 실수로 남지 않게)

import { h } from './dom';
import { Hand } from './settings';

/** 다이얼로 고를 수 있는 구속 범위(km/h). 저장 데이터 검사 범위(SPEED_MIN~MAX)보다 좁다. */
export const DIAL_MIN = 80;
export const DIAL_MAX = 160;
/** 손대기 전 바늘 위치 */
export const DIAL_DEFAULT = 100;
/** 작은 눈금 간격, 숫자를 적는 눈금 간격 (km/h) */
const TICK_STEP = 5;
const LABEL_STEP = 10;

/** 반원 위 위치(0 = 위 끝, 1 = 아래 끝)를 구속으로. 1 km/h 단위, 범위 밖이면 끝 값 */
export function speedAtFraction(fraction: number): number {
  const speed = Math.round(DIAL_MIN + fraction * (DIAL_MAX - DIAL_MIN));
  return Math.min(DIAL_MAX, Math.max(DIAL_MIN, speed));
}

export function fractionOfSpeed(speed: number): number {
  return (Math.min(DIAL_MAX, Math.max(DIAL_MIN, speed)) - DIAL_MIN) / (DIAL_MAX - DIAL_MIN);
}

/**
 * 누른 곳(반원 중심에서 오른쪽 dx, 아래쪽 dy)을 반원 위 위치로.
 * 반원 바깥(평평한 쪽 너머)을 누르면 가까운 끝(위 또는 아래)으로 본다.
 */
export function fractionAt(dx: number, dy: number, hand: Hand): number {
  const outward = hand === 'right' ? dx : -dx;
  if (outward < 0) return dy < 0 ? 0 : 1;
  // 위 끝에서부터 잰 각도: 위 0, 옆 π/2, 아래 π
  return Math.atan2(outward, -dy) / Math.PI;
}

// 그림 크기 (viewBox 단위). 반원 중심은 평평한 쪽 가운데.
const WIDTH = 110;
const HEIGHT = 220;
const RADIUS = 90;
const NEEDLE = 82;
const LABEL_RADIUS = 64;
/** 평평한 쪽 여백: 양 끝(80·160) 숫자가 잘리지 않게 */
const EDGE_INSET = 16;
const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

interface Geometry {
  readonly cx: number;
  readonly cy: number;
  /** 오른쪽 반원 +1, 왼쪽 반원 -1 */
  readonly side: 1 | -1;
}

function geometryFor(hand: Hand): Geometry {
  return hand === 'right' ? { cx: EDGE_INSET, cy: HEIGHT / 2, side: 1 } : { cx: WIDTH - EDGE_INSET, cy: HEIGHT / 2, side: -1 };
}

function pointAt(g: Geometry, fraction: number, radius: number): { x: number; y: number } {
  const angle = fraction * Math.PI;
  return { x: g.cx + g.side * radius * Math.sin(angle), y: g.cy - radius * Math.cos(angle) };
}

function arcPath(g: Geometry, from: number, to: number, radius: number): string {
  const a = pointAt(g, from, radius);
  const b = pointAt(g, to, radius);
  const sweep = g.side === 1 ? 1 : 0;
  return `M${a.x} ${a.y} A${radius} ${radius} 0 0 ${sweep} ${b.x} ${b.y}`;
}

function dialFace(g: Geometry): SVGElement[] {
  const parts: SVGElement[] = [svgEl('path', { d: arcPath(g, 0, 1, RADIUS), class: 'dial-track' })];
  for (let speed = DIAL_MIN; speed <= DIAL_MAX; speed += TICK_STEP) {
    const f = fractionOfSpeed(speed);
    const major = speed % LABEL_STEP === 0;
    const outer = pointAt(g, f, RADIUS - 2);
    const inner = pointAt(g, f, RADIUS - (major ? 12 : 7));
    parts.push(svgEl('line', { x1: outer.x, y1: outer.y, x2: inner.x, y2: inner.y, class: major ? 'dial-tick major' : 'dial-tick' }));
    if (major) {
      const label = pointAt(g, f, LABEL_RADIUS);
      const text = svgEl('text', { x: label.x, y: label.y, class: 'dial-label', 'text-anchor': 'middle', 'dominant-baseline': 'central' });
      text.textContent = String(speed);
      parts.push(text);
    }
  }
  return parts;
}

export function speedDial(value: number | null, hand: Hand, onChange: (speed: number | null) => void): HTMLElement {
  const g = geometryFor(hand);
  const svg = svgEl('svg', {
    viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
    class: `dial-svg ${hand}`,
    role: 'slider',
    tabindex: '0',
    'aria-label': `구속 다이얼 (${DIAL_MIN}~${DIAL_MAX} km/h). 바늘을 돌려 고르세요`,
    'aria-valuemin': String(DIAL_MIN),
    'aria-valuemax': String(DIAL_MAX),
  });
  const progress = svgEl('path', { d: '', class: 'dial-progress' });
  const needle = svgEl('line', { x1: g.cx, y1: g.cy, x2: g.cx, y2: g.cy, class: 'dial-needle' });
  const knob = svgEl('circle', { cx: g.cx, cy: g.cy, r: 9, class: 'dial-knob' });
  svg.append(...dialFace(g), progress, needle, knob, svgEl('circle', { cx: g.cx, cy: g.cy, r: 5, class: 'dial-hub' }));

  const readout = h('p', { className: 'speed-readout' });
  const wrap = h('div', { className: 'speed-dial' }, [readout, h('div', { className: 'dial-frame' }, [svg])]);

  let current = value;
  const show = (): void => {
    const shown = current ?? DIAL_DEFAULT;
    const f = fractionOfSpeed(shown);
    const tip = pointAt(g, f, NEEDLE);
    needle.setAttribute('x2', String(tip.x));
    needle.setAttribute('y2', String(tip.y));
    knob.setAttribute('cx', String(tip.x));
    knob.setAttribute('cy', String(tip.y));
    progress.setAttribute('d', current === null || f === 0 ? '' : arcPath(g, 0, f, RADIUS));
    readout.replaceChildren(current === null ? '구속 안 잼' : h('strong', { text: String(current) }), current === null ? '' : ' km/h');
    wrap.classList.toggle('unset', current === null);
    svg.setAttribute('aria-valuenow', current === null ? '' : String(current));
  };
  const choose = (speed: number | null): void => {
    if (speed === current) return;
    current = speed;
    show();
    onChange(speed);
  };

  // 누른 곳을 그림 좌표로 바꿔 바늘을 옮긴다. 손가락을 떼기 전까지 따라 움직인다.
  const pick = (e: PointerEvent): void => {
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * HEIGHT;
    choose(speedAtFraction(fractionAt(x - g.cx, y - g.cy, hand)));
  };
  let dragging = false;
  svg.addEventListener('pointerdown', (e) => {
    dragging = true;
    svg.setPointerCapture(e.pointerId);
    pick(e);
  });
  svg.addEventListener('pointermove', (e) => {
    if (dragging) pick(e);
  });
  const stop = (): void => {
    dragging = false;
  };
  svg.addEventListener('pointerup', stop);
  svg.addEventListener('pointercancel', stop);
  const step = (delta: number): void => choose(Math.min(DIAL_MAX, Math.max(DIAL_MIN, (current ?? DIAL_DEFAULT) + (current === null ? 0 : delta))));
  svg.addEventListener('keydown', (e) => {
    const delta = e.key === 'ArrowUp' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowDown' || e.key === 'ArrowLeft' ? -1 : 0;
    if (delta === 0) return;
    e.preventDefault();
    step(delta);
  });

  wrap.append(
    h('div', { className: 'dial-buttons' }, [
      h('button', { className: 'secondary small', text: '−1', attrs: { 'aria-label': '구속 1 내리기' }, onClick: () => step(-1) }),
      h('button', { className: 'secondary small', text: '+1', attrs: { 'aria-label': '구속 1 올리기' }, onClick: () => step(1) }),
      h('button', { className: 'secondary small', text: '비우기', attrs: { 'aria-label': '구속 비우기 (안 잼)' }, onClick: () => choose(null) }),
    ]),
  );
  show();
  return wrap;
}
