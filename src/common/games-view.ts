// 경기 목록과 경기 정보 입력 화면 (공통)

import { h } from './dom';
import { GAME_TYPES, GameType, Team } from './events';
import { GAME_TYPE_LABEL, Game, GameInfo, dateLabel, gameInfo, opponentLabel } from './game';
import { DOWNLOAD_LABEL, IMPORT_LABEL } from './labels';
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
  download: (kind: 'backup' | 'pitches') => void;
  importBackup: (file: File) => void;
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

function formView(form: GameForm, hasGames: boolean, actions: GamesActions): HTMLElement {
  // 입력할 때마다 다시 그리면 키보드가 닫히므로, 값은 그때그때 담아 두고 저장할 때 한 번에 쓴다.
  let current = form;
  const update = (info: Partial<GameInfo>): void => {
    current = { ...current, info: { ...current.info, ...info } };
    actions.changeForm(current);
  };

  const dateInput = h('input', { attrs: { id: 'game-date', type: 'date', value: form.info.date } });
  dateInput.addEventListener('input', () => update({ date: dateInput.value }));

  const opponentInput = h('input', {
    attrs: { id: 'game-opponent', type: 'text', value: form.info.opponent, placeholder: '예: 서울 ○○초', autocomplete: 'off' },
  });
  opponentInput.addEventListener('input', () => update({ opponent: opponentInput.value }));

  return h('section', { className: 'game-form' }, [
    h('h2', { text: form.gameId ? '경기 정보 고치기' : '새 경기' }),
    hasGames ? null : h('p', { className: 'help', text: '먼저 오늘 경기 정보를 입력하세요. 나중에 고칠 수 있어요.' }),
    h('label', { attrs: { for: 'game-date' } }, ['날짜', dateInput]),
    h('label', { attrs: { for: 'game-opponent' } }, ['상대팀', opponentInput]),
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
    // 휴대폰을 바꾼 첫 화면에서도 예전 기록을 옮겨 올 수 있게 한다.
    hasGames ? null : h('div', { className: 'import-first' }, [h('p', { className: 'help', text: '예전에 내려받은 백업 파일이 있나요?' }), importButton(actions)]),
  ]);
}

/** 숨긴 파일 선택 칸을 버튼으로 연다. */
function importButton(actions: GamesActions): HTMLElement {
  const input = h('input', { className: 'visually-hidden', attrs: { type: 'file', accept: '.json,application/json', tabindex: '-1', 'aria-hidden': 'true' } });
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (file) actions.importBackup(file);
    input.value = '';
  });
  return h('div', {}, [
    input,
    h('button', { className: 'secondary', onClick: () => input.click() }, [
      h('strong', { text: IMPORT_LABEL }),
      h('small', { text: '지금 기록은 지우지 않고 합칩니다' }),
    ]),
  ]);
}

function downloadSection(actions: GamesActions): HTMLElement {
  return h('section', { className: 'download-section' }, [
    h('h2', { text: '데이터 내려받기' }),
    h('p', { className: 'help', text: '모든 경기 기록을 파일로 저장합니다. 휴대폰을 바꾸거나 브라우저 데이터를 지우기 전에 백업해 두세요.' }),
    h('button', { className: 'secondary', onClick: () => actions.download('backup') }, [
      h('strong', { text: DOWNLOAD_LABEL.json }),
      h('small', { text: '모든 기록을 그대로 저장 (보관·옮기기용)' }),
    ]),
    h('button', { className: 'secondary', onClick: () => actions.download('pitches') }, [
      h('strong', { text: DOWNLOAD_LABEL.csv }),
      h('small', { text: '공 하나당 한 줄 · 엑셀·구글 시트에서 열기' }),
    ]),
    h('h2', { text: '백업 불러오기' }),
    h('p', { className: 'help', text: '내려받아 둔 백업 파일(JSON)에서 기록을 가져옵니다. 이미 있는 경기는 늘어난 기록만 덧붙입니다.' }),
    importButton(actions),
  ]);
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

export function gamesView(
  games: readonly Game[],
  currentGameId: string | null,
  form: GameForm | null,
  actions: GamesActions,
  replayOf: (g: Game) => GameReplay,
): HTMLElement {
  if (form) return formView(form, games.length > 0, actions);
  const sorted = [...games].sort((a, b) => gameInfo(b).date.localeCompare(gameInfo(a).date) || b.createdAt.localeCompare(a.createdAt));
  return h('section', { className: 'games' }, [
    h('button', { className: 'primary new-game', text: '+ 새 경기', onClick: actions.openNew }),
    ...sorted.map((g) => gameCard(g, g.id === currentGameId, replayOf(g), actions)),
    games.length > 0 ? downloadSection(actions) : null,
  ]);
}
