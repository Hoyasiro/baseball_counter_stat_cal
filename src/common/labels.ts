// 화면에 보이는 쉬운 말 (CLAUDE.md 0.4). 입력은 상황 기준 하나이므로 투수·타자가 같은 말을 쓴다.

import { GameOrder } from './game-list';
import { Hand } from './settings';
import { BASE_NAMES, STEAL_NAMES, basesLabel } from './bases';
import {
  BattedBallStrength,
  BattedBallType,
  HitType,
  FieldingCredit,
  FieldingPosition,
  PitchEvent,
  PitchResult,
  PitchType,
  PlayEvent,
  Position,
  Role,
  UndoableEvent,
} from './events';
import { halfInningLabel } from './innings';
import { Actor, PlateAppearance, PlateAppearanceOutcome, RunnerEventKind } from './replay';

/** 아래 탭 이름 */
export type AppTab = 'input' | 'records' | 'pitcher' | 'batter' | 'fielder' | 'games' | 'settings';

export const TAB_LABEL: Record<AppTab, string> = {
  input: '기록 입력',
  records: '기록 보기',
  pitcher: '투수 분석',
  batter: '타자 분석',
  fielder: '수비 분석',
  games: '경기',
  settings: '설정',
};

export const ROLE_LABEL: Record<Role, string> = {
  pitcher: '투수',
  batter: '타자',
  runner: '주자',
  fielder: '수비',
};

export const POSITION_LABEL: Record<Position, string> = {
  catcher: '포수',
  firstBase: '1루수',
  secondBase: '2루수',
  thirdBase: '3루수',
  shortstop: '유격수',
  leftField: '좌익수',
  centerField: '중견수',
  rightField: '우익수',
};

/** 수비 자리 (투수 포함) */
export const FIELDING_POSITION_LABEL: Record<FieldingPosition, string> = { pitcher: '투수', ...POSITION_LABEL };

/** 아이가 수비에서 받은 기록. 쉬운 말 먼저, 공식 용어는 괄호에 */
export const FIELDING_CREDIT_LABEL: Record<FieldingCredit, string> = {
  putout: '잡아서 아웃',
  assist: '던져서 아웃 도움',
  error: '실책',
};

/** 수비 중 주자 상황 창의 버튼 */
export const PLAY_FIELDING_LABEL = { none: '아이는 관여 안 함', save: '이대로 기록' } as const;

export const FIELDING_CREDIT_HINT: Record<FieldingCredit, string> = {
  putout: '잡기·베이스 밟기·태그 (자살)',
  assist: '던져서 도움 (보살)',
  error: '놓침·나쁜 송구',
};

export const ACTOR_LABEL: Record<Actor, string> = {
  opponent: '상대 타자',
  child: '우리 아이',
  teammate: '우리 팀 타자',
};

export interface PitchButton {
  readonly result: PitchResult;
  readonly label: string;
  readonly hint: string;
}

/** 자주 누르는 공. "안타"는 누르면 안타 종류를 고른다. */
export const MAIN_PITCH_BUTTONS: readonly PitchButton[] = [
  { result: 'ball', label: '볼', hint: '존 밖으로 빠진 공' },
  { result: 'strike', label: '스트라이크', hint: '헛스윙 · 그냥 지켜봄' },
  { result: 'foul', label: '파울', hint: '쳤는데 선 밖으로' },
  { result: 'hit', label: '안타', hint: '쳐서 살아나감 ›' },
  { result: 'out', label: '아웃', hint: '쳤는데 잡힘 · 아웃' },
  { result: 'hitByPitch', label: '몸에 맞음', hint: '타자 몸에 맞은 공' },
];

/** 가끔 누르는 공 */
export const EXTRA_PITCH_BUTTONS: readonly PitchButton[] = [
  { result: 'buntFoul', label: '번트 파울', hint: '2스트면 삼진' },
  { result: 'wildPitch', label: '와일드피치', hint: '볼+주자 한 칸' },
  { result: 'reachedOnError', label: '실책 출루', hint: '수비 실수 출루' },
];

/** 병살: 친 공으로 타자와 주자 한 명이 함께 아웃 */
export const DOUBLE_PLAY_BUTTON = { label: '병살', hint: '타자+주자 아웃' } as const;

export const HIT_BUTTONS: readonly { hitType: HitType; label: string; hint: string }[] = [
  { hitType: 'single', label: '1루타', hint: '1루까지' },
  { hitType: 'double', label: '2루타', hint: '2루까지' },
  { hitType: 'triple', label: '3루타', hint: '3루까지' },
  { hitType: 'homeRun', label: '홈런', hint: '홈까지' },
];

