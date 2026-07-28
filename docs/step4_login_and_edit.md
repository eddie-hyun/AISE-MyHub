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

---

## 1. 이 단계의 목표

> 🎯 **Supabase 대시보드에 들어가지 않고, 웹에서 이력서를 고칠 수 있게 만드는 것.**

```
[Step 3]  내용을 바꾸려면 → Supabase SQL Editor 에서 UPDATE 실행
[Step 4]  이력서 화면에서 로그인 → 그 자리에서 고치고 → 저장
```

이 단계는 손으로 하나씩 짠 게 아니라, **AI 코딩 에이전트(Claude Code)에게 아래 프롬프트를 그대로 줘서** 만들었습니다.

```
Supabase에 있는 데이터(profile) 수정을 FE 웹 페이지를 통해서 할 수 있도록 BE와 FE를 수정.

* BE: 비밀번호로 세션 기반 로그인 구현. 관리자 전용 기능은 로그인 상태에서만 가능.
  * 인증 엔드포인트 구현: 로그인, 로그인 상태 확인, 로그아웃
  * 프로필 수정 엔드포인트 (PUT).
  * id, 수정 시각은 서버가 데이터 수정 시 정하도록 함.

* FE: 별도 편집 페이지 없이, 보고 있던 이력서 화면 그대로에서 로그인 후 in-place edit.
  * 로그인 성공하면 프로필 페이지 자체가 편집 모드 전환. 저장, 로그아웃 기능 추가.
  * 로그인이 풀린 상태로 저장을 시도하면 로그인 화면으로 안내.

기존 화면(비로그인 상태의 프로필 보기)은 그대로 동작해야 함.
```

---

## 2. 완성된 모습

**편집용 페이지를 따로 만들지 않습니다.** 보고 있던 이력서 화면에서 그대로 고칩니다.

```
[로그아웃]  http://localhost:5173
┌──────────────────────────────────────┐
│  테스트 사용자                          │
│  백엔드 개발자                         │
│  온라인 이력서를 직접 만들고 있습니다.   │
│  ──────────────────────────────────  │
│  마지막 수정 2026년 7월 28일  관리자 로그인 │  ← 여기를 누르면
└──────────────────────────────────────┘

[로그인]   같은 주소, 같은 화면
┌──────────────────────────────────────┐
│  ┌──────────────────────────────┐    │  ← 글자가 있던 자리가
│  │ 테스트 사용자                  │    │     그대로 입력칸이 된다
│  └──────────────────────────────┘    │
│  ┌──────────────────────────────┐    │
│  │ 백엔드 개발자                  │    │
│  └──────────────────────────────┘    │
│  ┌──────────────────────────────┐    │
│  │ 온라인 이력서를 직접 만들고... │    │
│  └──────────────────────────────┘    │
│                     [저장][로그아웃]  │
└──────────────────────────────────────┘
```

로그인이 풀린 채로 저장을 누르면(세션 만료 등) **로그인 화면으로 안내**하고, 비로그인 상태의 기존 화면은 그대로 동작합니다.

---

## 3. ① 백엔드 — 로그인과 수정 엔드포인트

### 3.1 새로 생긴 주소

```
POST   /api/auth/session   비밀코드 보내기  →  로그인
GET    /api/auth/session   로그인 상태 확인
DELETE /api/auth/session   로그아웃
PUT    /api/profile        프로필 수정 (로그인 필요)
```

### 3.2 환경변수 추가

`backend/.env` 에 두 줄 추가합니다. `.env.example` 에 양식이 있습니다.

```
ADMIN_PASSCODE=내가정한비밀코드
SESSION_SECRET=아래명령으로만든64자리
```

```
python -c "import secrets; print(secrets.token_hex(32))"
```

`requirements.txt` 에는 `itsdangerous` 가 추가됩니다 — 세션 쿠키에 서명하는 데 씁니다.

### 3.3 세션과 문지기

```python
from starlette.middleware.sessions import SessionMiddleware

app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET, session_cookie="myhub_session")


def require_admin(request: Request) -> None:
    if not request.session.get("admin"):
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")
```

`SessionMiddleware` 는 로그인 성공 시 **서명된 쿠키**를 브라우저에 내려주고, 요청마다 자동으로 검증합니다. 우리 코드에는 토큰을 저장하거나 검사하는 부분이 없습니다 — `request.session` 이 곧 그 쿠키입니다.

