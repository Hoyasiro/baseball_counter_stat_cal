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

const TEAM_NAME_KEY = 'baseball-counter.team-name';

/** 새 경기에 넣을 우리 팀 이름. 경기마다 경기 정보에 함께 저장되므로, 바꿔도 예전 경기 이름은 그대로다. */
export function loadTeamName(): string {
  try {
    return localStorage.getItem(TEAM_NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveTeamName(name: string): void {
  try {
    localStorage.setItem(TEAM_NAME_KEY, name);
  } catch {
    // 기억하지 못해도 이번 경기에는 쓴다.
  }
}

const SCOREBOARD_KEY = 'baseball-counter.scoreboard';

/** 경기 결과에서 스코어보드를 보여줄지. 아이 기록이 먼저라 꺼 둘 수 있다. 처음에는 켜져 있다. */
export function loadShowScoreboard(): boolean {
  try {
    return localStorage.getItem(SCOREBOARD_KEY) !== '0';
  } catch {
    return true;
  }
}

export function saveShowScoreboard(on: boolean): void {
  try {
    localStorage.setItem(SCOREBOARD_KEY, on ? '1' : '0');
  } catch {
    // 기억하지 못해도 이번에는 그대로 쓴다.
  }
}
