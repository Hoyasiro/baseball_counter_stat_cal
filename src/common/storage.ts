// 데모 단계는 브라우저 로컬 저장소에 저장한다. (CLAUDE.md 5.4)

import { Game, isGame } from './game';

export type LoadResult =
  | { readonly ok: true; readonly games: Game[] }
  | { readonly ok: false; readonly games: Game[]; readonly message: string };

export function loadGames(key: string): LoadResult {
  let raw: string | null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return { ok: false, games: [], message: '이 브라우저에서는 기록을 저장할 수 없습니다.' };
  }
  if (raw === null) return { ok: true, games: [] };

  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every(isGame)) return { ok: true, games: parsed };
  } catch {
    // 아래에서 같은 메시지로 알린다.
  }
  return { ok: false, games: [], message: '저장된 기록을 읽을 수 없습니다. 새 경기로 시작합니다.' };
}

export function saveGames(key: string, games: readonly Game[]): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(games));
    return true;
  } catch {
    return false;
  }
}