`dependencies=[Depends(require_admin)]` 를 엔드포인트에 붙이면 그 주소는 로그인 필수가 됩니다.

### 3.4 로그인 · 상태 확인 · 로그아웃

```python
@app.post("/api/auth/session", response_model=SessionResponse)
def login(body: LoginRequest, request: Request):
    if not secrets.compare_digest(body.passcode.encode("utf-8"), ADMIN_PASSCODE.encode("utf-8")):
        raise HTTPException(status_code=401, detail="비밀코드가 올바르지 않습니다.")

    request.session["admin"] = True
    return SessionResponse(authenticated=True)


@app.get("/api/auth/session", response_model=SessionResponse)
def check_session(request: Request):
    return SessionResponse(authenticated=bool(request.session.get("admin")))


@app.delete("/api/auth/session", response_model=SessionResponse)
def logout(request: Request):
    request.session.clear()
    return SessionResponse(authenticated=False)
```

`secrets.compare_digest` 로 비밀코드를 비교하는 것 말고는 특별한 게 없습니다. 비밀코드는 로그인할 때 한 번만 쓰이고, 그다음부터는 쿠키로 인증합니다.

### 3.5 수정 엔드포인트

```python
class ProfileUpdate(BaseModel):
    full_name: str = Field(min_length=1, max_length=100)
    headline: str = Field(min_length=1, max_length=200)
    summary: str | None = Field(default=None, max_length=2000)


@app.put("/api/profile", response_model=ProfileResponse, dependencies=[Depends(require_admin)])
def update_profile(body: ProfileUpdate):
    with psycopg.connect(**DB_CONFIG, connect_timeout=5) as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                update public.profile
                   set full_name  = %(full_name)s,
                       headline   = %(headline)s,
                       summary    = %(summary)s,
                       updated_at = now()
                 where id = (select id from public.profile order by id limit 1)
             returning full_name, headline, summary, updated_at
                """,
                body.model_dump(),
            )
            row = cur.fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="프로필이 아직 없습니다.")

    return ProfileResponse(profile=Profile(**row))
```

읽기용 `Profile` 과 쓰기용 `ProfileUpdate` 를 **다른 타입**으로 나눴습니다. `id`와 `updated_at`은 `ProfileUpdate`에 없습니다 — 프롬프트가 요구한 그대로, **서버가 정하는 값**이라 클라이언트가 보낼 수 없게 막았습니다. `updated_at`은 SQL의 `now()`가, 행을 찾는 `id`는 `where` 절의 서브쿼리가 대신 채웁니다.

값은 `%(full_name)s` 같은 자리 표시로 SQL 문장과 분리해서 전달합니다(파라미터 바인딩) — 문자열을 이어 붙여 쿼리를 만들지 않는 것이 원칙입니다.

<details>
<summary><b>▸ 트러블슈팅 — 새 주소가 프론트엔드 타입에 안 잡힌다</b></summary>

백엔드에 주소가 새로 생겼으니 타입을 다시 생성해야 합니다.

```
npm run gen:api
```

</details>

---

## 4. ② 프론트엔드 — 제자리 편집

### 4.1 API 호출 추가

`src/api/client.ts` 에 세션·수정 관련 함수를 추가합니다.

```ts
export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function checkSession(): Promise<SessionResponse> {
  const res = await fetch('/api/auth/session')
  return handle<SessionResponse>(res)
}

export async function login(passcode: string): Promise<SessionResponse> {
  const res = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passcode }),
  })
  return handle<SessionResponse>(res)
}

export async function logout(): Promise<SessionResponse> {
  const res = await fetch('/api/auth/session', { method: 'DELETE' })
  return handle<SessionResponse>(res)
}

export async function updateProfile(body: ProfileUpdate): Promise<ProfileResponse> {
  const res = await fetch('/api/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return handle<ProfileResponse>(res)
}
```

로그인 쿠키를 **꺼내거나 붙이는 코드가 없습니다.** 브라우저가 알아서 저장하고, 같은 주소로 가는 요청에 알아서 붙여 보냅니다.

`ApiError` 에 HTTP 상태 코드를 담아둔 게 핵심입니다. 메시지 문자열만으로는 "401이면 로그인 화면으로" 같은 판단을 할 수 없기 때문입니다.

