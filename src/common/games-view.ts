// 경기 목록과 경기 정보 입력 화면 (공통)

import { RULE_LIMITS, Rules, isDefaultRules } from './count';
import { h } from './dom';
import { GAME_TYPES, GameType, Team } from './events';
import { GAME_TYPE_LABEL, Game, GameInfo, dateLabel, gameInfo, opponentLabel } from './game';
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
}

const RULE_LABEL: Record<keyof Rules, string> = {
  ballsForWalk: '볼넷이 되는 볼 수',
  strikesForStrikeout: '삼진이 되는 스트라이크 수',
  outsPerInning: '한 이닝 아웃 수',
};

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

  const ruleRow = (key: keyof Rules): HTMLElement => {
    const value = h('strong', { text: String(form.info.rules[key]) });
    const step = (delta: number): void => {
      const limits = RULE_LIMITS[key];
      const next = Math.min(limits.max, Math.max(limits.min, current.info.rules[key] + delta));
      update({ rules: { ...current.info.rules, [key]: next } });
      value.textContent = String(next);
    };
    return h('div', { className: 'stepper' }, [
      h('span', { text: RULE_LABEL[key] }),
      h('button', { text: '−', onClick: () => step(-1), attrs: { type: 'button', 'aria-label': `${RULE_LABEL[key]} 줄이기` } }),
      value,
      h('button', { text: '+', onClick: () => step(1), attrs: { type: 'button', 'aria-label': `${RULE_LABEL[key]} 늘리기` } }),
    ]);
  };

  const rules = h('details', { className: 'rules', attrs: isDefaultRules(form.info.rules) ? {} : { open: '' } }, [
    h('summary', { text: '경기 규칙 바꾸기 (연습경기 등)' }),
    h('p', { className: 'help', text: '정식 규칙은 볼 4개 볼넷, 스트라이크 3개 삼진, 3아웃입니다. 연습경기에서 다르게 하면 맞춰 주세요.' }),
    ruleRow('ballsForWalk'),
    ruleRow('strikesForStrikeout'),
    ruleRow('outsPerInning'),
  ]);

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
    rules,
    form.error ? h('p', { className: 'error', text: form.error, attrs: { role: 'alert' } }) : null,
    h('div', { className: 'confirm-buttons' }, [
      hasGames ? h('button', { className: 'secondary', text: '취소', onClick: actions.cancelForm }) : null,
      h('button', { className: 'primary', text: form.gameId ? '저장' : '경기 시작', onClick: () => actions.saveForm(current) }),
    ]),
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
    h('p', { className: 'sub', text: `장면 ${replay.scenes.length} · 투구 ${pitches}개 · 타석 ${batted}${isDefaultRules(info.rules) ? '' : ' · 규칙 바꿈'}` }),
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
  ]);
}
