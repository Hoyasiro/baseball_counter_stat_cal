# PWA 만들기 인계 노트 (GitHub Pages + 안드로이드 크롬)

> 새 PWA(홈 화면에 설치하는 웹앱)를 만들 때 이 문서를 프로젝트에 넣고, AI 코딩 도구에게 "이 문서의 규칙을 따른다"고 알려준다.
> 야구맘기록지·요리 레시피 앱에서 실제로 겪은 문제(2026-10)를 바탕으로 정리했다.

---

## 1. 꼭 지킬 규칙 (요약)

1. **앱 하나 = 사이트 주소 하나.** 설치형 앱마다 전용 GitHub 조직을 만들어 `https://<조직>.github.io/<저장소>/`로 배포한다. 한 계정 주소(`https://<계정>.github.io/`) 아래에 PWA를 두 개 이상 두지 않는다.
2. **manifest `id`는 앱 경로를 포함한 절대 경로**로 쓴다. 예: `"/<저장소>/<앱이름>"`. `"./"`처럼 상대 경로로 쓰지 않는다.
3. **서비스 워커가 manifest를 캐시하면**, manifest를 고칠 때 캐시 이름도 올린다.
4. 기록·데이터는 처음부터 **백업(내보내기)·불러오기** 기능을 만든다. 주소를 옮기면 데이터가 따라오지 않는다.

---

## 2. 무슨 일이 있었나 (사례)

| 항목 | 내용 |
| --- | --- |
| 환경 | 삼성 갤럭시(SM-S928N), Android 16, Chrome 154 |
| 상황 | `hoyasiro.github.io/Cook-Receipt-App/`(요리 앱)을 먼저 설치한 뒤, 같은 계정 주소의 `hoyasiro.github.io/baseball_counter_stat_cal/`(야구 앱)을 설치하려 함 |
| 증상 | 크롬 "설치 및 바로가기 만들기" 창에 **"앱이 이미 설치되어 있습니다 / 클릭하여 앱 열기"**가 뜨고, 눌러도 아무 반응 없음. 실제로 설치된 야구 앱은 없음 |
| 원인 | 크롬이 **사이트 주소(`hoyasiro.github.io`) 단위**로 "설치됨"을 판단함. 같은 주소에 다른 앱이 이미 있으면 새 앱을 설치하지 못함 |
| 확인 방법 | 요리 앱을 지우니 야구 앱 "앱 설치"가 뜸 → 야구 앱 설치 후 요리 앱을 다시 설치하려니 이번엔 요리 앱이 "이미 설치됨" |
| 해결 | 두 저장소를 각각 전용 조직(`yagumam`, `hansik-receipt`)으로 옮겨 사이트 주소를 나눔 → 같은 휴대폰에 두 앱 모두 설치되고 각각 정상 실행 확인 |

### 원인이 아니었던 것 (같은 증상일 때 시간 아끼기)
- manifest `id`·`scope`가 서로 겹침 → `chrome://webapks`에서 요리 앱 범위는 정확히 `/Cook-Receipt-App/`였음
- 삼성 인터넷으로 설치한 앱 → 지워도 그대로였음
- 크롬 강제 중지 → 그대로
- 크롬 사이트 데이터(`hoyasiro.github.io`) 삭제 → 그대로 (요리 앱 데이터만 날아감)
- manifest `id`를 새 값으로 변경 → 그대로 (다만 원래 값 `"./"`가 사이트 맨 앞 `/`로 풀리는 잘못은 이때 바로잡음)

---

## 3. 새 PWA 시작 확인 목록

### 3.1 배포 주소
- [ ] GitHub에서 **새 조직 만들기**: 오른쪽 위 **+** → **New organization** → **Free** (무료. 공개 저장소면 Pages도 무료)
- [ ] 저장소를 그 조직 안에 만든다 (이미 있으면 Settings → Danger Zone → **Transfer**)
- [ ] Claude GitHub 앱을 새 조직에 설치: https://github.com/apps/claude/installations/select_target
- [ ] 저장소 Settings → Pages → Source를 **GitHub Actions**로
- [ ] 비공개 저장소로 Pages를 쓰면 유료다. 공개 저장소로 두고, 데이터는 휴대폰 안에만 저장한다

