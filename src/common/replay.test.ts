import { describe, expect, it } from 'vitest';
import { activeEvents, LogEvent } from './events';
import { replayGame } from './replay';
import { adjust, pitches, play } from './test-helpers';

const START = 1;

describe('카운트와 타석 결과', () => {
  it('볼 4개면 볼넷, 종료 카운트는 마지막 공 직전', () => {
    const { plateAppearances: [pa] } = replayGame(pitches('ball', 'strike', 'ball', 'ball', 'ball'), START);
    expect(pa.outcome).toBe('walk');
    expect(pa.endCount).toEqual({ balls: 3, strikes: 1 });
  });

  it('스트라이크 3개면 삼진', () => {
    const { plateAppearances: [pa] } = replayGame(pitches('strike', 'strike', 'strike'), START);
    expect(pa.outcome).toBe('strikeout');
    expect(pa.endCount).toEqual({ balls: 0, strikes: 2 });
  });

  it('2스트라이크 이후 일반 파울은 카운트가 그대로다', () => {
    const r = replayGame(pitches('foul', 'foul', 'foul', 'foul'), START);
    expect(r.plateAppearances[0].outcome).toBeNull();
    expect(r.state.count).toEqual({ balls: 0, strikes: 2 });
  });

  it('쓰리번트 아웃: 2스트라이크에서 번트 파울은 삼진', () => {
    const r = replayGame(pitches('strike', 'foul', 'buntFoul'), START);
    expect(r.plateAppearances[0].outcome).toBe('strikeout');
    expect(r.plateAppearances[0].endCount).toEqual({ balls: 0, strikes: 2 });
    expect(r.state.outs).toBe(1);
  });

  it('2스트라이크 전 번트 파울은 스트라이크 하나', () => {
    const r = replayGame(pitches('buntFoul'), START);
    expect(r.state.count).toEqual({ balls: 0, strikes: 1 });
  });

  it('와일드피치는 볼로 센다 (볼 4개째면 볼넷)', () => {
    const r = replayGame(pitches('ball', 'ball', 'ball', 'wildPitch'), START);
    expect(r.plateAppearances[0].outcome).toBe('walk');
  });

  it('초구 안타는 0-0에서 끝난다', () => {
    const { plateAppearances: [pa] } = replayGame(pitches('hit'), START);
    expect(pa.endCount).toEqual({ balls: 0, strikes: 0 });
  });

  it('풀카운트에서 아웃', () => {
    const { plateAppearances: [pa] } = replayGame(pitches('ball', 'ball', 'ball', 'strike', 'strike', 'out'), START);
    expect(pa.endCount).toEqual({ balls: 3, strikes: 2 });
    expect(pa.outcome).toBe('out');
  });
});

describe('주자 이동', () => {
  it('볼넷은 밀려나는 주자만 이동: 2루 주자만 있으면 1·2루', () => {
    const events = [adjust(1, 0, [false, true, false]), ...pitches('ball', 'ball', 'ball', 'ball')];
    expect(replayGame(events, START).state.bases).toEqual([true, true, false]);
  });

  it('안타는 주자 한 베이스씩, 타자는 1루 (1루 주자 → 1·2루)', () => {
    const events = [...pitches('hit'), ...pitches('hit')];
    expect(replayGame(events, START).state.bases).toEqual([true, true, false]);
  });

  it('와일드피치는 모든 주자 한 베이스씩 (1·3루 → 2루, 3루 주자 득점)', () => {
    const events = [adjust(1, 0, [true, false, true]), ...pitches('wildPitch')];
    const r = replayGame(events, START);
    expect(r.state.bases).toEqual([false, true, false]);
    expect(r.state.count).toEqual({ balls: 1, strikes: 0 });
  });

  it('2루 도루 성공: 1루 주자가 2루로, 카운트는 그대로', () => {
    const events = [...pitches('hit', 'ball'), play('stolenSecond')];
    const r = replayGame(events, START);
    expect(r.state.bases).toEqual([false, true, false]);
    expect(r.state.count).toEqual({ balls: 1, strikes: 0 });
    expect(r.plateAppearances[1].plays).toHaveLength(1);
  });

  it('2루 도루 실패: 1루 주자 아웃, 아웃 하나 추가', () => {
    const r = replayGame([...pitches('hit'), play('caughtStealingSecond')], START);
    expect(r.state.bases).toEqual([false, false, false]);
    expect(r.state.outs).toBe(1);
  });

  it('견제는 아무것도 바꾸지 않고, 견제 아웃은 고른 베이스의 주자를 지운다', () => {
    const events = [adjust(1, 0, [true, true, false]), play('pickoff'), play('pickoffOut', 1)];
    const r = replayGame(events, START);
    expect(r.state.bases).toEqual([true, false, false]);
    expect(r.state.outs).toBe(1);
  });
});