export const PITCH_TYPE_LABEL: Record<PitchType, string> = {
  fastball: '직구',
  curveball: '커브',
  slider: '슬라이더',
  changeup: '체인지업',
  splitter: '포크',
  other: '기타 구종',
};

export const BATTED_BALL_TYPE_LABEL: Record<BattedBallType, string> = {
  ground: '땅볼',
  line: '라인드라이브',
  fly: '뜬공',
  popup: '팝플라이',
};

/** 타구 종류 버튼 아래 쉬운 설명 */
export const BATTED_BALL_TYPE_HINT: Record<BattedBallType, string> = {
  ground: '굴러감',
  line: '낮고 곧게',
  fly: '높이 멀리',
  popup: '높이 가까이',
};

export const BATTED_BALL_STRENGTH_LABEL: Record<BattedBallStrength, string> = {
  soft: '약하게',
  medium: '보통',
  hard: '세게',
};

/** 타구 기록 화면 버튼 */
export const FIELD_BUTTON_LABEL = { skip: '타구 기록 건너뛰기', save: '이 타구로 기록' } as const;

/** 투구 상세 스위치 */
export const PITCH_DETAIL_LABEL = '투구 상세';

/** 투구 상세 창의 버튼 */
export const PITCH_SHEET_LABEL = { save: '이 공 기록', next: '다음: 타구 기록', skip: '상세 없이 기록' } as const;

export const HAND_LABEL: Record<Hand, string> = { right: '오른손', left: '왼손' };

/** 데이터 내려받기 버튼 */
export const DOWNLOAD_LABEL = { json: '백업 파일 (JSON)', csv: '표 파일 (CSV, 엑셀)' } as const;

export const IMPORT_LABEL = '백업 파일 불러오기';

export const GAME_ORDER_LABEL: Record<GameOrder, string> = {
  newest: '최근 경기 먼저',
  oldest: '오래된 경기 먼저',
  opponent: '상대팀 가나다순',
};

export const HIT_TYPE_LABEL: Record<HitType, string> = {
  single: '1루타',
  double: '2루타',
  triple: '3루타',
  homeRun: '홈런',
};

const PITCH_LABEL: Record<PitchResult, string> = {
  ball: '볼',
  strike: '스트라이크',
  foul: '파울',
  buntFoul: '번트 파울',
  wildPitch: '와일드피치',
  hit: '안타',
  reachedOnError: '실책 출루',
  out: '아웃',
  hitByPitch: '몸에 맞음',
};

export function pitchLabel(pitch: Pick<PitchEvent, 'result' | 'hitType' | 'doublePlay'>): string {
  if (pitch.result === 'hit') return HIT_TYPE_LABEL[pitch.hitType ?? 'single'];
  if (pitch.result === 'out' && pitch.doublePlay !== undefined) return `병살 (${BASE_NAMES[pitch.doublePlay]} 주자도 아웃)`;
  return PITCH_LABEL[pitch.result];
}

/** 주자 상황 버튼. 주자가 여럿이면 누구인지 고르는 화면이 나온다. */
export type RunnerAction = 'pickoff' | 'pickoffOut' | 'stolenBase' | 'caughtStealing' | 'error';

export const RUNNER_BUTTONS: readonly { action: RunnerAction; label: string; hint: string }[] = [
  { action: 'pickoff', label: '견제', hint: '주자 살아남' },
  { action: 'pickoffOut', label: '견제 아웃', hint: '견제로 잡음' },
  { action: 'error', label: '실책 진루', hint: '수비 실수로 주자 이동' },
  { action: 'stolenBase', label: '도루', hint: '다음 베이스 성공' },
  { action: 'caughtStealing', label: '도루 실패', hint: '뛰다가 잡힘' },
];

/** 주자인 우리 아이에게 바로 기록하는 버튼 */
export type ChildRunnerAction = 'stolenBase' | 'caughtStealing' | 'pickoff' | 'pickoffOut' | 'advance' | 'scored' | 'out';

export const CHILD_RUNNER_BUTTONS: readonly { action: ChildRunnerAction; label: string }[] = [
  { action: 'stolenBase', label: '도루 성공' },
  { action: 'caughtStealing', label: '도루 실패' },
  { action: 'pickoff', label: '견제 받음' },
  { action: 'pickoffOut', label: '견제 아웃' },
  { action: 'advance', label: '한 칸 진루' },
  { action: 'scored', label: '홈인 (득점)' },
  { action: 'out', label: '주루 아웃' },
];

