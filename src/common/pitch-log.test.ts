import { describe, expect, it } from 'vitest';
import { LogEvent, activePitches, buildPlateAppearances } from './pitch-log';
import { pitches } from './test-helpers';

describe('타석 나누기', () => {
  it('볼 4개면 볼넷, 종료 카운트는 마지막 공 직전', () => {
    const [pa] = buildPlateAppearances(pitches('ball', 'strike', 'ball', 'ball', 'ball'));
    expect(pa.outcome).toBe('walk');
    expect(pa.endCount).toEqual({ balls: 3, strikes: 1 });
  });

  it('스트라이크 3개면 삼진', () => {
    const [pa] = buildPlateAppearances(pitches('strike', 'strike', 'strike'));
    expect(pa.outcome).toBe('strikeout');
    expect(pa.endCount).toEqual({ balls: 0, strikes: 2 });
  });

  it('2스트라이크 이후 파울은 카운트가 그대로다', () => {
    const [pa] = buildPlateAppearances(pitches('foul', 'foul', 'foul', 'foul'));
    expect(pa.outcome).toBeNull();
    expect(pa.currentCount).toEqual({ balls: 0, strikes: 2 });
  });

  it('초구 안타는 0-0에서 끝난다', () => {
    const [pa] = buildPlateAppearances(pitches('hit'));
    expect(pa.outcome).toBe('hit');
    expect(pa.endCount).toEqual({ balls: 0, strikes: 0 });
  });

  it('풀카운트에서 아웃', () => {
    const [pa] = buildPlateAppearances(pitches('ball', 'ball', 'ball', 'strike', 'strike', 'out'));
    expect(pa.endCount).toEqual({ balls: 3, strikes: 2 });
    expect(pa.outcome).toBe('out');
  });

  it('타석이 끝나면 다음 타석은 번호가 이어지고 0-0부터 시작한다', () => {
    const pas = buildPlateAppearances(pitches('hit', 'ball'));
    expect(pas.map((pa) => pa.number)).toEqual([1, 2]);
    expect(pas[1].outcome).toBeNull();
    expect(pas[1].currentCount).toEqual({ balls: 1, strikes: 0 });
  });

  it('취소한 공은 빠지지만 기록 자체는 지워지지 않는다', () => {
    const [a, b] = pitches('ball', 'strike');
    const events: LogEvent[] = [
      a,
      b,
      { kind: 'void', id: 'v1', createdAt: b.createdAt, author: '테스트', targetId: b.id },
    ];
    expect(activePitches(events)).toEqual([a]);
    expect(events).toHaveLength(3);
  });
});
