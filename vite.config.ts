import { defineConfig } from 'vite';

// 상대 경로로 빌드한다. GitHub Pages의 하위 주소(/baseball_counter_stat_cal/)와 로컬 미리보기 모두에서 열리게 하기 위해서다.
export default defineConfig({
  base: './',
});