### 4.2 화면 상태

```ts
const [profile, setProfile] = useState<Profile | null>(null)
const [authenticated, setAuthenticated] = useState<boolean | null>(null)
const [draft, setDraft] = useState<ProfileUpdate | null>(null)
```

| 값 | 화면 |
|---|---|
| `authenticated === null` | 아직 서버에 로그인 여부를 안 물어봄 (읽기 화면을 먼저 보여줌) |
| `authenticated === false` | 읽기 화면 + "관리자 로그인" 입구 |
| `authenticated === true` | 편집 화면 (입력칸 + 저장/로그아웃) |

페이지가 뜨면 `getProfile()` 과 `checkSession()` 을 동시에 호출합니다. 프로필은 누구에게나 보여야 하므로 로그인 여부를 기다리지 않고, 로그인돼 있었다면 도착하는 대로 편집 화면으로 전환됩니다.

### 4.3 저장 중 세션이 끊기면

```ts
try {
  const data = await updateProfile(draft)
  setProfile(data.profile)
} catch (e) {
  if (e instanceof ApiError && e.status === 401) {
    setAuthenticated(false)
    setShowLogin(true)
    setSaveError('세션이 만료되었습니다. 다시 로그인해 주세요.')
  } else {
    setSaveError(e instanceof Error ? e.message : '저장에 실패했습니다.')
  }
}
```

**401만 따로 잡아서** 로그인 화면으로 돌려보냅니다. 그 외의 실패(네트워크 오류, 422 검증 실패 등)는 편집 화면에 그대로 메시지만 띄웁니다.

### 4.4 입력칸이 글자와 같은 자리를 씁니다

```css
.editable {
  font: inherit;   /* 감싸는 태그에서 글꼴을 물려받는다 */
  color: inherit;
}
```

읽기용 텍스트와 편집용 입력칸이 같은 여백·글꼴을 쓰도록 맞춰서, 편집 모드로 바뀌어도 레이아웃이 크게 흔들리지 않게 했습니다.

---

## 5. 코드 전체

### `backend/main.py`

```python
import os
import secrets
from datetime import datetime

import psycopg
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request
from psycopg.rows import dict_row
from pydantic import BaseModel, Field
from starlette.middleware.sessions import SessionMiddleware

load_dotenv()

DB_CONFIG = {
    "host": os.getenv("SUPABASE_DB_HOST"),
    "port": os.getenv("SUPABASE_DB_PORT", "5432"),
    "dbname": os.getenv("SUPABASE_DB_NAME", "postgres"),
    "user": os.getenv("SUPABASE_DB_USER", "postgres"),
    "password": os.getenv("SUPABASE_DB_PASSWORD"),
}

ADMIN_PASSCODE = os.environ["ADMIN_PASSCODE"]
SESSION_SECRET = os.environ["SESSION_SECRET"]

app = FastAPI()
app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET, session_cookie="myhub_session")


def require_admin(request: Request) -> None:
    if not request.session.get("admin"):
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")


class HealthResponse(BaseModel):
    status: str
    database: str
    version: str


class Profile(BaseModel):
    full_name: str
    headline: str
    summary: str | None
    updated_at: datetime


class ProfileResponse(BaseModel):
    profile: Profile


class ProfileUpdate(BaseModel):
    full_name: str = Field(min_length=1, max_length=100)
    headline: str = Field(min_length=1, max_length=200)
    summary: str | None = Field(default=None, max_length=2000)


class LoginRequest(BaseModel):
    passcode: str


class SessionResponse(BaseModel):
    authenticated: bool


@app.get("/api/health", response_model=HealthResponse)
def health():
    try:
        with psycopg.connect(**DB_CONFIG, connect_timeout=5) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT version();")
                version = cur.fetchone()[0]
        return HealthResponse(status="ok", database="connected", version=version)
    except Exception as e:
        raise HTTPException(status_code=503, detail={"status": "error", "database": "disconnected", "error": str(e)})


@app.get("/api/profile", response_model=ProfileResponse)
def get_profile():
    with psycopg.connect(**DB_CONFIG, connect_timeout=5) as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                select full_name, headline, summary, updated_at
                from public.profile
                order by id
                limit 1
                """
            )
            row = cur.fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="프로필이 아직 없습니다.")

    return ProfileResponse(profile=Profile(**row))


@app.put("/api/profile", response_model=ProfileResponse, dependencies=[Depends(require_admin)])
def update_profile(body: ProfileUpdate):
    with psycopg.connect(**DB_CONFIG, connect_timeout=5) as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                update public.profile
                   set full_name  = %(full_name)s,
                       headline   = %(headline)s,
                       summary    = %(summary)s,
                       updated_at = now()
                 where id = (select id from public.profile order by id limit 1)
             returning full_name, headline, summary, updated_at
                """,
                body.model_dump(),
            )
            row = cur.fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="프로필이 아직 없습니다.")

    return ProfileResponse(profile=Profile(**row))


@app.post("/api/auth/session", response_model=SessionResponse)
def login(body: LoginRequest, request: Request):
    if not secrets.compare_digest(body.passcode.encode("utf-8"), ADMIN_PASSCODE.encode("utf-8")):
        raise HTTPException(status_code=401, detail="비밀코드가 올바르지 않습니다.")

    request.session["admin"] = True
    return SessionResponse(authenticated=True)


@app.get("/api/auth/session", response_model=SessionResponse)
def check_session(request: Request):
    return SessionResponse(authenticated=bool(request.session.get("admin")))


@app.delete("/api/auth/session", response_model=SessionResponse)
def logout(request: Request):
    request.session.clear()
    return SessionResponse(authenticated=False)
```

