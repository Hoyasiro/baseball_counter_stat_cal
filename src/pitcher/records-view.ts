// 투수 기록 보기 화면: 이닝별로 타석을 보여준다.

import { basesLabel } from '../common/bases';
import { countLabel } from '../common/count';
import { h } from '../common/dom';
import { PlayLogEvent } from '../common/events';
import { GAME_TYPE_LABEL, Game, dateLabel, gameInfo, opponentLabel } from '../common/game';
import { GameReplay, PlateAppearance } from '../common/replay';
import { OUTCOME_LABEL, eventLabel } from './labels';

function chip(event: PlayLogEvent): HTMLElement {
  const kindClass = event.kind === 'pitch' ? event.result : event.kind;
  return h('span', { className: `chip ${kindClass}`, text: eventLabel(event) });
}

function outcomeText(pa: PlateAppearance): string {
  if (pa.outcome === null) return '진행 중';
  const lastPitch = pa.pitches[pa.pitches.length - 1];
  if (pa.outcome === 'strikeout' && lastPitch?.result === 'buntFoul') return '삼진 (쓰리번트 아웃)';
  return OUTCOME_LABEL[pa.outcome];
}

function paCard(pa: PlateAppearance): HTMLElement {
  return h('article', { className: `pa${pa.outcome === null ? ' current' : ''}` }, [
    h('h3', { text: `${pa.number}번째 타석 · ${outcomeText(pa)}` }),
    h('p', { className: 'sub', text: `시작: ${basesLabel(pa.basesBefore)} · ${pa.outsBefore}아웃` }),
    pa.endCount ? h('p', { className: 'sub', text: `${countLabel(pa.endCount)}에서 끝남` }) : null,
    pa.outcome === 'inningEnded'
      ? h('p', { className: 'sub', text: '같은 타자가 다음 이닝에 다시 칩니다.' })
      : null,
    h('p', { className: 'chips' }, pa.timeline.map(chip)),
  ]);
}

export function recordsView(game: Game, replay: GameReplay): HTMLElement {
  const info = gameInfo(game);
  const pas = replay.plateAppearances;
  const innings = [...new Set(pas.map((pa) => pa.inning))].sort((a, b) => b - a);

  return h('section', { className: 'records' }, [
    h('p', { className: 'game-title', text: `${dateLabel(info.date)} · ${opponentLabel(info.opponent)} · ${GAME_TYPE_LABEL[info.gameType]}` }),
    pas.length === 0 ? h('p', { className: 'empty', text: '아직 기록이 없습니다. 기록 입력에서 공을 기록하세요.' }) : null,
    ...innings.flatMap((inning) => [
      h('h2', { className: 'inning-title', text: `${inning}회` }),
      ...pas
        .filter((pa) => pa.inning === inning)
        .reverse()
        .map(paCard),
    ]),
  ]);
}