### 3.2 manifest (`manifest.webmanifest`)
```json
{
  "name": "앱 이름",
  "short_name": "앱 이름",
  "id": "/<저장소>/<앱이름>",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```
- `id`는 `start_url`의 **출처(맨 앞 주소)** 기준으로 풀린다. `"./"`는 `https://<조직>.github.io/`가 되어 같은 주소의 다른 앱과 이름표가 같아진다.
- 한 번 정한 `id`는 바꾸지 않는다. 바꾸면 이미 설치한 사람에게는 다른 앱이 된다.
- vite-plugin-pwa를 쓰면 `id: base`(예: `/<저장소>/`)처럼 경로가 들어간 값으로 둔다.

### 3.3 서비스 워커
- manifest를 캐시에 넣는다면, manifest를 고칠 때 캐시 이름(예: `CACHE = 'app-v3'`)도 올린다. 안 그러면 휴대폰에 옛 manifest가 계속 남는다.
- 미리보기(iframe) 안에서는 서비스 워커를 등록하지 않는다.

### 3.4 데이터
- 로컬 저장소(localStorage·IndexedDB)는 **사이트 주소마다 따로**다. 주소가 바뀌면 빈 앱이 된다.
- 백업 파일 내보내기 + 불러오기(합치기)를 첫 버전부터 넣는다.
- 크롬의 "사이트 데이터 삭제"는 **같은 주소의 모든 앱 데이터**를 지운다. (주소를 나누면 앱별로 지울 수 있다)

---

## 4. "설치가 안 될 때" 진단 순서

1. **다른 휴대폰 크롬에서 같은 주소 열기** → 거기서 "앱 설치"가 뜨면 앱 코드는 정상, 이 휴대폰의 상태 문제
2. 크롬 주소창 `chrome://webapks` → 크롬으로 설치된 앱 목록·`Scope`·`Manifest Id` 확인
3. **같은 사이트 주소에 이미 설치된 다른 앱이 있는지** 확인 → 있으면 이 문서 1번 규칙 위반. 주소를 나눈다
4. 앱 코드 쪽: 크롬 개발자 도구(또는 Playwright CDP `Page.getAppId`, `Page.getInstallabilityErrors`)로 실제 `id`와 설치 가능 오류를 본다
5. 크롬 사이트 데이터 삭제는 마지막에. 같은 주소의 다른 앱 데이터까지 지워지므로 먼저 백업한다

---

## 5. 주소 옮기기 절차 (이미 같은 주소에 앱이 여러 개일 때)

1. 모든 앱에서 **백업**
2. 앱마다 조직 만들기 (Free)
3. 조직에 Claude GitHub 앱 설치
4. 저장소 Transfer (이름은 그대로 두면 앱 경로가 같아서 코드 수정이 거의 없다)
5. 문서·도움말의 주소 문구만 새 주소로 바꾸고 `main`에 합쳐 배포
6. 휴대폰: 새 주소에서 앱 설치 → 백업 불러오기 → 예전 앱 삭제

참고: Claude Code 클라우드 세션은 같은 이름의 저장소를 다른 소유자로 다시 붙일 수 없다. 옮긴 뒤에는 **새 세션을 새 저장소로 시작**한다. (옛 주소로도 git·API가 자동으로 넘어가서 그 세션에서 마무리 작업은 가능했다)

---

## 6. 현재 앱 주소

| 앱 | 조직 | 주소 |
| --- | --- | --- |
| 야구맘기록지 | `yagumam` | https://yagumam.github.io/baseball_counter_stat_cal/ |
| 요리 레시피 | `hansik-receipt` | https://hansik-receipt.github.io/Cook-Receipt-App/ |
