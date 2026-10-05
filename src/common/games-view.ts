// 경기 목록과 경기 정보 입력 화면 (공통)

import { h } from './dom';
import { GAME_TYPES, GameType, Team } from './events';
import { GAME_TYPE_LABEL, Game, GameInfo, OPPONENT_MAX_LENGTH, dateLabel, gameInfo, opponentLabel, recentOpponents, shiftDate, today } from './game';
import { GAME_ORDER_LABEL, IMPORT_LABEL } from './labels';
import { GAME_ORDERS, GameOrder, GameTypeFilter, filterGames, sortGames } from './game-list';
import { GameReplay } from './replay';

export interface GameForm {
  /** 새 경기면 null */
  readonly gameId: string | null;
  readonly info: GameInfo;
  readonly error: string | null;
}

export interface GamesActions {
  select: (id: string) => void;
  openNew: () => void;
  openEdit: (game: Game) => void;
  changeForm: (form: GameForm) => void;
  cancelForm: () => void;
  saveForm: (form: GameForm) => void;
  /** 설정 탭(데이터 관리)으로 가기 */
  openSettings: () => void;
  changeList: (list: GameListView) => void;
}

/** 경기 목록을 어떻게 보여줄지 (정렬·찾기) */
export interface GameListView {
  readonly order: GameOrder;
  readonly type: GameTypeFilter;
  readonly query: string;
}


/** 버튼 여러 개 중 하나를 고르는 줄. 다시 그리지 않고 선택 표시만 바꾼다. */
function picker<T extends string>(options: readonly [T, string][], selected: T, onSelect: (v: T) => void, className: string): HTMLElement {
  const buttons = options.map(([value, label]) =>
    h('button', { className: value === selected ? 'active' : '', text: label, attrs: { type: 'button', 'data-value': value } }),
  );
  buttons.forEach((b) =>
    b.addEventListener('click', () => {
      onSelect(b.dataset.value as T);
      buttons.forEach((x) => x.classList.toggle('active', x === b));
    }),
  );
  return h('div', { className }, buttons);
}

function formView(form: GameForm, hasGames: boolean, opponents: readonly string[], actions: GamesActions): HTMLElement {
  // 입력할 때마다 다시 그리면 키보드가 닫히므로, 값은 그때그때 담아 두고 저장할 때 한 번에 쓴다.
  let current = form;
  const update = (info: Partial<GameInfo>): void => {
    current = { ...current, info: { ...current.info, ...info } };
    actions.changeForm(current);
  };

  const dateInput = h('input', { attrs: { id: 'game-date', type: 'date', value: form.info.date } });
  dateInput.addEventListener('input', () => update({ date: dateInput.value }));

  const opponentInput = h('input', {
    attrs: {
      id: 'game-opponent',
      type: 'text',
      value: form.info.opponent,
      placeholder: '예: 서울 ○○초',
      autocomplete: 'off',
      enterkeyhint: 'done',
      maxlength: String(OPPONENT_MAX_LENGTH),
    },
  });
  opponentInput.addEventListener('input', () => update({ opponent: opponentInput.value }));

  // 키보드를 열지 않아도 되게: 날짜는 오늘·어제를, 상대팀은 예전에 입력한 이름을 눌러 고른다.
  const todayText = today();
  const dateChips = quickChips(
    [
      [todayText, '오늘'],
      [shiftDate(todayText, -1), '어제'],
    ],
    form.info.date,
    (date) => {
      dateInput.value = date;
      update({ date });
    },
  );
  const opponentChips =
    opponents.length > 0
      ? quickChips(
          opponents.map((name) => [name, name] as [string, string]),
          form.info.opponent.trim(),
          (name) => {
            opponentInput.value = name;
            update({ opponent: name });
          },
        )
      : null;

  return h('section', { className: 'game-form' }, [
    h('h2', { text: form.gameId ? '경기 정보 고치기' : '새 경기' }),
    hasGames ? null : h('p', { className: 'help', text: '먼저 오늘 경기 정보를 입력하세요. 나중에 고칠 수 있어요.' }),
    h('label', { attrs: { for: 'game-date' } }, ['날짜', dateInput]),
    dateChips,
    h('label', { attrs: { for: 'game-opponent' } }, ['상대팀', opponentInput]),
    opponentChips ? h('p', { className: 'help quick-help', text: '예전 상대팀을 누르면 바로 들어가요' }) : null,
    opponentChips,
    h('div', { className: 'field' }, [
      h('span', { text: '경기 구분' }),
      picker<GameType>(GAME_TYPES.map((t) => [t, GAME_TYPE_LABEL[t]]), form.info.gameType, (t) => update({ gameType: t }), 'type-picker'),
    ]),
    h('div', { className: 'field' }, [
      h('span', { text: '우리 팀 공격 순서' }),
      picker<Team>(
        [
          ['us', '선공 (초에 공격)'],
          ['them', '후공 (말에 공격)'],
        ],
        form.info.battingFirst,
        (t) => update({ battingFirst: t }),
        'type-picker',
      ),
    ]),
    form.error ? h('p', { className: 'error', text: form.error, attrs: { role: 'alert' } }) : null,
    h('div', { className: 'confirm-buttons' }, [
      hasGames ? h('button', { className: 'secondary', text: '취소', onClick: actions.cancelForm }) : null,
      h('button', { className: 'primary', text: form.gameId ? '저장' : '경기 시작', onClick: () => actions.saveForm(current) }),
    ]),
    // 휴대폰을 바꾼 첫 화면에서도 예전 기록을 옮겨 올 수 있게 데이터 관리로 안내한다.
    hasGames
      ? null
      : h('div', { className: 'import-first' }, [
          h('p', { className: 'help', text: '예전에 내려받은 백업 파일이 있나요?' }),
          h('button', { className: 'secondary', onClick: actions.openSettings }, [
            h('strong', { text: `설정 › 데이터 관리에서 ${IMPORT_LABEL}` }),
            h('small', { text: '지금 기록은 지우지 않고 합칩니다' }),
          ]),
        ]),
  ]);
}

