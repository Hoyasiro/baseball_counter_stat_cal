import './style.css';
import { mountApp } from './app';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('#app 요소를 찾을 수 없습니다.');
mountApp(root);
