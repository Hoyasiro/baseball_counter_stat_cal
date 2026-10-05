// 투구 상세 창(구종·존 통과 지점·구속)과 타구 기록(낙구 지점·타구 질) 입력 화면

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
  PITCH_SHEET_LABEL,
  PITCH_TYPE_LABEL,
  pitchLabel,
} from './labels';
import { speedWheel } from './speed-wheel';

/** 공 하나에 함께 남길 투구 상세. 고르지 않은 값은 null */
export interface PitchDetail {
  readonly pitchType: PitchType | null;
  readonly zone: ZonePoint | null;
  readonly speed: number | null;
}

export const EMPTY_PITCH_DETAIL: PitchDetail = { pitchType: null, zone: null, speed: null };

/** 투구 상세 팝업: 결과 버튼을 누른 뒤 그 공의 구종·존·구속을 고르는 중 */
export interface PitchSheet extends PitchDetail {
  readonly result: PitchResult;
  readonly hitType?: HitType;
}

/** 친 공을 기록하기 전, 낙구 지점·질을 고르는 중 */
export interface FieldDraft {
  readonly result: PitchResult;
  readonly hitType?: HitType;
  readonly x: number | null;
  readonly y: number | null;
  readonly type: BattedBallType | null;
  readonly strength: BattedBallStrength | null;
  /** 투구 상세 팝업에서 고른 값 (켜져 있을 때) */
  readonly pitch: PitchDetail;
}

export interface PitchSheetActions {
  change: (sheet: PitchSheet) => void;
  /** 다이얼은 돌릴 때마다 다시 그리면 멈춰 버리므로 값만 담는다. */
  changeSpeed: (speed: number | null) => void;
  save: (sheet: PitchSheet) => void;
  skip: (sheet: PitchSheet) => void;
  cancel: () => void;
}

export interface FieldActions {
  change: (draft: FieldDraft) => void;
  save: (draft: FieldDraft) => void;
  skip: (draft: FieldDraft) => void;
  cancel: () => void;
}

export function isBattedResult(result: PitchResult): boolean {
  return result === 'hit' || result === 'out' || result === 'reachedOnError';
}

/** 투구 상세 켜고 끄기. 엄지가 닿는 쪽(손 설정)에 붙는다. */
export function pitchDetailToggle(on: boolean, toggle: () => void): HTMLElement {
  return h('div', { className: 'detail-toggle-row' }, [
    h('button', {
      className: `detail-toggle${on ? ' on' : ''}`,
      attrs: { 'aria-pressed': on ? 'true' : 'false' },
      onClick: toggle,
    }, [h('span', { className: 'switch' }), `${PITCH_DETAIL_LABEL} ${on ? '켜짐' : '꺼짐'}`]),
    h('small', { className: 'detail-toggle-hint', text: on ? '공 버튼을 누르면 구종·존·구속 창이 열려요' : '' }),
  ]);
}

function sheetResultLabel(sheet: PitchSheet): string {
  return pitchLabel(sheet);
}

/** 결과 버튼을 누른 뒤 뜨는 투구 상세 창. 상황판은 가리지 않도록 아래에서 올라온다. */
export function pitchSheetView(sheet: PitchSheet, speedStart: number, actions: PitchSheetActions): HTMLElement {
  // 다이얼 값은 다시 그리지 않고 담기만 하므로, 다른 값을 고르거나 기록할 때 최신 구속을 함께 넘긴다.
  let speed = sheet.speed;
  const changeSpeed = (value: number | null): void => {
    speed = value;
    actions.changeSpeed(value);
  };
  const latest = (change: Partial<PitchSheet> = {}): PitchSheet => ({ ...sheet, speed, ...change });
  const set = (change: Partial<PitchSheet>): void => actions.change(latest(change));
  const zoneText = sheet.zone ? (isInZone(sheet.zone) ? '존 안' : '존 밖') : '공이 지나간 곳을 누르세요';
  const batted = isBattedResult(sheet.result);
  const backdrop = h('div', { className: 'sheet-backdrop' }, [
    h('section', { className: 'pitch-sheet', attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-label': PITCH_DETAIL_LABEL } }, [
      h('div', { className: 'sheet-head' }, [
        h('p', { className: 'section-title' }, [`${PITCH_DETAIL_LABEL} · ${sheetResultLabel(sheet)}`]),
        h('button', { className: 'link-button', text: '← 돌아가기', attrs: { 'aria-label': '돌아가기 (기록하지 않음)' }, onClick: actions.cancel }),
      ]),
      h(
        'div',
        { className: 'pitch-type-row' },
        PITCH_TYPES.map((t) =>
          h('button', {
            className: sheet.pitchType === t ? 'active' : '',
            text: PITCH_TYPE_LABEL[t],
            onClick: () => set({ pitchType: sheet.pitchType === t ? null : t }),
          }),
        ),
      ),
      h('div', { className: 'sheet-body' }, [
        h('div', { className: 'sheet-zone' }, [
          h('div', { className: 'zone-pick' }, [
            zoneSvg({ picked: sheet.zone, onPick: (x, y) => set({ zone: { x, y } }), label: '스트라이크 존. 공이 지나간 곳을 누르세요' }),
          ]),
          h('p', { className: 'zone-caption' }, [
            zoneText,
            sheet.zone ? h('button', { className: 'link-button', text: '지우기', onClick: () => set({ zone: null }) }) : null,
          ]),
        ]),
        speedWheel(sheet.speed, speedStart, changeSpeed),
      ]),
      h('div', { className: 'confirm-buttons sheet-buttons' }, [
        h('button', { className: 'secondary', text: PITCH_SHEET_LABEL.skip, onClick: () => actions.skip(latest()) }),
        h('button', { className: 'primary', text: batted ? PITCH_SHEET_LABEL.next : PITCH_SHEET_LABEL.save, onClick: () => actions.save(latest()) }),
      ]),
    ]),
  ]);
  // 창 바깥(어두운 곳)을 누르면 기록하지 않고 닫는다.
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) actions.cancel();
  });
  return backdrop;
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
