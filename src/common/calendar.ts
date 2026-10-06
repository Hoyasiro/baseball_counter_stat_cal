// 달력 보기에 쓰는 날짜 계산. 화면과 떼어 두어 테스트로 확인한다.
// 날짜는 경기 정보의 YYYY-MM-DD, 달은 YYYY-MM 글자로 다룬다. (시간대 영향을 피하려고 Date는 계산에만 쓴다)

import { Game, gameInfo } from './game';

const DAYS_PER_WEEK = 7;
const MONTHS_PER_YEAR = 12;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** "2026-10" → [2026, 10] */
function parseMonth(month: string): [number, number] {
  const [y, m] = month.split('-').map(Number);
  return [y, m];
}

/** 달을 옮긴다. 예: shiftMonth("2026-01", -1) = "2025-12" */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = parseMonth(month);
  const index = y * MONTHS_PER_YEAR + (m - 1) + delta;
  return `${Math.floor(index / MONTHS_PER_YEAR)}-${pad((index % MONTHS_PER_YEAR) + 1)}`;
}

export function monthOf(date: string): string {
  return date.slice(0, 7);
}

/** 화면용. 예: "2026년 10월" */
export function monthLabel(month: string): string {
  const [y, m] = parseMonth(month);
  return `${y}년 ${m}월`;
}

/** 일요일부터 시작하는 주 단위 달력. 그 달이 아닌 칸은 null */
export function monthGrid(month: string): (string | null)[][] {
  const [y, m] = parseMonth(month);
  const firstWeekday = new Date(y, m - 1, 1, 12).getDay();
  const days = new Date(y, m, 0, 12).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: days }, (_, i) => `${month}-${pad(i + 1)}`),
  ];
  while (cells.length % DAYS_PER_WEEK !== 0) cells.push(null);
  return Array.from({ length: cells.length / DAYS_PER_WEEK }, (_, w) => cells.slice(w * DAYS_PER_WEEK, (w + 1) * DAYS_PER_WEEK));
}

/** 날짜별 경기 (같은 날은 먼저 만든 경기 먼저) */
export function gamesByDate(games: readonly Game[]): Map<string, Game[]> {
  const byDate = new Map<string, Game[]>();
  for (const game of [...games].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const date = gameInfo(game).date;
    byDate.set(date, [...(byDate.get(date) ?? []), game]);
  }
  return byDate;
}

/** 그 달(YYYY-MM) 또는 그 해(YYYY)의 경기 */
export function gamesIn(games: readonly Game[], prefix: string): Game[] {
  return games.filter((g) => gameInfo(g).date.startsWith(prefix));
}

/** 그 해의 달별 경기 수 (1월 ~ 12월) */
export function monthlyCounts(games: readonly Game[], year: number): number[] {
  return Array.from({ length: MONTHS_PER_YEAR }, (_, i) => gamesIn(games, `${year}-${pad(i + 1)}`).length);
}
