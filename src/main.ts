import './style.css';
import { h } from './common/dom';
import { mountPitcher } from './pitcher/screen';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('#app 요소를 찾을 수 없습니다.');
const app = root;

function showHome(): void {
  app.replaceChildren(
    h('main', { className: 'home' }, [
      h('h1', { text: '우리 아이 야구 기록' }),
      h('p', { className: 'sub', text: '어떤 기록을 남길까요?' }),
      h('button', { className: 'menu pitcher', onClick: () => mountPitcher(app, showHome) }, [
        h('strong', { text: '투수 기록' }),
        h('small', { text: '아이가 공을 던질 때' }),
      ]),
      h('button', { className: 'menu batter', disabled: true }, [
        h('strong', { text: '타자 기록' }),
        h('small', { text: '준비 중입니다' }),
      ]),
    ]),
  );
}

showHome();
