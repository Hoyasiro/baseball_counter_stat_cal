// 데이터 내려받기용 파일 만들기.
// - 백업(JSON): 저장된 기록 그대로. 나중에 다시 불러오거나 다른 곳으로 옮길 때 쓴다.
// - 표(CSV): 공 하나당 한 줄. 엑셀·구글 시트에서 열어 보기 좋게 쉬운 말로 적는다.

import { Count, countKey } from './count';
import { PitchEvent } from './events';
import { placementLabel, isInZone } from './field';
import { GAME_TYPE_LABEL, Game, gameInfo, opponentLabel } from './game';
import { halfInningLabel } from './innings';
import {
  ACTOR_LABEL,
  BATTED_BALL_STRENGTH_LABEL,
  BATTED_BALL_TYPE_LABEL,
  PITCH_TYPE_LABEL,
  outcomeLabel,
  pitchLabel,
} from './labels';
import { GameReplay, applyPitch } from './replay';

/** 백업 파일 형식 버전. 구조가 바뀌면 올린다. */
export const BACKUP_FORMAT_VERSION = 1;

export function backupJson(games: readonly Game[], exportedAt: string): string {
  return JSON.stringify({ app: 'baseball-counter', formatVersion: BACKUP_FORMAT_VERSION, exportedAt, games }, null, 2);
}

const CSV_HEADER = [
  '날짜',
  '상대팀',
  '경기 구분',
  '이닝',
  '타석 번호',
  '타자',
  '타석 안 몇 번째 공',
  '던지기 전 카운트',
  '결과',
  '구종',
  '구속(km/h)',
  '존 통과 지점 X',
  '존 통과 지점 Y',
  '존 안/밖',
  '타구 종류',
  '타구 세기',
  '낙구 지점 X',
  '낙구 지점 Y',
  '타구 방향',
  '타석 결과',
];

/** 쉼표·따옴표·줄바꿈이 있으면 따옴표로 감싼다. */
function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function pitchRow(game: Game, pa: GameReplay['plateAppearances'][number], pitch: PitchEvent, index: number, before: Count): string[] {
  const info = gameInfo(game);
  const ball = pitch.battedBall;
  const hasSpot = ball && ball.x !== null && ball.y !== null;
  return [
    info.date,
    opponentLabel(info.opponent),
    GAME_TYPE_LABEL[info.gameType],
    halfInningLabel(pa.inning, pa.half),
    String(pa.number),
    ACTOR_LABEL[pa.actor],
    String(index + 1),
    countKey(before),
    pitchLabel(pitch),
    pitch.pitchType ? PITCH_TYPE_LABEL[pitch.pitchType] : '',
    pitch.speed !== undefined ? String(pitch.speed) : '',
    pitch.zone ? String(round(pitch.zone.x)) : '',
    pitch.zone ? String(round(pitch.zone.y)) : '',
    pitch.zone ? (isInZone(pitch.zone) ? '안' : '밖') : '',
    ball?.type ? BATTED_BALL_TYPE_LABEL[ball.type] : '',
    ball?.strength ? BATTED_BALL_STRENGTH_LABEL[ball.strength] : '',
    hasSpot ? String(round(ball.x as number)) : '',
    hasSpot ? String(round(ball.y as number)) : '',
    hasSpot ? placementLabel(ball.x as number, ball.y as number) : '',
    outcomeLabel(pa),
  ].map(cell);
}

/** 공 하나당 한 줄. 엑셀이 한글을 바로 읽도록 맨 앞에 BOM을 붙인다. */
export function pitchesCsv(games: readonly Game[], replayOf: (g: Game) => GameReplay): string {
  const rows = [CSV_HEADER.map(cell).join(',')];
  for (const game of games) {
    for (const pa of replayOf(game).plateAppearances) {
      let count = pa.startCount;
      pa.pitches.forEach((pitch, i) => {
        rows.push(pitchRow(game, pa, pitch, i, count).join(','));
        count = applyPitch(count, pitch.result).next;
      });
    }
  }
  return `﻿${rows.join('\r\n')}\r\n`;
}

/** 파일 이름에 쓸 날짜. 예: 2026-10-05 */
export function exportFileName(kind: 'backup' | 'pitches', today: string): string {
  // 한글 파일 이름은 일부 브라우저가 버리고 "download"로 바꿔 확장자가 없어지므로 영문으로 짓는다.
  return kind === 'backup' ? `baseball-backup-${today}.json` : `baseball-pitches-${today}.csv`;
}
