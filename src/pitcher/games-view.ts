// 경기 목록과 경기 정보 입력 화면

import { h } from '../common/dom';
import { GAME_TYPES, GameType, MAX_INNING } from '../common/events';
import { formatInningsFromOuts } from '../common/format';
import { GAME_TYPE_LABEL, Game, GameInfo, dateLabel, gameInfo, opponentLabel } from '../common/game';
import { GameReplay } from '../common/replay';

export interface GameForm {
  /** 새 경기면 null */
  readonly gameId: string | null;
  readonly info: GameInfo;
  readonly error: string | null;
}

interface GamesActions {
  select: (id: string) => void;
  openNew: () => void;
  openEdit: (game: Game) => void;
  changeForm: (form: GameForm) => void;
  cancelForm: () => void;
  saveForm: (form: GameForm) => void;
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

  const typeButtons = GAME_TYPES.map((type) =>
    h('button', {
      className: type === form.info.gameType ? 'active' : '',
      text: GAME_TYPE_LABEL[type],
      attrs: { type: 'button', 'data-type': type },
    }),
  );
  const selectType = (type: GameType): void => {
    update({ gameType: type });
    typeButtons.forEach((b) => b.classList.toggle('active', b.dataset.type === type));
  };
  typeButtons.forEach((b) => b.addEventListener('click', () => selectType(b.dataset.type as GameType)));

  const inningValue = h('strong', { text: `${form.info.startInning}회` });
  const stepInning = (delta: number): void => {
    const next = Math.min(MAX_INNING, Math.max(1, current.info.startInning + delta));
    update({ startInning: next });
    inningValue.textContent = `${next}회`;
  };

  return h('section', { className: 'game-form' }, [
    h('h2', { text: form.gameId ? '경기 정보 고치기' : '새 경기' }),
    hasGames ? null : h('p', { className: 'help', text: '먼저 오늘 경기 정보를 입력하세요. 나중에 고칠 수 있어요.' }),
    h('label', { attrs: { for: 'game-date' } }, ['날짜', dateInput]),
    h('label', { attrs: { for: 'game-opponent' } }, ['상대팀', opponentInput]),
    h('div', { className: 'field' }, [h('span', { text: '경기 구분' }), h('div', { className: 'type-picker' }, typeButtons)]),
    h('div', { className: 'field' }, [
      h('span', { text: '몇 회부터 던지나요?' }),
      h('div', { className: 'stepper' }, [
        h('button', { text: '−', onClick: () => stepInning(-1), attrs: { type: 'button', 'aria-label': '이닝 줄이기' } }),
        inningValue,
        h('button', { text: '+', onClick: () => stepInning(1), attrs: { type: 'button', 'aria-label': '이닝 늘리기' } }),
      ]),
    ]),
    form.error ? h('p', { className: 'error', text: form.error, attrs: { role: 'alert' } }) : null,
    h('div', { className: 'confirm-buttons' }, [
      hasGames ? h('button', { className: 'secondary', text: '취소', onClick: actions.cancelForm }) : null,
      h('button', { className: 'primary', text: form.gameId ? '저장' : '경기 시작', onClick: () => actions.saveForm(current) }),
    ]),
  ]);
}

function gameCard(game: Game, isCurrent: boolean, replay: GameReplay, actions: GamesActions): HTMLElement {
  const info = gameInfo(game);
  const pitches = replay.plateAppearances.reduce((n, pa) => n + pa.pitches.length, 0);
  const outs = replay.plateAppearances.reduce((n, pa) => n + pa.outsRecorded, 0);
  return h('article', { className: `game-card${isCurrent ? ' current' : ''}` }, [
    h('div', { className: 'game-card-head' }, [
      h('h3', { text: dateLabel(info.date) }),
      h('span', { className: `type-chip ${info.gameType}`, text: GAME_TYPE_LABEL[info.gameType] }),
    ]),
    h('p', { className: 'opponent', text: `상대: ${opponentLabel(info.opponent)}` }),
    h('p', { className: 'sub', text: `투구 ${pitches}개 · ${formatInningsFromOuts(outs)}이닝 · ${info.startInning}회부터` }),
    h('div', { className: 'confirm-buttons' }, [
      h('button', { className: 'secondary', text: '정보 고치기', onClick: () => actions.openEdit(game) }),
      h('button', {
        className: 'primary',
        text: isCurrent ? '기록 중 · 이어서' : '이 경기 기록하기',
        onClick: () => actions.select(game.id),
      }),
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
  ]);
}
