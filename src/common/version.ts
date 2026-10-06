// 빌드할 때 vite.config.ts가 넣어 주는 앱 버전. 휴대폰에서 어느 버전을 쓰는지 확인할 때 본다.

declare const __APP_VERSION__: string;

export const APP_VERSION: string = __APP_VERSION__;
