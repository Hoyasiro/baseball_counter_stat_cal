// 백업 파일(JSON) 불러오기. 지금 있는 기록은 지우거나 덮어쓰지 않고 합치기만 한다. (CLAUDE.md 5.3)
// - 처음 보는 경기: 새로 더한다.
// - 같은 경기인데 백업 쪽이 더 이어서 기록됨: 늘어난 기록만 뒤에 덧붙인다.
// - 같은 경기인데 백업이 이미 있는 기록과 같거나 짧음: 그대로 둔다.
// - 같은 경기인데 서로 다르게 기록됨(두 휴대폰에서 따로 고침 등): 한쪽을 버리지 않도록 사본으로 따로 더한다.

import { BACKUP_FORMAT_VERSION, BACKUP_APP_NAME } from './export';
import { Game, createId, isGame, upgradeLegacyGame } from './game';

export type BackupParseResult =
  | { readonly ok: true; readonly games: readonly Game[] }
  | { readonly ok: false; readonly message: string };

export function parseBackup(text: string): BackupParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, message: '파일을 읽을 수 없습니다. 이 앱에서 내려받은 백업 파일(JSON)인지 확인하세요.' };
  }
  if (typeof parsed !== 'object' || parsed === null || (parsed as Record<string, unknown>).app !== BACKUP_APP_NAME) {
    return { ok: false, message: '이 앱의 백업 파일이 아닙니다.' };
  }
  const backup = parsed as Record<string, unknown>;
  const version = backup.formatVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { ok: false, message: '백업 파일의 형식 정보가 잘못되었습니다.' };
  }
  if (version > BACKUP_FORMAT_VERSION) {
    return { ok: false, message: '더 새 버전의 앱에서 만든 백업 파일입니다. 앱을 새로 고친 뒤 다시 불러오세요.' };
  }
  const games = backup.games;
  if (!Array.isArray(games)) return { ok: false, message: '백업 파일에 경기 기록이 없습니다.' };
  const broken = games.findIndex((g) => !isGame(g));
  if (broken >= 0) return { ok: false, message: `백업 파일의 ${broken + 1}번째 경기 기록이 망가져 있어 불러오지 않았습니다.` };
  return { ok: true, games: (games as Game[]).map(upgradeLegacyGame) };
}

export interface MergeResult {
  readonly games: readonly Game[];
  /** 새로 더한 경기 수 */
  readonly added: number;
  /** 늘어난 기록을 덧붙인 경기 수 */
  readonly extended: number;
  /** 이미 있어서 그대로 둔 경기 수 */
  readonly unchanged: number;
  /** 서로 달라서 사본으로 더한 경기 수 */
  readonly copied: number;
}

/** a의 이벤트가 b의 앞부분과 같은지 (이벤트는 덧붙이기만 하므로 id 순서로 비교한다) */
function isPrefixOf(a: Game, b: Game): boolean {
  return a.events.length <= b.events.length && a.events.every((e, i) => e.id === b.events[i].id);
}

export function mergeGames(current: readonly Game[], incoming: readonly Game[]): MergeResult {
  const games = [...current];
  let added = 0;
  let extended = 0;
  let unchanged = 0;
  let copied = 0;
  for (const game of incoming) {
    const index = games.findIndex((g) => g.id === game.id);
    if (index < 0) {
      games.push(game);
      added++;
    } else if (isPrefixOf(game, games[index])) {
      unchanged++;
    } else if (isPrefixOf(games[index], game)) {
      const existing = games[index];
      games[index] = { ...existing, events: [...existing.events, ...game.events.slice(existing.events.length)] };
      extended++;
    } else {
      games.push({ ...game, id: createId(), copiedFrom: game.id });
      copied++;
    }
  }
  return { games, added, extended, unchanged, copied };
}

/** 합친 결과를 쉬운 말로 */
export function mergeSummary(result: MergeResult): string {
  const parts = [
    result.added > 0 ? `새 경기 ${result.added}개를 더했습니다` : '',
    result.extended > 0 ? `경기 ${result.extended}개에 이어진 기록을 덧붙였습니다` : '',
    result.copied > 0 ? `지금 기록과 다른 경기 ${result.copied}개는 지우지 않도록 따로 하나 더 만들었습니다` : '',
    result.unchanged > 0 ? `이미 있는 경기 ${result.unchanged}개는 그대로 두었습니다` : '',
  ].filter((p) => p !== '');
  return parts.length > 0 ? `불러오기 완료: ${parts.join(', ')}.` : '백업 파일에 경기가 없습니다.';
}