export const CHOOSER_QUESTION: Record<Exclude<RunnerAction, 'error'>, string> = {
  pickoff: '어느 베이스로 견제했나요?',
  pickoffOut: '어느 주자를 견제로 잡았나요?',
  stolenBase: '누가 도루했나요?',
  caughtStealing: '누가 도루하다 잡혔나요?',
};

function playLabel(play: PlayEvent): string {
  const base = play.base ?? 0;
  switch (play.play) {
    case 'pickoff':
      return play.base === undefined ? '견제' : `견제 (${BASE_NAMES[base]})`;
    case 'pickoffOut':
      return `견제 아웃 (${BASE_NAMES[base]})`;
    case 'stolenBase':
      return `도루 (${STEAL_NAMES[base]})`;
    case 'stolenSecond':
      return `도루 (${STEAL_NAMES[0]})`;
    case 'caughtStealing':
      return `도루 실패 (${STEAL_NAMES[base]})`;
    case 'caughtStealingSecond':
      return `도루 실패 (${STEAL_NAMES[0]})`;
    case 'error':
      return '실책 (주자 이동)';
  }
}

const CHILD_POSITION_LABEL = { scored: '아이 홈인', out: '아이 아웃' } as const;

/** 기록 한 줄을 쉬운 말로. 기록 보기와 "마지막 기록 취소" 버튼에 쓴다. */
/** 수비 기록을 붙여 쓴다. 예: " · 아이: 잡아서 아웃" */
export function fieldingText(fielding: readonly FieldingCredit[] | undefined): string {
  return fielding && fielding.length > 0 ? fielding.map((c) => FIELDING_CREDIT_LABEL[c]).join('·') : '';
}

function fieldingSuffix(fielding: readonly FieldingCredit[] | undefined): string {
  const text = fieldingText(fielding);
  return text ? ` · 아이: ${text}` : '';
}

export function eventLabel(event: UndoableEvent): string {
  switch (event.kind) {
    case 'pitch':
      return pitchLabel(event) + fieldingSuffix(event.fielding);
    case 'play':
      return playLabel(event) + fieldingSuffix(event.fielding);
    case 'adjust': {
      const runs = event.runs ? ` · ${event.runs}점` : '';
      const child =
        event.child === undefined
          ? ''
          : typeof event.child === 'number'
            ? ` · 아이 ${BASE_NAMES[event.child]}`
            : ` · ${CHILD_POSITION_LABEL[event.child]}`;
      return `상황 고침: ${event.inning}회 ${event.outs}아웃 ${basesLabel(event.bases)}${runs}${child}`;
    }
    case 'appearance':
      return `${ROLE_LABEL[event.role]}로 등장 (${event.inning}회)`;
    case 'exit':
      return '교체됨';
    case 'score':
      return `점수 넣음: ${event.team === 'us' ? '우리 팀' : '상대팀'} ${event.inning}회 ${event.runs}점`;
  }
}

const OUTCOME_LABEL: Record<PlateAppearanceOutcome, string> = {
  walk: '볼넷',
  strikeout: '삼진',
  hit: '안타',
  reachedOnError: '실책으로 출루',
  out: '아웃',
  hitByPitch: '몸에 맞는 공',
  inningEnded: '이닝 종료로 중단',
  sceneEnded: '교체로 중단',
};

/** 타석 결과를 쉬운 말로. 안타는 종류, 쓰리번트 삼진은 따로 알려준다. */
export function outcomeLabel(pa: PlateAppearance): string {
  if (pa.outcome === null) return '진행 중';
  if (pa.outcome === 'hit' && pa.hitType) return HIT_TYPE_LABEL[pa.hitType];
  const lastPitch = pa.pitches[pa.pitches.length - 1];
  if (pa.outcome === 'strikeout' && lastPitch?.result === 'buntFoul') return '삼진 (쓰리번트 아웃)';
  if (pa.outcome === 'out' && lastPitch?.doublePlay !== undefined) return '병살';
  return OUTCOME_LABEL[pa.outcome];
}

export const RUNNER_EVENT_LABEL: Record<RunnerEventKind, string> = {
  stolenBase: '도루 성공',
  caughtStealing: '도루 실패',
  pickoff: '견제 받음',
  pickedOff: '견제 아웃',
  scored: '홈인',
  out: '주루 아웃',
  stranded: '잔루',
};

/** 장면 제목. 예: "4회말 · 투수로 등장" */
export function sceneTitle(role: Role, inning: number, half: 'top' | 'bottom', position: Position | null): string {
  const roleText = role === 'fielder' && position ? `${POSITION_LABEL[position]}(수비)` : ROLE_LABEL[role];
  return `${halfInningLabel(inning, half)} · ${roleText}로 등장`;
}
