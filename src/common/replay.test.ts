import { describe, expect, it } from 'vitest';
import { activeEvents, LogEvent, PlayLogEvent } from './events';
import { replayGame } from './replay';
import { adjust, appear, exit, hit, pitches, play, settings } from './test-helpers';

/** 1회 선발 투수로 등장한 뒤의 기록 */
const asPitcher = (...events: PlayLogEvent[]) => replayGame([appear('pitcher'), ...events], settings());

describe('카운트와 타석 결과 (투수 장면)', () => {
  it('볼 4개면 볼넷, 종료 카운트는 마지막 공 직전', () => {
    const { plateAppearances: [pa] } = asPitcher(...pitches('ball', 'strike', 'ball', 'ball', 'ball'));
    expect(pa.outcome).toBe('walk');
    expect(pa.endCount).toEqual({ balls: 3, strikes: 1 });
    expect(pa.actor).toBe('opponent');
  });

  it('스트라이크 3개면 삼진', () => {
    const { plateAppearances: [pa] } = asPitcher(...pitches('strike', 'strike', 'strike'));
    expect(pa.outcome).toBe('strikeout');
  });

  it('2스트라이크 이후 일반 파울은 카운트가 그대로다', () => {
    expect(asPitcher(...pitches('foul', 'foul', 'foul', 'foul')).state?.count).toEqual({ balls: 0, strikes: 2 });
  });

  it('쓰리번트 아웃: 2스트라이크에서 번트 파울은 삼진', () => {
    const r = asPitcher(...pitches('strike', 'foul', 'buntFoul'));
    expect(r.plateAppearances[0].outcome).toBe('strikeout');
    expect(r.state?.outs).toBe(1);
  });

  it('2스트라이크 전 번트 파울은 스트라이크 하나', () => {
    expect(asPitcher(...pitches('buntFoul')).state?.count).toEqual({ balls: 0, strikes: 1 });
  });

  it('와일드피치는 볼로 센다 (볼 4개째면 볼넷)', () => {
    expect(asPitcher(...pitches('ball', 'ball', 'ball', 'wildPitch')).plateAppearances[0].outcome).toBe('walk');
  });

  it('초구 안타는 0-0, 풀카운트 아웃은 3-2에서 끝난다', () => {
    expect(asPitcher(hit('single')).plateAppearances[0].endCount).toEqual({ balls: 0, strikes: 0 });
    const full = asPitcher(...pitches('ball', 'ball', 'ball', 'strike', 'strike', 'out'));
    expect(full.plateAppearances[0].endCount).toEqual({ balls: 3, strikes: 2 });
  });
});

describe('주자 이동과 득점', () => {
  it('볼넷은 밀려나는 주자만: 2루 주자만 있으면 1·2루', () => {
    const r = asPitcher(adjust(1, 0, [false, true, false]), ...pitches('ball', 'ball', 'ball', 'ball'));
    expect(r.state?.bases).toEqual([true, true, false]);
  });

  it('주자 1·2루 3루타: 2점, 타자는 3루', () => {
    const r = asPitcher(adjust(1, 0, [true, true, false]), hit('triple'));
    expect(r.plateAppearances[0].runs).toBe(2);
    expect(r.state?.bases).toEqual([false, false, true]);
  });

  it('만루 홈런 4점, 만루 밀어내기 1점, 3루 주자 와일드피치 1점', () => {
    expect(asPitcher(adjust(1, 0, [true, true, true]), hit('homeRun')).plateAppearances[0].runs).toBe(4);
    expect(asPitcher(adjust(1, 0, [true, true, true]), ...pitches('ball', 'ball', 'ball', 'ball')).plateAppearances[0].runs).toBe(1);
    expect(asPitcher(adjust(1, 0, [false, false, true]), ...pitches('wildPitch')).plateAppearances[0].runs).toBe(1);
  });

  it('실책 출루: 1루로, 실책 1개 / 실책 진루 뒤 고치기로 득점', () => {
    expect(asPitcher(...pitches('reachedOnError')).plateAppearances[0].errors).toBe(1);
    const r = asPitcher(adjust(1, 0, [false, false, true]), ...pitches('ball'), play('error'), adjust(1, 0, [false, false, false], 1));
    expect(r.plateAppearances[0].errors).toBe(1);
    expect(r.plateAppearances[0].runs).toBe(1);
  });

  it('도루: 3루·홈 도루, 도루 실패 아웃, 견제는 그대로', () => {
    const steal = asPitcher(adjust(1, 0, [false, true, false]), play('stolenBase', 1), play('stolenBase', 2));
    expect(steal.state?.bases).toEqual([false, false, false]);
    expect(steal.plateAppearances[0].runs).toBe(1);
    const caught = asPitcher(adjust(1, 0, [true, true, false]), play('caughtStealing', 1));
    expect(caught.state?.bases).toEqual([true, false, false]);
    expect(caught.state?.outs).toBe(1);
    expect(asPitcher(adjust(1, 0, [true, true, false]), play('pickoff', 1)).state?.bases).toEqual([true, true, false]);
  });

  it('예전 기록의 2루 도루와 종류 없는 안타도 읽는다', () => {
    const r = asPitcher(...pitches('hit'), play('stolenSecond'));
    expect(r.plateAppearances[0].hitType).toBe('single');
    expect(r.state?.bases).toEqual([false, true, false]);
  });
});