### `frontend/src/api/types.ts`

```ts
import type { paths } from './schema'

export type ProfileResponse =
  paths['/api/profile']['get']['responses']['200']['content']['application/json']

export type Profile = ProfileResponse['profile']

export type ProfileUpdate =
  paths['/api/profile']['put']['requestBody']['content']['application/json']

export type SessionResponse =
  paths['/api/auth/session']['get']['responses']['200']['content']['application/json']
```

### `frontend/src/api/client.ts`

```ts
import type { ProfileResponse, ProfileUpdate, SessionResponse } from './types'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new ApiError(`서버가 ${res.status} 로 응답했습니다`, res.status)
  }
  return res.json() as Promise<T>
}

export async function getProfile(): Promise<ProfileResponse> {
  const res = await fetch('/api/profile')
  return handle<ProfileResponse>(res)
}

export async function updateProfile(body: ProfileUpdate): Promise<ProfileResponse> {
  const res = await fetch('/api/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return handle<ProfileResponse>(res)
}

export async function checkSession(): Promise<SessionResponse> {
  const res = await fetch('/api/auth/session')
  return handle<SessionResponse>(res)
}

export async function login(passcode: string): Promise<SessionResponse> {
  const res = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passcode }),
  })
  return handle<SessionResponse>(res)
}

export async function logout(): Promise<SessionResponse> {
  const res = await fetch('/api/auth/session', { method: 'DELETE' })
  return handle<SessionResponse>(res)
}
```

### `frontend/src/App.tsx`

