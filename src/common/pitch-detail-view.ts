// 투구 상세(구종·존 통과 지점·구속)와 타구 기록(낙구 지점·타구 질) 입력 화면

import { h } from './dom';
import {
  BATTED_BALL_STRENGTHS,
  BATTED_BALL_TYPES,
  BattedBallStrength,
  BattedBallType,
  HitType,
  PITCH_TYPES,
  PitchResult,
  PitchType,
  SPEED_MAX,
  SPEED_MIN,
  ZonePoint,
} from './events';
import { isInZone, placementLabel } from './field';
import { fieldSvg, zoneSvg } from './field-view';
import {
  BATTED_BALL_STRENGTH_LABEL,
  BATTED_BALL_TYPE_HINT,
  BATTED_BALL_TYPE_LABEL,
  FIELD_BUTTON_LABEL,
  HIT_TYPE_LABEL,
  PITCH_DETAIL_LABEL,
  PITCH_TYPE_LABEL,
} from './labels';

/** 다음 공에 함께 남길 투구 상세 */
export interface PitchDraft {
  readonly pitchType: PitchType | null;
  readonly zone: ZonePoint | null;
  /** 입력 칸의 글자 그대로. 기록할 때 숫자로 확인한다. */
  readonly speedText: string;
}

export const EMPTY_PITCH_DRAFT: PitchDraft = { pitchType: null, zone: null, speedText: '' };

/** 친 공을 기록하기 전, 낙구 지점·질을 고르는 중 */
export interface FieldDraft {
  readonly result: PitchResult;
  readonly hitType?: HitType;
  readonly x: number | null;
  readonly y: number | null;
  readonly type: BattedBallType | null;
  readonly strength: BattedBallStrength | null;
}

export interface PitchDetailActions {
  toggle: () => void;
  change: (draft: PitchDraft) => void;
  /** 구속 칸은 글자를 칠 때마다 다시 그리면 키보드가 닫히므로 값만 담는다. */
  changeSpeed: (text: string) => void;
}

export interface FieldActions {
  change: (draft: FieldDraft) => void;
  save: (draft: FieldDraft) => void;
  skip: (draft: FieldDraft) => void;
  cancel: () => void;
}

/** 구속 칸의 글자를 숫자로. 비었거나 범위를 벗어나면 null */
export function parseSpeed(text: string): number | null {
  if (text.trim() === '') return null;
  const value = Number(text);
  return Number.isInteger(value) && value >= SPEED_MIN && value <= SPEED_MAX ? value : null;
}

export function pitchDetailToggle(on: boolean, actions: PitchDetailActions): HTMLElement {
  return h('button', {
    className: `detail-toggle${on ? ' on' : ''}`,
    attrs: { 'aria-pressed': on ? 'true' : 'false' },
    onClick: actions.toggle,
  }, [h('span', { className: 'switch' }), `${PITCH_DETAIL_LABEL} ${on ? '켜짐' : '꺼짐'}`, h('small', { text: on ? ' 구종·존·구속' : '' })]);
}

export function pitchDetailPanel(draft: PitchDraft, actions: PitchDetailActions): HTMLElement {
  const set = (change: Partial<PitchDraft>): void => actions.change({ ...draft, ...change });
  const speed = h('input', {
    attrs: {
      id: 'pitch-speed',
      type: 'number',
      inputmode: 'numeric',
      min: String(SPEED_MIN),
      max: String(SPEED_MAX),
      placeholder: '구속',
      value: draft.speedText,
      'aria-label': '구속 (km/h)',
    },
  });
  speed.addEventListener('input', () => actions.changeSpeed(speed.value));
  const zoneText = draft.zone ? (isInZone(draft.zone) ? '존 안' : '존 밖') : '눌러서 찍기';

  // 한 화면에 들어가도록 존 그림 옆에 구종과 구속을 함께 둔다.
  return h('section', { className: 'pitch-detail' }, [
    h('div', { className: 'zone-pick' }, [
      zoneSvg({ picked: draft.zone, onPick: (x, y) => set({ zone: { x, y } }), label: '스트라이크 존. 공이 지나간 곳을 누르세요' }),
      h('span', { className: 'zone-caption', text: zoneText }),
    ]),
    h('div', { className: 'pitch-detail-side' }, [
      h(
        'div',
        { className: 'pitch-type-row' },
        PITCH_TYPES.map((t) =>
          h('button', {
            className: draft.pitchType === t ? 'active' : '',
            text: PITCH_TYPE_LABEL[t],
            onClick: () => set({ pitchType: draft.pitchType === t ? null : t }),
          }),
        ),
      ),
      h('div', { className: 'speed-row' }, [
        h('label', { className: 'speed-field', attrs: { for: 'pitch-speed' } }, [speed, h('span', { text: 'km/h' })]),
        h('button', { className: 'secondary small', text: '지우기', onClick: () => actions.change({ ...draft, zone: null, pitchType: null, speedText: '' }) }),
      ]),
    ]),
  ]);
}

export function fieldPanel(draft: FieldDraft, actions: FieldActions): HTMLElement {
  const set = (change: Partial<FieldDraft>): void => actions.change({ ...draft, ...change });
  const what = draft.result === 'hit' ? HIT_TYPE_LABEL[draft.hitType ?? 'single'] : draft.result === 'out' ? '아웃' : '실책 출루';
  const where = draft.x !== null && draft.y !== null ? placementLabel(draft.x, draft.y) : '공이 떨어진 곳을 누르세요';
  return h('section', { className: 'field-panel' }, [
    h('div', { className: 'field-head' }, [
      h('p', { className: 'section-title' }, [`타구 기록 · ${what}`, h('small', { text: ` · ${where}` })]),
      h('button', { className: 'link-button', text: '← 돌아가기', attrs: { 'aria-label': '돌아가기 (기록하지 않음)' }, onClick: actions.cancel }),
    ]),
    h('div', { className: 'field-pick' }, [
      fieldSvg({
        picked: draft.x !== null && draft.y !== null ? { x: draft.x, y: draft.y } : null,
        onPick: (x, y) => set({ x, y }),
        label: '야구장. 공이 떨어진 곳을 누르세요',
      }),
    ]),
    h(
      'div',
      { className: 'batted-type-row' },
      BATTED_BALL_TYPES.map((t) =>
        h('button', { className: draft.type === t ? 'active' : '', onClick: () => set({ type: draft.type === t ? null : t }) }, [
          h('strong', { text: BATTED_BALL_TYPE_LABEL[t] }),
          h('small', { text: BATTED_BALL_TYPE_HINT[t] }),
        ]),
      ),
    ),
    h(
      'div',
      { className: 'strength-row' },
      BATTED_BALL_STRENGTHS.map((st) =>
        h('button', {
          className: draft.strength === st ? 'active' : '',
          text: BATTED_BALL_STRENGTH_LABEL[st],
          onClick: () => set({ strength: draft.strength === st ? null : st }),
        }),
      ),
    ),
    h('div', { className: 'confirm-buttons' }, [
      h('button', { className: 'secondary', text: FIELD_BUTTON_LABEL.skip, onClick: () => actions.skip(draft) }),
      h('button', { className: 'primary', text: FIELD_BUTTON_LABEL.save, onClick: () => actions.save(draft) }),
    ]),
  ]);
}
