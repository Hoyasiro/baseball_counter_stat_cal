// 화면 방향 고정. 홈 화면에 설치한 앱(안드로이드)에서만 고정되고, 브라우저 탭·아이폰은 휴대폰의 화면 회전 설정을 따른다.
// 그래서 앱 설정(manifest)은 방향을 묶지 않고("any"), 세로 고정은 여기서 할 수 있을 때만 한다.

import { OrientationMode } from './settings';

/** 지원하지 않는 브라우저도 있어 타입을 직접 밝힌다. */
type LockableOrientation = ScreenOrientation & { lock?: (orientation: 'portrait') => Promise<void> };

export function applyOrientation(mode: OrientationMode): void {
  try {
    const orientation = screen.orientation as LockableOrientation | undefined;
    if (!orientation) return;
    if (mode === 'portrait') {
      orientation.lock?.('portrait').catch(() => {
        // 고정할 수 없는 곳(브라우저 탭 등)이면 휴대폰 회전 설정을 따른다.
      });
    } else {
      orientation.unlock?.();
    }
  } catch {
    // 방향 기능이 없는 브라우저
  }
}
