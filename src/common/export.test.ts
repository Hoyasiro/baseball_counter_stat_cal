import { describe, expect, it } from 'vitest';
import { activeEvents, playEvents } from './events';
import { backupJson, exportFileName, pitchesCsv } from './export';
import { Game, addAppearance, addPitch, createGame, gameInfo } from './game';
import { replayGame } from './replay';

const replayOf = (g: Game) => replayGame(playEvents(activeEvents(g.events)), { battingFirst: gameInfo(g).battingFirst });

function sampleGame(): Game {
  let g = createGame({ date: '2026-10-05', opponent: '서울 "A", 초', gameType: 'practice', battingFirst: 'them', venue: 'home', ourTeam: '' });
  g = addAppearance(g, { role: 'pitcher', inning: 1, outs: 0, bases: [false, false, false], balls: 0, strikes: 0 });
  g = addPitch(g, 'ball', { pitchType: 'fastball', speed: 98, zone: { x: 0.1, y: 0.5 } });
  g = addPitch(g, 'hit', { hitType: 'double', battedBall: { x: 0.8, y: 0.55, type: 'line', strength: 'hard' } });
  return g;
}

describe('표 파일(CSV)', () => {
  const csv = pitchesCsv([sampleGame()], replayOf);
  const lines = csv.replace('﻿', '').trim().split('\r\n');

  it('엑셀이 한글을 읽도록 BOM으로 시작하고, 머리줄 + 공 2줄', () => {
    expect(csv.startsWith('﻿')).toBe(true);
    expect(lines).toHaveLength(3);
    expect(lines[0].startsWith('날짜,상대팀')).toBe(true);
  });

  it('쉼표·따옴표가 든 상대팀 이름은 따옴표로 감싼다', () => {
    expect(lines[1]).toContain('"서울 ""A"", 초"');
  });

  it('첫 공: 던지기 전 0-0, 볼, 직구 98km/h, 존 밖', () => {
    expect(lines[1]).toContain(',1회초,1,상대 타자,1,0-0,볼,직구,98,0.1,0.5,밖,');
  });

  it('둘째 공: 던지기 전 1-0, 2루타, 라인드라이브 세게, 오른쪽 외야', () => {
    expect(lines[2]).toContain(',2,1-0,2루타,,,,,,라인드라이브,세게,0.8,0.55,오른쪽 외야,2루타,투수,');
  });

  it('수비 장면: 아이 수비 자리와 받은 수비 기록을 적는다', () => {
    let g = createGame({ date: '2026-10-05', opponent: '가팀', gameType: 'practice', battingFirst: 'them', venue: 'home', ourTeam: '' });
    g = addAppearance(g, { role: 'fielder', position: 'shortstop', inning: 1, outs: 0, bases: [false, false, false], balls: 0, strikes: 0 });
    g = addPitch(g, 'out', { fielding: ['putout', 'assist'] });
    const row = pitchesCsv([g], replayOf).replace('\ufeff', '').trim().split('\r\n')[1];
    expect(row.endsWith(',아웃,유격수,잡아서 아웃·던져서 아웃 도움')).toBe(true);
  });
});

describe('백업 파일(JSON)', () => {
  it('저장된 기록을 그대로 담는다', () => {
    const game = sampleGame();
    const parsed = JSON.parse(backupJson([game], '2026-10-05T00:00:00.000Z'));
    expect(parsed.formatVersion).toBe(1);
    expect(parsed.games[0]).toEqual(game);
  });

  it('파일 이름', () => {
    expect(exportFileName('backup', '2026-10-05')).toBe('baseball-backup-2026-10-05.json');
    expect(exportFileName('pitches', '2026-10-05')).toBe('baseball-pitches-2026-10-05.csv');
    expect(exportFileName('backupText', '2026-10-05')).toBe('baseball-backup-2026-10-05.txt');
  });
});
