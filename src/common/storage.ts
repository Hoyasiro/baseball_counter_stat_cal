// 데모 단계는 브라우저 로컬 저장소에 저장한다. (CLAUDE.md 5.4)

import { Game, isGame, upgradeLegacyGame } from './game';

export type LoadResult =
  | { readonly ok: true; readonly games: Game[] }
  | { readonly ok: false; readonly games: Game[]; readonly message: string };

function readGames(key: string): Game[] | null | 'invalid' | 'unavailable' {
  let raw: string | null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return 'unavailable';
  }
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every(isGame)) return parsed;
  } catch {
    // 아래에서 'invalid'로 알린다.
  }
  return 'invalid';
}

/** key에 기록이 없으면 legacyKeys의 이전 버전 기록을 읽어 옮겨 온다. 이전 기록은 지우지 않는다. */
export function loadGames(key: string, legacyKeys: readonly string[] = []): LoadResult {
  for (const k of [key, ...legacyKeys]) {
    const games = readGames(k);
    if (games === 'unavailable') {
      return { ok: false, games: [], message: '이 브라우저에서는 기록을 저장할 수 없습니다.' };
    }
    if (games === 'invalid') {
      return { ok: false, games: [], message: '저장된 기록을 읽을 수 없습니다. 새 경기로 시작합니다.' };
    }
    if (games !== null) return { ok: true, games: games.map(upgradeLegacyGame) };
  }
  return { ok: true, games: [] };
}

export function saveGames(key: string, games: readonly Game[]): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(games));
    return true;
  } catch {
    return false;
  }
}

const TUTORIAL_SEEN_KEY = 'baseball-counter.tutorial-seen';

/** 처음 사용 안내를 이미 봤는지. 저장소를 못 쓰면 봤다고 보고 다시 띄우지 않는다. */
export function hasSeenTutorial(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_SEEN_KEY) === '1';
  } catch {
    return true;
  }
}

export function markTutorialSeen(): void {
  try {
    localStorage.setItem(TUTORIAL_SEEN_KEY, '1');
  } catch {
    // 저장하지 못해도 안내는 닫힌다. 다음에 다시 보일 뿐이다.
  }
}
