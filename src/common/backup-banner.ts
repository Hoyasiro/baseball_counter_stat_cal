// 백업 알림 띠: 백업 안 한 경기가 있으면 백업할 때까지 기록 입력 밖의 화면 위에 계속 보여준다.
// (기록 입력 화면은 한 화면에 들어가야 하므로 띠 대신 아래 "경기" 탭에 숫자만 붙인다. CLAUDE.md 0.4)

import { DataActions, backupNowButton, lastBackupText } from './data-section';
import { h } from './dom';

/** 이만큼 백업 안 한 경기가 생기면 알린다 */
export const BACKUP_REMINDER_MIN_GAMES = 1;

export function backupBanner(unbacked: number, lastBackupAt: string | null, actions: DataActions): HTMLElement {
  return h('section', { className: 'backup-banner', attrs: { role: 'status' } }, [
    h('p', {}, [
      h('strong', { text: `백업 안 한 경기 ${unbacked}개` }),
      h('small', { text: ` · ${lastBackupText(lastBackupAt)}` }),
    ]),
    h('p', { className: 'help', text: '기록은 이 휴대폰 안에만 있어요. 휴대폰을 바꾸거나 브라우저 데이터를 지우면 사라지니 백업해 두세요.' }),
    backupNowButton(actions),
  ]);
}