describe('투수 장면의 이닝', () => {
  it('3아웃이면 다음 이닝 같은 쪽(초)으로 이어진다', () => {
    const r = asPitcher(...pitches('out', 'out', 'out'));
    expect(r.state).toMatchObject({ role: 'pitcher', inning: 2, half: 'top', outs: 0 });
  });

  it('중계: 4회말 1아웃 1·3루, 볼 2 · 스트라이크 1에서 등판 (선공 팀)', () => {
    const r = replayGame(
      [appear('pitcher', { inning: 4, outs: 1, bases: [true, false, true], balls: 2, strikes: 1 }), ...pitches('ball', 'ball')],
      settings('us'),
    );
    const pa = r.plateAppearances[0];
    expect(pa).toMatchObject({ inning: 4, half: 'bottom', outsBefore: 1, outcome: 'walk' });
    expect(pa.startCount).toEqual({ balls: 2, strikes: 1 });
    expect(pa.runs).toBe(0);
    expect(r.state?.bases).toEqual([true, true, true]);
  });

  it('타석 도중 도루 실패로 3아웃이면 "이닝 종료로 중단"', () => {
    const r = asPitcher(adjust(1, 2, [true, false, false]), ...pitches('ball'), play('caughtStealingSecond'));
    expect(r.plateAppearances[0].outcome).toBe('inningEnded');
    expect(r.state?.inning).toBe(2);
  });

  it('병살: 다음 공 전에 아웃을 고치면 방금 타석이 잡은 아웃', () => {
    const r = asPitcher(hit('single'), ...pitches('out'), adjust(1, 2, [false, false, false]));
    expect(r.plateAppearances[1].outsRecorded).toBe(2);
  });

  it('첫 기록 전에 고친 아웃은 시작 상황 (잡은 아웃 아님)', () => {
    const r = asPitcher(adjust(1, 1, [true, false, false]), ...pitches('out'));
    expect(r.plateAppearances[0].outsBefore).toBe(1);
    expect(r.plateAppearances[0].outsRecorded).toBe(1);
  });

  it('교체되면 장면이 끝나고, 던지던 타석은 중단', () => {
    const r = asPitcher(...pitches('ball'), exit());
    expect(r.state).toBeNull();
    expect(r.plateAppearances[0].outcome).toBe('sceneEnded');
    expect(r.scenes[0].endedBy).toBe('exit');
  });
});

