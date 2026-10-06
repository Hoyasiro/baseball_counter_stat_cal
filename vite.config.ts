import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

/** 앱에 보여줄 버전: package.json 버전 + git 커밋(짧은 해시·날짜). git이 없으면 "개발 중" */
function appVersion(): string {
  const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };
  try {
    const commit = execSync('git log -1 --format=%h·%cs', { encoding: 'utf8' }).trim();
    return `v${version} (${commit})`;
  } catch {
    return `v${version} (개발 중)`;
  }
}

// 상대 경로로 빌드한다. GitHub Pages의 하위 주소(/baseball_counter_stat_cal/)와 로컬 미리보기 모두에서 열리게 하기 위해서다.
export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(appVersion()),
  },
});
