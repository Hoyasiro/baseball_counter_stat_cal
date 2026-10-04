import { describe, expect, it } from 'vitest';
import { replayGame } from './replay';
import { defaultRole, defaultSceneDraft } from './scene-setup-view';
import { appear, hit, pitches, settings } from './test-helpers';

describe('다음 장면 기본값 (후공: 우리 수비 초, 공격 말)', () => {
  it('처음에는 1회초 투수', () => {
    const r = replayGame([], settings());
    expect(defaultRole(r)).toBe('pitcher');
    expect(defaultSceneDraft(r, 'pitcher')).toMatchObject({ inning: 1, outs: 0 });
  });

  it('1회초를 3아웃으로 막으면 다음은 1회말 타자 (2회말 아님)', () => {
    const r = replayGame([appear('pitcher'), ...pitches('out', 'out', 'out')], settings());
    expect(r.state?.inning).toBe(2);
    expect(defaultRole(r)).toBe('batter');
    expect(defaultSceneDraft(r, 'batter').inning).toBe(1);
  });

  it('1회말 타석이 끝나면 다음은 2회초 투수', () => {
    const r = replayGame([appear('pitcher'), ...pitches('out', 'out', 'out'), appear('batter', { inning: 1 }), ...pitches('out')], settings());
    expect(defaultRole(r)).toBe('pitcher');
    expect(defaultSceneDraft(r, 'pitcher').inning).toBe(2);
  });

  it('던지는 중에 투수를 다시 고르면 지금 상황을 이어받는다', () => {
    const r = replayGame([appear('pitcher', { inning: 3 }), ...pitches('out'), hit('single')], settings());
    expect(defaultSceneDraft(r, 'pitcher')).toMatchObject({ inning: 3, outs: 1, bases: [true, false, false] });
  });

  it('선공이면 반대: 1회초 타석 뒤 투수는 1회말', () => {
    const r = replayGame([appear('batter'), ...pitches('out')], settings('us'));
    expect(defaultSceneDraft(r, 'pitcher').inning).toBe(1);
  });
});