```tsx
import { useEffect, useState, type FormEvent } from 'react'
import { ApiError, checkSession, getProfile, login, logout, updateProfile } from './api/client'
import type { Profile, ProfileUpdate } from './api/types'
import './App.css'

function App() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)

  const [showLogin, setShowLogin] = useState(false)
  const [passcode, setPasscode] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)

  const [draft, setDraft] = useState<ProfileUpdate | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    getProfile()
      .then((data) => setProfile(data.profile))
      .catch((e: Error) => setError(e.message))
    checkSession()
      .then((data) => setAuthenticated(data.authenticated))
      .catch(() => setAuthenticated(false))
  }, [])

  useEffect(() => {
    if (authenticated && profile) {
      setDraft({ full_name: profile.full_name, headline: profile.headline, summary: profile.summary })
    } else {
      setDraft(null)
    }
    // profile 은 저장 성공 시에만 바뀌는데, 그때는 draft 를 새로 덮어쓰지 않는다.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated])

  async function handleLogin(event: FormEvent) {
    event.preventDefault()
    setLoginError(null)
    try {
      await login(passcode)
      setAuthenticated(true)
      setShowLogin(false)
      setPasscode('')
    } catch (e) {
      setLoginError(e instanceof Error ? e.message : '로그인에 실패했습니다.')
    }
  }

  async function handleLogout() {
    await logout().catch(() => {})
    setAuthenticated(false)
    setShowLogin(false)
  }

  async function handleSave() {
    if (!draft) return
    setSaving(true)
    setSaveError(null)
    try {
      const data = await updateProfile(draft)
      setProfile(data.profile)
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setAuthenticated(false)
        setShowLogin(true)
        setSaveError('세션이 만료되었습니다. 다시 로그인해 주세요.')
      } else {
        setSaveError(e instanceof Error ? e.message : '저장에 실패했습니다.')
      }
    } finally {
      setSaving(false)
    }
  }

  if (error) {
    return (
      <main className="cv">
        <p className="state error">불러오지 못했습니다 — {error}</p>
      </main>
    )
  }

  if (!profile) {
    return (
      <main className="cv">
        <p className="state">불러오는 중...</p>
      </main>
    )
  }

  if (authenticated && draft) {
    return (
      <main className="cv">
        <header className="cv-header">
          <input
            className="editable title"
            value={draft.full_name}
            maxLength={100}
            onChange={(e) => setDraft({ ...draft, full_name: e.target.value })}
          />
          <input
            className="editable headline"
            value={draft.headline}
            maxLength={200}
            onChange={(e) => setDraft({ ...draft, headline: e.target.value })}
          />
          <textarea
            className="editable summary"
            value={draft.summary ?? ''}
            maxLength={2000}
            onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
          />
        </header>

        {saveError && <p className="state error">{saveError}</p>}

        <footer className="cv-footer edit-actions">
          <button type="button" onClick={handleSave} disabled={saving}>
            {saving ? '저장 중...' : '저장'}
          </button>
          <button type="button" onClick={handleLogout}>
            로그아웃
          </button>
        </footer>
      </main>
    )
  }

  return (
    <main className="cv">
      <header className="cv-header">
        <h1>{profile.full_name}</h1>
        <p className="headline">{profile.headline}</p>
        {profile.summary && <p className="summary">{profile.summary}</p>}
      </header>

      <footer className="cv-footer">
        <span>
          마지막 수정{' '}
          {new Date(profile.updated_at).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </span>
        <button type="button" className="link" onClick={() => setShowLogin((v) => !v)}>
          관리자 로그인
        </button>
      </footer>

      {saveError && <p className="state error">{saveError}</p>}

      {showLogin && (
        <form className="login" onSubmit={handleLogin}>
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="비밀코드"
          />
          <button type="submit">로그인</button>
          {loginError && <p className="state error">{loginError}</p>}
        </form>
      )}
    </main>
  )
}

export default App
```

---

## 6. 이번에 배운 개념

| 용어 | 한 줄 설명 |
|---|---|
| **세션** | "이 사람은 로그인했다"는 서버 쪽 기억. 서명된 쿠키에 담아 브라우저에 보관시킴 |
| **`SessionMiddleware`** | 요청마다 세션 쿠키를 검증·해석해 `request.session` 으로 꺼내 쓰게 해주는 미들웨어 |
| **`Depends`** | FastAPI 에서 "이 엔드포인트를 실행하기 전에 이걸 먼저" 지정하는 방법 |
| **`RETURNING`** | 수정·삭제한 행을 그 쿼리에서 바로 돌려받는 PostgreSQL 기능 |
| **파라미터 바인딩** | `%(name)s` — 값을 SQL 문장과 분리해 전달하는 것 |
| **읽기/쓰기 DTO 분리** | 서버가 정할 값(`id`, `updated_at`)은 클라이언트가 보내는 타입에서 아예 뺌 |

---

## 7. 다음 단계 (Step 5)

> 🎯 **SQL 을 직접 쓰지 않고, 파이썬 클래스로 데이터베이스를 다룹니다.**

지금 백엔드에는 raw SQL 이 곳곳에 있습니다. **SQLAlchemy ORM** 을 도입해 전부 걷어냅니다.

| | 지금 (Step 4) | Step 5 |
|---|---|---|
| 테이블 정의 | SQL Editor 에서 `create table` | **파이썬 클래스** (엔티티) |
| 테이블 생성 | 손으로 SQL 실행 | **서버 시작 시 자동** |
| 조회 | `cur.execute("select ...")` | `select(models.Profile)` |
| 수정 | `update ... set ...` | `entity.full_name = "..."` |
| `updated_at` | UPDATE 문에 직접 적음 | 엔티티에 선언, 자동 갱신 |

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
