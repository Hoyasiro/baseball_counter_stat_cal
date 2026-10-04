import { describe, expect, it } from 'vitest';
import { DEFAULT_RULES } from './count';
import { Game, gameInfo, upgradeLegacyGame } from './game';
import { LogEvent } from './events';

const legacyPitch: LogEvent = { kind: 'pitch', id: 'p1', createdAt: '2026-10-01T00:00:00.000Z', author: '나', result: 'ball' };

describe('예전 기록 읽기', () => {
  it('경기 정보도 등장도 없던 첫 버전: 날짜와 "1회 투수로 등장"을 붙인다', () => {
    const game: Game = { id: 'g', createdAt: '2026-10-01T09:00:00.000Z', author: '나', events: [legacyPitch] };
    const up = upgradeLegacyGame(game);
    expect(up.events.map((e) => e.kind)).toEqual(['gameInfo', 'appearance', 'pitch']);
    expect(gameInfo(up)).toMatchObject({ date: '2026-10-01', battingFirst: 'them', rules: DEFAULT_RULES });
  });

  it('시작 이닝이 있던 두 번째 버전: 그 이닝에 투수로 등장', () => {
    const info: LogEvent = { kind: 'gameInfo', id: 'i', createdAt: 'x', author: '나', date: '2026-10-02', opponent: 'A', gameType: 'practice', startInning: 3 };
    const up = upgradeLegacyGame({ id: 'g', createdAt: 'x', author: '나', events: [info, legacyPitch] });
    const appearance = up.events[1];
    expect(appearance.kind === 'appearance' && appearance.inning).toBe(3);
  });

  it('새로 만든 빈 경기에는 아무것도 붙이지 않는다', () => {
    const info: LogEvent = { kind: 'gameInfo', id: 'i', createdAt: 'x', author: '나', date: '2026-10-02', opponent: '', gameType: 'practice' };
    const game: Game = { id: 'g', createdAt: 'x', author: '나', events: [info] };
    expect(upgradeLegacyGame(game)).toBe(game);
  });
});