describe('타자·주자 장면 (우리 아이)', () => {
  it('아이 타석이 안타면 주자가 되어 장면이 이어진다', () => {
    const r = replayGame([appear('batter', { inning: 2 }), hit('double')], settings());
    expect(r.plateAppearances[0]).toMatchObject({ actor: 'child', half: 'bottom', hitType: 'double' });
    expect(r.state).toMatchObject({ role: 'runner', childBase: 1 });
  });

  it('아이가 아웃이면 장면이 끝난다', () => {
    const r = replayGame([appear('batter'), ...pitches('strike', 'strike', 'strike')], settings());
    expect(r.state).toBeNull();
    expect(r.scenes[0].endedBy).toBe('childDone');
  });

  it('주자인 아이: 뒤 타자 1루타에 한 칸 진루, 2루타에 득점', () => {
    const events = [appear('batter'), ...pitches('ball', 'ball', 'ball', 'ball'), hit('single')];
    const r = replayGame(events, settings());
    expect(r.state?.childBase).toBe(1);
    expect(r.plateAppearances[1].actor).toBe('teammate');
    const r2 = replayGame([...events, hit('double')], settings());
    expect(r2.state).toBeNull();
    expect(r2.runnerEvents.map((e) => e.kind)).toEqual(['scored']);
  });

  it('대주자: 2루에 등장해 3루 도루 성공, 견제 받고, 한 칸 진루(고치기)로 득점', () => {
    const r = replayGame(
      [
        appear('runner', { inning: 5, outs: 1, bases: [true, false, false], childBase: 1 }),
        play('stolenBase', 1),
        play('pickoff', 2),
        adjust(5, 1, [true, false, false], 1, 'scored'),
      ],
      settings(),
    );
    expect(r.runnerEvents.map((e) => e.kind)).toEqual(['stolenBase', 'pickoff', 'scored']);
    expect(r.state).toBeNull();
    expect(r.halves.get('5B')?.runs).toBe(1);
  });

  it('주자인 아이가 도루 실패하면 장면이 끝난다', () => {
    const r = replayGame([appear('runner', { childBase: 0 }), play('caughtStealing', 0)], settings());
    expect(r.runnerEvents[0].kind).toBe('caughtStealing');
    expect(r.state).toBeNull();
  });

  it('3아웃이면 베이스에 남은 아이는 잔루', () => {
    const r = replayGame([appear('runner', { outs: 2, childBase: 1 }), ...pitches('out')], settings());
    expect(r.runnerEvents.map((e) => e.kind)).toEqual(['stranded']);
    expect(r.scenes[0].endedBy).toBe('halfOver');
  });

  it('대타: 볼 1 · 스트라이크 2에서 등장', () => {
    const r = replayGame([appear('batter', { balls: 1, strikes: 2 }), ...pitches('strike')], settings());
    expect(r.plateAppearances[0]).toMatchObject({ outcome: 'strikeout', startCount: { balls: 1, strikes: 2 } });
  });

  it('수비 장면도 상대 타자 타석을 기록하고, 타석마다 아이의 수비 자리를 남긴다', () => {
    const r = replayGame([appear('fielder', { position: 'shortstop' }), ...pitches('ball', 'out')], settings());
    expect(r.state).toMatchObject({ role: 'fielder', position: 'shortstop', outs: 1 });
    expect(r.plateAppearances).toHaveLength(1);
    expect(r.plateAppearances[0]).toMatchObject({ actor: 'opponent', fieldingPosition: 'shortstop', outcome: 'out', outsRecorded: 1 });
  });

  it('수비 장면은 투수 장면처럼 3아웃이면 다음 이닝으로 이어진다', () => {
    const r = replayGame([appear('fielder', { position: 'centerField' }), ...pitches('out', 'out', 'out')], settings());
    expect(r.state).toMatchObject({ role: 'fielder', inning: 2, outs: 0 });
    expect(r.scenes[0].endedBy).toBeNull();
  });

  it('투수 장면의 타석은 수비 자리가 투수, 공격 장면은 없음(null)', () => {
    const r = replayGame([appear('pitcher'), ...pitches('out'), appear('batter', { inning: 1 }), ...pitches('out')], settings());
    expect(r.plateAppearances.map((pa) => pa.fieldingPosition)).toEqual(['pitcher', null]);
  });

  it('다음 등장이 오면 앞 장면은 끝난다', () => {
    const r = replayGame([appear('pitcher'), ...pitches('ball'), appear('batter', { inning: 1 })], settings());
    expect(r.scenes.map((s) => s.endedBy)).toEqual(['next', null]);
    expect(r.state?.role).toBe('batter');
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