/** 누르면 입력 칸에 바로 들어가는 작은 단추 줄 */
function quickChips(options: readonly [string, string][], selected: string, onPick: (value: string) => void): HTMLElement {
  const buttons = options.map(([value, label]) =>
    h('button', { className: value === selected ? 'active' : '', text: label, attrs: { type: 'button', 'data-value': value } }),
  );
  buttons.forEach((b) =>
    b.addEventListener('click', () => {
      onPick(b.dataset.value ?? '');
      buttons.forEach((x) => x.classList.toggle('active', x === b));
    }),
  );
  return h('div', { className: 'quick-chips' }, buttons);
}

function gameCard(game: Game, isCurrent: boolean, replay: GameReplay, actions: GamesActions): HTMLElement {
  const info = gameInfo(game);
  const pitched = replay.plateAppearances.filter((pa) => pa.actor === 'opponent');
  const pitches = pitched.reduce((n, pa) => n + pa.pitches.length, 0);
  const batted = replay.plateAppearances.filter((pa) => pa.actor === 'child' && pa.outcome !== null).length;
  return h('article', { className: `game-card${isCurrent ? ' current' : ''}` }, [
    h('div', { className: 'game-card-head' }, [
      h('h3', { text: dateLabel(info.date) }),
      h('span', { className: `type-chip ${info.gameType}`, text: GAME_TYPE_LABEL[info.gameType] }),
    ]),
    h('p', { className: 'opponent', text: `상대: ${opponentLabel(info.opponent)} · ${info.battingFirst === 'us' ? '선공' : '후공'}` }),
    h('p', { className: 'sub', text: `장면 ${replay.scenes.length} · 투구 ${pitches}개 · 타석 ${batted}` }),
    game.copiedFrom ? h('p', { className: 'sub', text: '백업에서 불러온 사본 (같은 경기가 다르게 기록되어 있어 따로 만듦)' }) : null,
    h('div', { className: 'confirm-buttons' }, [
      h('button', { className: 'secondary', text: '정보 고치기', onClick: () => actions.openEdit(game) }),
      h('button', { className: 'primary', text: isCurrent ? '기록 중 · 이어서' : '이 경기 기록하기', onClick: () => actions.select(game.id) }),
    ]),
  ]);
}

/** 찾는 말은 칠 때마다 다시 그리면 키보드가 닫히므로, 목록 부분만 바꿔 그린다. */
function listControls(list: GameListView, onQuery: (query: string) => void, actions: GamesActions): HTMLElement {
  const search = h('input', {
    attrs: {
      id: 'game-search',
      type: 'search',
      value: list.query,
      placeholder: '상대팀 · 날짜(예: 10월) · 경기 구분',
      autocomplete: 'off',
      enterkeyhint: 'search',
      'aria-label': '경기 찾기',
    },
  });
  search.addEventListener('input', () => onQuery(search.value));
  const types: [GameTypeFilter, string][] = [['all', '전체'], ...GAME_TYPES.map((t): [GameTypeFilter, string] => [t, GAME_TYPE_LABEL[t]])];
  return h('div', { className: 'list-controls' }, [
    search,
    h(
      'div',
      { className: 'quick-chips', attrs: { role: 'group', 'aria-label': '경기 구분으로 거르기' } },
      types.map(([value, label]) =>
        h('button', { className: list.type === value ? 'active' : '', text: label, onClick: () => actions.changeList({ ...list, type: value }) }),
      ),
    ),
    h(
      'div',
      { className: 'order-picker', attrs: { role: 'group', 'aria-label': '정렬' } },
      GAME_ORDERS.map((order) =>
        h('button', { className: list.order === order ? 'active' : '', text: GAME_ORDER_LABEL[order], onClick: () => actions.changeList({ ...list, order }) }),
      ),
    ),
  ]);
}

export function gamesView(
  games: readonly Game[],
  currentGameId: string | null,
  form: GameForm | null,
  list: GameListView,
  actions: GamesActions,
  replayOf: (g: Game) => GameReplay,
): HTMLElement {
  if (form) return formView(form, games.length > 0, recentOpponents(games), actions);
  const cards = h('div', { className: 'game-list', attrs: { 'aria-live': 'polite' } });
  const showList = (query: string): void => {
    const shown = sortGames(filterGames(games, query, list.type), list.order);
    cards.replaceChildren(
      h('p', { className: 'help list-count', text: shown.length === games.length ? `경기 ${games.length}개` : `경기 ${games.length}개 중 ${shown.length}개` }),
      ...shown.map((g) => gameCard(g, g.id === currentGameId, replayOf(g), actions)),
    );
    if (shown.length === 0 && games.length > 0) cards.append(h('p', { className: 'empty', text: '찾는 경기가 없어요. 찾는 말이나 경기 구분을 바꿔 보세요.' }));
  };
  showList(list.query);
  return h('section', { className: 'games' }, [
    h('button', { className: 'primary new-game', text: '+ 새 경기', onClick: actions.openNew }),
    games.length > 0
      ? listControls(
          list,
          (query) => {
            actions.changeList({ ...list, query });
            showList(query);
          },
          actions,
        )
      : null,
    cards,
  ]);
}
