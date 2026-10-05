// 오프라인 지원(서비스 워커) 등록. 주소로 직접 연 앱(홈 화면 앱 포함)에서만 켠다.
// 미리보기 링크처럼 다른 화면 안에 들어가 있으면 sw.js 파일이 없으므로 등록하지 않는다.

export function registerOffline(): void {
  if (!('serviceWorker' in navigator) || window.self !== window.top || !window.isSecureContext) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // 등록하지 못해도 앱은 그대로 쓴다. 인터넷이 없을 때 열리지 않을 뿐이다.
    });
  });
}
