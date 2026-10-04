import { PitchResult, PlateAppearanceOutcome } from '../common/pitch-log';

/** 투수 화면용 쉬운 말 (CLAUDE.md 0.4) */
export const PITCH_BUTTONS: readonly { result: PitchResult; label: string; hint: string }[] = [
  { result: 'ball', label: '볼', hint: '스트라이크 존 밖' },
  { result: 'strike', label: '스트라이크', hint: '헛스윙 · 그냥 지켜봄' },
  { result: 'foul', label: '파울', hint: '쳤는데 선 밖으로' },
  { result: 'hit', label: '안타', hint: '쳐서 살아나감' },
  { result: 'out', label: '아웃', hint: '쳤는데 잡힘 · 아웃' },
  { result: 'hitByPitch', label: '몸에 맞음', hint: '타자 몸에 맞은 공' },
];

export const PITCH_LABEL: Record<PitchResult, string> = {
  ball: '볼',
  strike: '스트라이크',
  foul: '파울',
  hit: '안타',
  out: '아웃',
  hitByPitch: '몸에 맞음',
};

export const OUTCOME_LABEL: Record<PlateAppearanceOutcome, string> = {
  walk: '볼넷 (볼 4개)',
  strikeout: '삼진 (스트라이크 3개)',
  hit: '안타',
  out: '아웃',
  hitByPitch: '몸에 맞는 공',
};
