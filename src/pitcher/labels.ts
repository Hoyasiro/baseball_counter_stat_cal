import { BASE_NAMES, basesLabel } from '../common/bases';
import { PitchResult, PlayEvent, PlayKind, PlayLogEvent } from '../common/events';
import { PlateAppearanceOutcome } from '../common/replay';

/** 투수 화면용 쉬운 말 (CLAUDE.md 0.4) */
export interface PitchButton {
  readonly result: PitchResult;
  readonly label: string;
  readonly hint: string;
}

/** 자주 누르는 공 */
export const MAIN_PITCH_BUTTONS: readonly PitchButton[] = [
  { result: 'ball', label: '볼', hint: '존 밖으로 빠진 공' },
  { result: 'strike', label: '스트라이크', hint: '헛스윙 · 그냥 지켜봄' },
  { result: 'foul', label: '파울', hint: '쳤는데 선 밖으로' },
  { result: 'hit', label: '안타', hint: '쳐서 살아나감' },
  { result: 'out', label: '아웃', hint: '쳤는데 잡힘 · 아웃' },
  { result: 'hitByPitch', label: '몸에 맞음', hint: '타자 몸에 맞은 공' },
];

/** 가끔 누르는 공 */
export const EXTRA_PITCH_BUTTONS: readonly PitchButton[] = [
  { result: 'buntFoul', label: '번트 파울', hint: '2스트라이크면 삼진' },
  { result: 'wildPitch', label: '와일드피치', hint: '볼 + 주자 한 칸씩' },
];

export const PITCH_LABEL: Record<PitchResult, string> = {
  ball: '볼',
  strike: '스트라이크',
  foul: '파울',
  buntFoul: '번트 파울',
  wildPitch: '와일드피치',
  hit: '안타',
  out: '아웃',
  hitByPitch: '몸에 맞음',
};

export const PLAY_BUTTONS: readonly { play: PlayKind; label: string; hint: string }[] = [
  { play: 'pickoff', label: '견제', hint: '주자 살아남' },
  { play: 'pickoffOut', label: '견제 아웃', hint: '견제로 잡음' },
  { play: 'stolenSecond', label: '2루 도루', hint: '1루 → 2루 성공' },
  { play: 'caughtStealingSecond', label: '도루 실패', hint: '2루에서 잡음' },
];

const PLAY_LABEL: Record<PlayKind, string> = {
  pickoff: '견제',
  pickoffOut: '견제 아웃',
  stolenSecond: '2루 도루',
  caughtStealingSecond: '도루 실패',
};

export function playLabel(play: PlayEvent): string {
  if (play.play === 'pickoffOut' && play.base !== undefined) return `견제 아웃 (${BASE_NAMES[play.base]})`;
  return PLAY_LABEL[play.play];
}

/** 기록 한 줄을 쉬운 말로. 기록 보기와 "마지막 기록 취소" 버튼에 쓴다. */
export function eventLabel(event: PlayLogEvent): string {
  switch (event.kind) {
    case 'pitch':
      return PITCH_LABEL[event.result];
    case 'play':
      return playLabel(event);
    case 'adjust':
      return `상황 고침: ${event.inning}회 ${event.outs}아웃 ${basesLabel(event.bases)}`;
  }
}

export const OUTCOME_LABEL: Record<PlateAppearanceOutcome, string> = {
  walk: '볼넷 (볼 4개)',
  strikeout: '삼진',
  hit: '안타',
  out: '아웃',
  hitByPitch: '몸에 맞는 공',
  inningEnded: '이닝 종료로 중단',
};