describe('이닝', () => {
  it('세 번째 아웃이면 다음 이닝, 아웃·주자 초기화', () => {
    const r = replayGame([...pitches('hit', 'out', 'out', 'out')], START);
    expect(r.state).toEqual({ inning: 2, outs: 0, bases: [false, false, false], count: { balls: 0, strikes: 0 } });
    expect(r.plateAppearances.map((pa) => pa.inning)).toEqual([1, 1, 1, 1]);
  });

  it('시작 이닝을 따른다 (3회부터 던짐)', () => {
    const r = replayGame(pitches('out'), 3);
    expect(r.plateAppearances[0].inning).toBe(3);
  });

  it('타석 도중 도루 실패로 세 번째 아웃이면 그 타석은 "이닝 종료로 중단"', () => {
    const events = [adjust(1, 2, [true, false, false]), ...pitches('ball'), play('caughtStealingSecond')];
    const r = replayGame(events, START);
    expect(r.plateAppearances[0].outcome).toBe('inningEnded');
    expect(r.plateAppearances[0].endCount).toBeNull();
    expect(r.state.inning).toBe(2);
    expect(r.state.count).toEqual({ balls: 0, strikes: 0 });
  });

  it('병살: 아웃 뒤 다음 공 전에 아웃을 고치면 방금 타석이 잡은 아웃으로 센다', () => {
    const events = [...pitches('hit', 'out'), adjust(1, 2, [false, false, false])];
    const r = replayGame(events, START);
    expect(r.plateAppearances).toHaveLength(2);
    expect(r.plateAppearances[1].outsRecorded).toBe(2);
    expect(r.state.outs).toBe(2);
  });

  it('고쳐서 3아웃을 넣으면 이닝이 끝난다', () => {
    const events = [...pitches('out', 'out'), adjust(1, 3, [false, false, false])];
    const r = replayGame(events, START);
    expect(r.state.inning).toBe(2);
    expect(r.plateAppearances[1].outsRecorded).toBe(2);
  });

  it('이닝을 직접 바꾸면 아웃은 잡은 것으로 세지 않는다', () => {
    const events = [...pitches('out'), adjust(4, 0, [false, false, false]), ...pitches('ball')];
    const r = replayGame(events, START);
    expect(r.state.inning).toBe(4);
    expect(r.plateAppearances.map((pa) => pa.outsRecorded)).toEqual([1, 0]);
    expect(r.plateAppearances[1].inning).toBe(4);
  });
});

describe('취소', () => {
  it('취소한 기록은 빠지지만 기록 자체는 지워지지 않는다', () => {
    const [a, b] = pitches('ball', 'strike');
    const events: LogEvent[] = [a, b, { kind: 'void', id: 'v1', createdAt: b.createdAt, author: '테스트', targetId: b.id }];
    expect(activeEvents(events)).toEqual([a]);
    expect(events).toHaveLength(3);
  });
});

describe('시작 상황', () => {
  it('첫 기록 전에 고친 아웃은 잡은 아웃이 아니다 (1아웃에 등판)', () => {
    const r = replayGame([adjust(3, 1, [true, false, false]), ...pitches('out')], 3);
    expect(r.plateAppearances[0].outsBefore).toBe(1);
    expect(r.plateAppearances[0].basesBefore).toEqual([true, false, false]);
    expect(r.plateAppearances[0].outsRecorded).toBe(1);
    expect(r.state.outs).toBe(2);
  });
});
