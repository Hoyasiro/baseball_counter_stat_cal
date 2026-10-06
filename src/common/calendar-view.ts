// 경기 탭의 달력 보기: 월 달력(경기 있는 날 표시)과 연도 보기(달별 경기 수). 고른 날·달의 경기 카드는 아래에 나온다.

import { gamesByDate, gamesIn, monthGrid, monthLabel, monthlyCounts, shiftMonth } from './calendar';
import { h } from './dom';
import { GAME_TYPES } from './events';
import { GAME_TYPE_LABEL, Game, dateLabel, gameInfo } from './game';
import { CALENDAR_LABEL } from './labels';

const WEEKDAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

export type CalendarZoom = 'month' | 'year';

export interface CalendarState {
  /** 보고 있는 달 YYYY-MM */
  readonly month: string;
  readonly zoom: CalendarZoom;
  /** 고른 날 YYYY-MM-DD. 없으면 그 달 전체 */
  readonly day: string | null;
}

export interface CalendarActions {
  change: (calendar: CalendarState) => void;
}

function header(title: string, onPrev: () => void, onNext: () => void, zoomButton: HTMLElement): HTMLElement {
  return h('div', { className: 'calendar-head' }, [
    h('button', { className: 'calendar-nav', text: '‹', attrs: { 'aria-label': '이전' }, onClick: onPrev }),
    h('strong', { text: title }),
    h('button', { className: 'calendar-nav', text: '›', attrs: { 'aria-label': '다음' }, onClick: onNext }),
    zoomButton,
  ]);
}

/** 한 줄 요약: 그 달(또는 날)에 아이가 한 것 */
function summaryBox(title: string, lines: readonly string[]): HTMLElement {
  return h('div', { className: 'calendar-summary' }, [
    h('p', { className: 'section-title', text: title }),
    ...(lines.length > 0 ? lines.map((line) => h('p', { text: line })) : [h('p', { className: 'help', text: '아직 아이 기록이 없어요.' })]),
  ]);
}

function monthView(games: readonly Game[], calendar: CalendarState, actions: CalendarActions): HTMLElement {
  const byDate = gamesByDate(games);
  const set = (change: Partial<CalendarState>): void => actions.change({ ...calendar, ...change });
  return h('div', { className: 'calendar-month' }, [
    header(
      monthLabel(calendar.month),
      () => set({ month: shiftMonth(calendar.month, -1), day: null }),
      () => set({ month: shiftMonth(calendar.month, 1), day: null }),
      h('button', { className: 'calendar-zoom', text: CALENDAR_LABEL.year, onClick: () => set({ zoom: 'year', day: null }) }),
    ),
    h('table', { className: 'calendar-grid' }, [
      h('thead', {}, [h('tr', {}, WEEKDAY_NAMES.map((d) => h('th', { text: d })))]),
      h(
        'tbody',
        {},
        monthGrid(calendar.month).map((week) =>
          h(
            'tr',
            {},
            week.map((date) => {
              if (!date) return h('td', {});
              const dayGames = byDate.get(date) ?? [];
              const picked = calendar.day === date;
              return h('td', {}, [
                h(
                  'button',
                  {
                    className: `calendar-day${dayGames.length > 0 ? ' has-games' : ''}${picked ? ' picked' : ''}`,
                    disabled: dayGames.length === 0,
                    attrs: { 'aria-label': `${dateLabel(date)}${dayGames.length > 0 ? ` 경기 ${dayGames.length}개` : ''}`, 'aria-pressed': picked ? 'true' : 'false' },
                    onClick: () => set({ day: picked ? null : date }),
                  },
                  [
                    h('span', { text: String(Number(date.slice(8))) }),
                    dayGames.length > 0
                      ? h('span', { className: 'calendar-dots' }, dayGames.map((g) => h('i', { className: `calendar-dot ${gameInfo(g).gameType}` })))
                      : null,
                  ],
                ),
              ]);
            }),
          ),
        ),
      ),
    ]),
    h(
      'p',
      { className: 'help calendar-legend' },
      GAME_TYPES.filter((t) => t !== 'other').map((t) => h('span', {}, [h('i', { className: `calendar-dot ${t}` }), GAME_TYPE_LABEL[t]])),
    ),
  ]);
}

function yearView(games: readonly Game[], calendar: CalendarState, actions: CalendarActions): HTMLElement {
  const year = Number(calendar.month.slice(0, 4));
  const counts = monthlyCounts(games, year);
  const most = Math.max(1, ...counts);
  const set = (change: Partial<CalendarState>): void => actions.change({ ...calendar, ...change });
  return h('div', { className: 'calendar-year' }, [
    header(
      `${year}년`,
      () => set({ month: shiftMonth(calendar.month, -12) }),
      () => set({ month: shiftMonth(calendar.month, 12) }),
      h('button', { className: 'calendar-zoom', text: CALENDAR_LABEL.month, onClick: () => set({ zoom: 'month' }) }),
    ),
    h(
      'div',
      { className: 'year-grid' },
      counts.map((count, i) => {
        const month = `${year}-${String(i + 1).padStart(2, '0')}`;
        // 경기가 많은 달일수록 진하게 (가장 많은 달 기준)
        const level = count === 0 ? 0 : Math.ceil((count / most) * 3);
        return h(
          'button',
          {
            className: `year-month level-${level}`,
            attrs: { 'aria-label': `${i + 1}월 경기 ${count}개` },
            onClick: () => set({ month, zoom: 'month', day: null }),
          },
          [h('strong', { text: `${i + 1}월` }), h('small', { text: count > 0 ? `${count}경기` : '-' })],
        );
      }),
    ),
  ]);
}

/**
 * 달력 보기. summaryOf는 경기 묶음의 아이 기록 한 줄 요약(투수·타자·수비 계산은 각 폴더에 있다),
 * card는 경기 카드를 그린다.
 */
export function calendarView(
  games: readonly Game[],
  calendar: CalendarState,
  actions: CalendarActions,
  summaryOf: (games: readonly Game[]) => string[],
  card: (game: Game) => HTMLElement,
): HTMLElement {
  if (calendar.zoom === 'year') {
    const year = calendar.month.slice(0, 4);
    const inYear = gamesIn(games, year);
    return h('div', { className: 'calendar' }, [yearView(games, calendar, actions), summaryBox(`${year}년 ${inYear.length}경기`, summaryOf(inYear))]);
  }
  const shown = calendar.day ? gamesIn(games, calendar.day) : gamesIn(games, calendar.month);
  const title = calendar.day ? `${dateLabel(calendar.day)} ${shown.length}경기` : `${monthLabel(calendar.month)} ${shown.length}경기`;
  return h('div', { className: 'calendar' }, [
    monthView(games, calendar, actions),
    summaryBox(title, summaryOf(shown)),
    ...shown.map(card),
    shown.length === 0 ? h('p', { className: 'empty', text: '이 달에는 경기가 없어요. ‹ › 로 다른 달을 보세요.' }) : null,
  ]);
}
