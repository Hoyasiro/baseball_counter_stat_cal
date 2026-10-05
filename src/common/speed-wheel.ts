// 구속 다이얼. 키보드 대신 30~180 km/h 안에서만 돌려 고른다.
// 손대기 전에는 "안 잼"(기록 안 함)이고, 돌리기 시작하면 가운데 숫자가 고른 값이 된다.

import { h } from './dom';
import { LogEvent, SPEED_MAX, SPEED_MIN } from './events';

/** 다이얼 한 칸 높이(px). CSS .speed-wheel li 높이와 같아야 한다. */
export const WHEEL_ITEM_HEIGHT = 44;

/** 이 경기에서 잰 구속이 하나도 없을 때 다이얼이 처음 멈춰 있는 곳. 초·중학생 직구 근처. */
export const SPEED_WHEEL_START = 100;

/** 스크롤 위치를 구속으로. 범위를 벗어나면 끝 값으로 맞춘다. */
export function speedAtOffset(offset: number): number {
  const index = Math.round(offset / WHEEL_ITEM_HEIGHT);
  return Math.min(SPEED_MAX, Math.max(SPEED_MIN, SPEED_MIN + index));
}

export function offsetOfSpeed(speed: number): number {
  return (Math.min(SPEED_MAX, Math.max(SPEED_MIN, speed)) - SPEED_MIN) * WHEEL_ITEM_HEIGHT;
}

/** 가장 최근에 잰 구속. 다이얼을 그 근처에서 시작해 조금만 돌리면 되게 한다. */
export function lastSpeedOf(events: readonly LogEvent[]): number | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.kind === 'pitch' && e.speed !== undefined) return e.speed;
  }
  return null;
}

/** 스크롤이 멈췄다고 볼 시간(ms) */
const SETTLE_MS = 90;

export function speedWheel(value: number | null, start: number, onChange: (speed: number | null) => void): HTMLElement {
  const speeds = Array.from({ length: SPEED_MAX - SPEED_MIN + 1 }, (_, i) => SPEED_MIN + i);
  const readout = h('p', { className: 'speed-readout' });
  const list = h(
    'ul',
    {
      className: 'speed-wheel',
      attrs: { role: 'spinbutton', tabindex: '0', 'aria-label': '구속 (km/h). 위아래로 돌려 고르세요', 'aria-valuemin': String(SPEED_MIN), 'aria-valuemax': String(SPEED_MAX) },
    },
    speeds.map((s) => h('li', { text: String(s), attrs: { 'data-speed': String(s) } })),
  );
  const wrap = h('div', { className: 'speed-dial' }, [readout, h('div', { className: 'speed-window' }, [list])]);

  let current = value;
  const show = (): void => {
    readout.replaceChildren(current === null ? '구속 안 잼' : h('strong', { text: String(current) }), current === null ? '' : ' km/h');
    wrap.classList.toggle('unset', current === null);
    list.setAttribute('aria-valuenow', current === null ? '' : String(current));
  };
  const choose = (speed: number | null): void => {
    current = speed;
    show();
    onChange(speed);
  };

  // 화면이 처음 그려질 때의 스크롤은 사용자가 고른 게 아니므로, 손을 댄 뒤부터만 값으로 받는다.
  let touched = false;
  const touch = (): void => {
    touched = true;
  };
  list.addEventListener('pointerdown', touch);
  list.addEventListener('touchstart', touch, { passive: true });
  list.addEventListener('wheel', touch, { passive: true });
  let timer: ReturnType<typeof setTimeout> | undefined;
  list.addEventListener('scroll', () => {
    if (!touched) return;
    clearTimeout(timer);
    timer = setTimeout(() => choose(speedAtOffset(list.scrollTop)), SETTLE_MS);
  });
  list.addEventListener('click', (e) => {
    const speed = Number((e.target as HTMLElement).dataset.speed);
    if (!Number.isInteger(speed)) return;
    touched = true;
    list.scrollTo({ top: offsetOfSpeed(speed), behavior: 'smooth' });
    choose(speed);
  });
  list.addEventListener('keydown', (e) => {
    const step = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
    if (step === 0) return;
    e.preventDefault();
    const next = Math.min(SPEED_MAX, Math.max(SPEED_MIN, (current ?? start) + (current === null ? 0 : step)));
    list.scrollTop = offsetOfSpeed(next);
    choose(next);
  });

  const clear = h('button', { className: 'secondary small', text: '구속 비우기', onClick: () => choose(null) });
  wrap.append(clear);
  show();
  // 화면에 붙은 뒤에야 스크롤 위치를 정할 수 있다.
  requestAnimationFrame(() => {
    list.scrollTop = offsetOfSpeed(current ?? start);
  });
  return wrap;
}
