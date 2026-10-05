// 이 휴대폰에만 기억하는 편의 설정. 기록 데이터와는 따로 둔다.

export type Hand = 'right' | 'left';

export const DEFAULT_HAND: Hand = 'right';

const HAND_KEY = 'baseball-counter.hand';

/** 저장된 글자를 손 설정으로. 모르는 값이면 기본값(오른손) */
export function parseHand(raw: string | null): Hand {
  return raw === 'left' || raw === 'right' ? raw : DEFAULT_HAND;
}

export function loadHand(): Hand {
  try {
    return parseHand(localStorage.getItem(HAND_KEY));
  } catch {
    return DEFAULT_HAND;
  }
}

export function saveHand(hand: Hand): void {
  try {
    localStorage.setItem(HAND_KEY, hand);
  } catch {
    // 기억하지 못해도 이번에는 고른 손으로 쓴다.
  }
}
