import { describe, expect, it } from 'vitest';
import { replayGame } from '../common/replay';
import { appear, hit, pitches, settings } from '../common/test-helpers';
import { batterLine } from './summary';
import { pitcherLine } from '../pitcher/summary';

const asGame = (events: Parameters<typeof replayGame>[0]) => [{ label: '10월 5일', replay: replayGame(events, settings()) }];

describe('한 경기 한 줄 요약', () => {
  it('타자: 3타수 1안타 1볼넷 (타석 4)', () => {
    const games = asGame([
      appear('batter', { inning: 1 }),
      hit('single'),
      appear('batter', { inning: 2 }),
      ...pitches('out'),
      appear('batter', { inning: 3 }),
      ...pitches('ball', 'ball', 'ball', 'ball'),
      appear('batter', { inning: 4 }),
      ...pitches('strike', 'strike', 'strike'),
    ]);
    expect(batterLine(games)).toBe('3타수 1안타 1볼넷');
    expect(pitcherLine(games)).toBeNull();
  });

  it('투수: 1이닝 5구 1삼진 0실점, 타석이 없으면 타자 요약 없음', () => {
    const games = asGame([appear('pitcher'), ...pitches('strike', 'strike', 'strike', 'out', 'out')]);
    expect(pitcherLine(games)).toBe('1이닝 5구 1삼진 0실점');
    expect(batterLine(games)).toBeNull();
  });
});
