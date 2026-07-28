# Step 3 — 화면 붙이기 (React + TypeScript)

> MyHub(온라인 이력서) 개발 기록 · 2026-07-28
> 이전 문서: [Step 2 — 첫 테이블 만들고 API로 읽어오기](step2_first_table_api.md)

---

## 전체 로드맵에서 지금 어디쯤인가

```
[✓  Step 1]  백엔드 ↔ Supabase 연결        완료
[✓  Step 2]  테이블 만들고 데이터 읽기      완료
[✅ Step 3]  화면(프론트엔드) 붙이기        ← 지금 여기
[   Step 4]  내가 로그인해서 수정하기
[   Step 5]  ORM 도입 (SQLAlchemy)
```

> 🖥️ 명령어는 **cmd / PowerShell / macOS·Linux** 를 모두 적어뒀습니다.
> **트러블슈팅은 문제가 터지는 단계 바로 아래에 접어두었습니다.** `▸` 를 클릭하면 펼쳐집니다.

---

## 3-1. 이 단계의 목표

> 🎯 **JSON 글자를 사람이 보는 이력서 페이지로 만드는 것.**
> 여기부터 비로소 "웹사이트"가 됩니다.

```
[Step 2]  브라우저 → {"profile":{"full_name":"백영민", ...}}   ← 개발자만 읽는 글자

[Step 3]  브라우저 → ┌──────────────────────┐                  ← 사람이 보는 화면
                    │  백영민                │
                    │  백엔드 개발자          │
                    │  온라인 이력서를 ...     │
                    └──────────────────────┘
```

### 다섯 조각으로 나눠서 진행합니다

| | 하는 일 | 결과 |
|---|---|---|
| **①** | Vite로 React+TS 프로젝트 생성 | 브라우저에 화면이 뜸 (백엔드 무관) |
| **②** | Vite 프록시 연결 | 프론트에서 `/api/profile` 호출 성공 (CORS 없이) |
| **③** | Pydantic DTO + 타입 자동 생성 | **손으로 쓴 타입 0개**로 데이터 표시 |
| **④** | 이력서 스타일 입히기 | 다크모드·인쇄까지 되는 이력서 |
| **⑤** | `openapi-fetch` | 주소 오타까지 타입 검사 |

### 왜 Vanilla가 아니라 React인가

간단한 화면이라면 순수 HTML/JS로도 됩니다. 하지만 **나중에 갈아타는 비용이 훨씬 비쌉니다.**

이력서 항목이 경력·프로젝트·학력·스킬로 늘어난 뒤에 React로 옮기면 **화면 코드를 전부 다시 써야 합니다.** 지금 붙이면 그 비용이 0입니다.

기술 문서의 F/E 항목도 이 방향입니다.

> React와 TypeScript 기반으로 구현하며, 빌드 도구로 Vite를 사용한다.
> BE가 제공하는 OpenAPI 스펙에 따른 데이터 타입을 생성하여 사용하며, FE에서 정한 임의의 타입을 사용하지 않는다.

---

## 3-2. 시작 전 확인

Node.js가 필요합니다.

```
node -v
npm -v
```

버전 번호가 나오면 준비 완료입니다. "인식할 수 없습니다"가 나오면 [nodejs.org](https://nodejs.org)에서 **LTS** 버전을 설치하고 터미널을 새로 여세요.

> 이 문서는 **Node 24 / npm 11** 기준으로 작성했습니다.

---

## 3-3. ① React 프로젝트 만들기

### 터미널을 하나 더 엽니다

**백엔드 서버는 켜둔 채로** 새 터미널 창을 엽니다. 앞으로 터미널이 두 개입니다.

| 터미널 | 위치 | 하는 일 | `(.venv)` |
|---|---|---|---|
| 1번 (기존) | `backend` | 파이썬 서버 (`uvicorn`) | **필요** |
| 2번 (새로) | `frontend` | 화면 서버 (`npm run dev`) | 불필요 |

> `(.venv)`는 **파이썬 전용**입니다. 프론트엔드 터미널에서는 신경 쓰지 않아도 됩니다.

### 프로젝트 생성

**프로젝트 루트**에서 실행합니다.

```
npm create vite@latest frontend -- --template react-ts
```

중간에 질문이 뜨면:

- 프레임워크 → **React**
- 언어 → **TypeScript** (`TypeScript + SWC`도 괜찮습니다)
- `rolldown-vite` 같은 실험 옵션 → **No / 기본값**
- **Install with npm and start now?** → **Yes** (아래 두 명령을 대신 해줍니다)

### 설치와 실행

"start now"를 선택했다면 이미 실행 중입니다. 아니라면:

```
cd frontend
npm install
npm run dev
```

```
  VITE v8.x.x  ready in 412 ms

  ➜  Local:   http://localhost:5173/
```

브라우저에서 그 주소를 열어 Vite + React 기본 페이지가 뜨면 성공입니다.

<details>
<summary><b>▸ 트러블슈팅 — 주소가 5173이 아니라 5174로 뜬다</b></summary>

**증상**
```
➜  Local:   http://localhost:5174/
```

**원인**
**5173 포트가 이미 쓰이고 있어서** Vite가 자동으로 하나 올린 것입니다. 에러가 아닙니다.

가장 흔한 경우는 **dev 서버가 두 개 떠 있는 것**입니다. "Install with npm and start now"로 이미 서버가 떴는데 `npm run dev`를 한 번 더 실행하면 이렇게 됩니다.

**해결**
그냥 **터미널에 찍힌 주소를 쓰면 됩니다.** 정리하고 싶으면 5173을 쓰고 있는 터미널을 `Ctrl+C`로 끄고 다시 실행하세요.

> 이 문서의 주소는 편의상 5174로 적었습니다. 본인 화면에 나오는 번호로 읽으세요.

</details>

<details>
<summary><b>▸ 트러블슈팅 — <code>npm</code> 명령이 동작하지 않는다</b></summary>

**원인**
`npm` 명령은 **`package.json`이 있는 폴더**에서만 동작합니다. 프로젝트 루트에 계시면 안 됩니다.

**확인법** — 터미널 프롬프트를 보세요.

| 프롬프트 끝 | 할 일 |
|---|---|
| `...\project-root>` | `cd frontend` **필요** |
| `...\project-root\frontend>` | 그대로 진행 |

`npm create vite`를 루트에서 실행했으니 **루트에 있을 가능성이 높습니다.**

</details>

### 지금 생긴 구조

```
project-root/
├── backend/          ← 파이썬 (포트 8080)
└── frontend/         ← 새로 생김 (포트 5174)
    ├── node_modules/     설치된 패키지들 (건드릴 일 없음)
    ├── src/
    │   ├── App.tsx       ★ 화면 내용
    │   └── main.tsx      시작점
    ├── index.html
    ├── package.json      프로젝트 정보 + 명령어 목록
    └── vite.config.ts    ★ 다음 단계에서 프록시를 추가
```

**두 서버가 각각 다른 포트에서 돌고 있습니다.** 아직 서로 모르는 사이입니다.

### 이 스텝은 이 프롬프트로 만들었습니다

여기까지 만든 `frontend` 프로젝트 위에서, 남은 네 조각(②~⑤)은 손으로 하나씩 짠 게 아니라 **AI 코딩 에이전트(Claude Code)에게 아래 프롬프트를 그대로 줘서** 만들었습니다.

```
`frontend` 디렉토리에 다음 기술스택을 갖는 프론트엔드 프로젝트 초기화.

* Typescript 기반 React
* Vite 빌드, 개발서버

backend(FastAPI, 8080번 포트)가 제공하는 프로필 데이터를 사람이 보는 이력서 화면으로 표시하는 기능을 미니멀하게 구현.

* 개발 중에는 Vite 프록시로 `/api`로 시작하는 요청을 BE에 그대로 전달.
* BE 응답 스키마는 Pydantic DTO로 스키마를 명시됨. 이 OpenAPI 스펙(`/openapi.json`)에서 TS 타입을 자동 생성하고 프론트엔드에서는 이 타입만을 이용하여야 함.
* BE가 데이터베이스에서 읽어와서 제공하는 이름, 한 줄 소개, 상세 소개, 마지막 수정 시각을 화면에 표시.
```

> 📌 **AI가 만든 초안을 그대로 쓰지는 않았습니다.** `/health`·`/profile` 주소에 `/api` 접두사를 붙이고 프록시를 연결하는 것, `response_model`로 Pydantic DTO를 노출하는 것, 그리고 타입 생성 스크립트(`gen:api`)까지는 프롬프트 한 번으로 나왔습니다. 다크모드·인쇄 CSS(3-6장)와 `openapi-fetch`로의 전환(3-7장)은 그 위에 이어서 다듬은 부분입니다.

---

## 3-4. ② 프록시로 백엔드 연결하기

### 먼저 백엔드 주소에 `/api` 를 붙입니다

```diff
-@app.get("/health")
+@app.get("/api/health")

-@app.get("/profile")
+@app.get("/api/profile")
```

**이유:** 프록시 규칙을 **한 줄로 끝내기 위해서**입니다. `/api`로 시작하면 백엔드, 나머지는 화면 — 이렇게 갈리면 나중에 주소가 20개로 늘어도 설정은 그대로입니다.

### `frontend/vite.config.ts`

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // '/api' 로 시작하는 요청은 파이썬 백엔드(8080)로 그대로 넘긴다.
      // 브라우저 입장에서는 전부 같은 주소(5174)라서 CORS 문제가 생기지 않는다.
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },
})
```

`vite.config.ts`를 저장하면 Vite가 **알아서 재시작**합니다.

```
[vite] vite.config.ts changed, restarting server...
```

<details>
<summary><b>▸ 휴대폰 등 다른 기기에서 보고 싶다면 (<code>0.0.0.0</code> 바인딩)</b></summary>

기본값은 `localhost` 라서 **이 컴퓨터에서만** 접속됩니다. 휴대폰으로 확인하고 싶으면 한 줄을 켜세요.

```ts
server: {
  // 모든 네트워크 인터페이스에 바인딩한다.
  host: '0.0.0.0',

  proxy: { '/api': { target: 'http://127.0.0.1:8080', changeOrigin: true } },
}
```

터미널에 주소가 하나 더 찍힙니다.

```
➜  Local:    http://localhost:5173/
➜  Network:  http://192.168.0.12:5173/
```

**백엔드는 열 필요가 없습니다.**

```
휴대폰 ──▶ 192.168.0.12:5173 (Vite)
                  │
                  └──▶ 127.0.0.1:8080 (FastAPI)   ← 서버 안쪽에서만 호출
```

`/api` 요청을 **Vite 프로세스가 서버 쪽에서** 넘기기 때문에, FastAPI는 계속 `127.0.0.1` 에만 열려 있어도 됩니다. **밖으로 노출되는 문은 하나(5173)뿐**입니다.

그리고 **CORS도 안 생깁니다.** 휴대폰 브라우저 입장에서도 모든 요청이 `192.168.0.12:5173` 한 곳으로 가니까요 — 여기서도 프록시 구조가 그대로 통합니다.

> ⚠️ **공용 와이파이에서는 켜지 마세요.**
> 같은 네트워크의 **누구나** 접속할 수 있고, `https_only=False` 라서 비밀코드가 **암호화 없이(http)** 오갑니다. 집이나 사무실 네트워크에서만 쓰세요.

> Windows 방화벽 팝업이 뜨면 **개인 네트워크만** 체크하고 허용하면 됩니다.

</details>

---

## 3-5. ③ Pydantic DTO와 타입 자동 생성

### 3-5.1 먼저 백엔드에 "응답의 모양"을 명시해야 합니다

Step 2까지 백엔드는 이렇게 응답했습니다.

```python
return {"profile": row}
```

FastAPI 입장에서 이건 **"딕셔너리 하나"** 일 뿐, 안에 뭐가 들었는지 모릅니다. `/openapi.json`을 열어봐도 응답 스키마가 **비어 있습니다.** 타입을 생성해봐야 `unknown`만 나옵니다.

기술 문서의 이 규칙이 바로 그 해결책입니다.

> FE를 포함한 외부로 나가는 모든 데이터는 **Pydantic DTO**를 통해 정의된 스키마를 이용하며, 데이터베이스와 직접 연결된 엔티티의 원형은 이용하지 않는다.

### 3-5.2 DTO 작성

```python
from datetime import datetime
from pydantic import BaseModel


class Profile(BaseModel):
    id: int
    full_name: str
    headline: str
    summary: str | None
    updated_at: datetime


class ProfileResponse(BaseModel):
    profile: Profile


@app.get("/api/profile", response_model=ProfileResponse)
def get_profile():
    ...
    return ProfileResponse(profile=Profile(**row))
```

<details>
<summary><b>▸ DTO가 뭐고, 왜 DB 테이블을 그대로 안 내보내나요?</b></summary>

**DTO** = Data Transfer Object, "밖으로 나갈 데이터의 모양"을 적어둔 것입니다.

지금은 테이블 컬럼과 DTO가 똑같아서 중복처럼 보입니다. 하지만 곧 달라집니다.

**① 내보내면 안 되는 컬럼이 생깁니다**

나중에 `profile` 테이블에 이런 게 추가된다고 해봅시다.

```sql
alter table public.profile add column internal_memo text;
```

DTO가 없으면 `select *` 결과가 그대로 나가면서 **내부 메모가 방문자에게 노출**됩니다.
DTO가 있으면 `Profile`에 없는 컬럼은 **애초에 밖으로 나갈 수 없습니다.**

**② 테이블 구조와 API 형태는 원래 다릅니다**

경력을 보여줄 때 API는 이런 모양이 자연스럽습니다.

```json
{ "experiences": [ { "org": "...", "highlights": ["...", "..."] } ] }
```

하지만 DB에서는 `experience` 테이블과 `experience_highlight` 테이블로 나뉘어 있습니다.
**테이블 구조를 그대로 노출하면 화면이 DB 구조에 묶여버립니다.**

**③ 이게 곧 계약서입니다**

DTO는 그대로 OpenAPI 문서가 되고, 그게 그대로 프론트엔드 타입이 됩니다.

```
Pydantic DTO  →  OpenAPI 문서  →  TypeScript 타입
   (내가 씀)       (자동)          (자동)
```

**DTO를 안 쓰면 이 사슬이 시작조차 안 됩니다.**

</details>

### 3-5.3 확인 — OpenAPI 문서에 모양이 들어갔나

**http://127.0.0.1:8080/openapi.json** 에서 `Profile`을 찾아보세요.

```json
"Profile": {
  "properties": {
    "id": { "type": "integer" },
    "full_name": { "type": "string" },
    "headline": { "type": "string" },
    "summary": { "anyOf": [{ "type": "string" }, { "type": "null" }] },
    "updated_at": { "type": "string", "format": "date-time" }
  },
  "required": ["id", "full_name", "headline", "summary", "updated_at"]
}
```

### 3-5.4 타입 생성 명령 등록

`frontend/package.json`의 `scripts`에 추가합니다.

```json
"gen:api": "npx -y openapi-typescript@7 http://127.0.0.1:8080/openapi.json -o src/api/schema.d.ts"
```

그리고 실행합니다. **설치는 필요 없습니다.**

```
npm run gen:api
```

```
✨ openapi-typescript 7.13.0
🚀 http://127.0.0.1:8080/openapi.json → src/api/schema.d.ts [412ms]
```

<details>
<summary><b>▸ 왜 설치하지 않고 <code>npx</code>로 실행하나요?</b></summary>

`openapi-typescript`는 **한 번 실행하고 끝나는 코드 생성기**입니다. `.d.ts` 파일 하나를 뱉고 사라져요. 우리 앱이 브라우저에서 돌 때는 쓰이지 않습니다.

그러니 프로젝트에 설치할 이유가 없습니다.

| | 프로젝트에 설치 | `npx`로 실행 |
|---|---|---|
| 버전 충돌 | 발생 가능 | 없음 — 자기 것을 따로 씀 |
| `node_modules` | 커짐 | 그대로 |
| 앱 실행에 필요? | ❌ 아님 | ❌ 아님 |

`@7`로 버전을 고정해둬서, 나중에 8버전이 나와도 결과물이 갑자기 달라지지 않습니다.

</details>

<details>
<summary><b>▸ 트러블슈팅 — <code>npm error code ERESOLVE</code> (peer dependency 충돌)</b></summary>

**증상**
```
npm error code ERESOLVE
npm error ERESOLVE unable to resolve dependency tree
npm error
npm error While resolving: frontend@0.0.0
npm error Found: typescript@6.0.3
npm error   dev typescript@"~6.0.2" from the root project
npm error
npm error Could not resolve dependency:
npm error peer typescript@"^5.x" from openapi-typescript@7.13.0
```

**읽는 법**

| 줄 | 뜻 |
|---|---|
| `Found: typescript@6.0.3` | 우리 프로젝트에 깔린 버전 |
| `peer typescript@"^5.x" from openapi-typescript` | 그 도구는 **5.x랑 같이 써야 한다**고 선언해둠 |

**peer dependency가 뭔가요?**
"나는 이 패키지랑 **같이** 써야 한다"는 선언입니다. 플러그인 같은 것들이 씁니다.
예를 들어 `@vitejs/plugin-react`는 `vite`가 있어야 의미가 있죠. 그런데 자기가 vite를 따로 설치하면 **두 개의 vite**가 생겨서 이상하게 동작합니다. 그래서 "설치는 네가 해라, 대신 버전은 이 범위여야 한다"고 선언합니다.
이번엔 그 **버전 범위가 안 맞아서** 난 에러입니다.

**해결 — 상황에 따라 다릅니다**

**① 코드 생성기·린터처럼 "빌드할 때만 쓰는 도구"라면 → `npx`**

```
npx -y openapi-typescript@7 http://127.0.0.1:8080/openapi.json -o src/api/schema.d.ts
```
프로젝트에 설치하지 않고 격리된 공간에서 실행하므로 **충돌 자체가 사라집니다.** 이 문서가 택한 방법입니다.

**② 앱이 실행될 때 쓰이는 라이브러리라면 → `npx` 불가**

`openapi-fetch`처럼 브라우저에서 돌아가는 코드는 반드시 `node_modules`에 있어야 합니다. 이 경우:

- 라이브러리의 최신 버전이 나왔는지 확인 (`npm view <패키지> versions`)
- 그래도 안 되면 프로젝트의 문제 패키지 버전을 조정

**❌ `--legacy-peer-deps` 는 마지막 수단입니다**

```
npm install -D openapi-typescript --legacy-peer-deps
```

이건 "호환 안 된다는 경고를 무시하고 그냥 깔아라"입니다. 설치는 되지만 **도구가 지원한다고 선언하지 않은 조합으로 실행**되므로, 실행 중에 알 수 없는 에러가 날 수 있습니다.

에러가 나면 원인 찾기도 어렵습니다 — 문제의 원인이 설치 시점에 있는데 증상은 한참 뒤에 나오거든요. `npx`로 해결되는 상황이라면 그쪽을 쓰세요.

</details>

<details>
<summary><b>▸ 트러블슈팅 — <code>gen:api</code> 가 실패한다</b></summary>

**원인 대부분은 백엔드가 꺼져 있는 것입니다.**

이 명령은 `http://127.0.0.1:8080/openapi.json` 주소를 **직접 읽어옵니다.** 백엔드가 안 돌고 있으면 읽을 게 없습니다.

**확인**
1. 백엔드 터미널에서 `uvicorn`이 돌고 있는지
2. 브라우저에서 `http://127.0.0.1:8080/openapi.json` 이 열리는지
3. 포트 번호가 맞는지 (8080이 아니라면 `package.json`의 `gen:api` 주소도 고쳐야 합니다)

> Vite(`npm run dev`)는 꺼져 있어도 됩니다. 백엔드만 있으면 됩니다.

</details>

### 3-5.5 생성된 타입 쓰기

```
frontend/src/api/
├── schema.d.ts    ← 자동 생성. 절대 손대지 않는다
└── types.ts       ← 거기서 짧은 이름만 꺼낸다
```

`src/api/types.ts`

```ts
// 이 파일에서는 타입을 "만들지" 않는다.
// 자동 생성된 schema.d.ts 에서 필요한 것을 꺼내 짧은 이름만 붙인다.
import type { paths } from './schema'

export type ProfileResponse =
  paths['/api/profile']['get']['responses']['200']['content']['application/json']

export type Profile = ProfileResponse['profile']
```

**타입을 만든 게 아니라 "꺼낸" 것**입니다. `/api/profile` 주소의 `GET` 응답 200번의 JSON 형태 — 그걸 그대로 가리키고 이름만 붙였습니다.

<details>
<summary><b>▸ 트러블슈팅 — 에디터에 빨간 줄이 잔뜩 뜬다</b></summary>

**증상**
```
Cannot find module './schema' or its corresponding type declarations.
```

**원인**
`schema.d.ts`가 아직 생성되지 않았습니다. 이 파일은 **자동 생성물이라 저장소에서 받아온 직후에는 없을 수 있습니다.**

**해결**
```
npm run gen:api
```

> `schema.d.ts`는 **깃에 커밋하세요.** 그래야 백엔드를 켜지 않아도 프론트엔드가 빌드되고, API가 언제 어떻게 바뀌었는지 커밋 기록에 남습니다.

</details>

### 3-5.6 이게 왜 중요한지 직접 확인

**실험:** `App.tsx`에서 `full_name`을 `fullName`으로 바꿔보세요.

```
Property 'fullName' does not exist on type 'Profile'.
  Did you mean 'full_name'?
```

**더 중요한 시나리오** — 백엔드에서 `summary`를 `bio`로 바꿨다면:

```
① backend/main.py 에서 컬럼명 변경
② npm run gen:api
③ 프론트엔드에서 summary 쓰던 곳이 전부 컴파일 에러
```

**고쳐야 할 곳을 컴퓨터가 다 찾아줍니다.** 백엔드와 프론트엔드가 어긋난 채로 배포되는 사고가 구조적으로 막힙니다.

---

## 3-6. ④ 이력서답게 다듬기

### 3-6.1 먼저 API 호출을 분리합니다

```
frontend/src/
├── api/
│   ├── schema.d.ts   자동 생성
│   ├── types.ts      이름만 꺼냄
│   └── client.ts     ★ 백엔드 호출은 전부 여기
├── App.tsx           화면만 담당
└── index.css         스타일
```

**`App.tsx`는 데이터를 "어떻게" 가져오는지 몰라도 됩니다.** `getProfile()`을 부를 뿐이죠.

덕분에 다음 단계(⑤)에서 호출 방식을 통째로 바꿔도 **화면 코드는 한 줄도 안 건드립니다.**

### 3-6.2 한글에만 필요한 CSS 하나

```css
word-break: keep-all;
```

이게 없으면 브라우저가 한글을 **글자 단위로 아무 데서나 잘라버립니다.**

```
없으면:  온라인 이력서를 직접 만들고 있습니
         다.                              ← 단어 중간에서 뚝

있으면:  온라인 이력서를 직접
         만들고 있습니다.                  ← 단어 단위로
```

한국어 웹 페이지를 만들 때 거의 항상 넣는 한 줄입니다.

### 3-6.3 다크모드 — CSS 변수 + 미디어 쿼리

```css
:root {
  --bg: #ffffff;
  --fg: #1a1d21;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #16181b;
    --fg: #e8ebee;
  }
}
```

브라우저가 운영체제 설정을 알려주기 때문에, **자바스크립트 없이** 운영체제 테마를 따라갑니다.

### 3-6.4 인쇄 CSS — 이력서니까 중요합니다

페이지에서 **Ctrl + P** 를 누르면 미리보기가 **흰 배경 + 검은 글씨**로 바뀝니다.

```css
@media print {
  :root {
    --bg: #ffffff;
    --fg: #000000;
    --accent: #000000;
  }
  .cv { max-width: none; padding: 0; }
}
```

화면용 색을 그대로 인쇄하면 잉크만 낭비되고 읽기도 나쁩니다. **"대상으로 저장 → PDF"** 를 고르면 이력서 PDF가 나옵니다.

### 3-6.5 탭 제목을 이름으로

```tsx
useEffect(() => {
  if (profile) {
    document.title = `${profile.full_name} — 이력서`
  }
}, [profile])
```

`[profile]`은 **"profile이 바뀔 때마다 실행하라"** 는 뜻입니다. 처음엔 `null`이라 아무것도 안 하고, 데이터가 도착하면 그때 제목을 바꿉니다.

<details>
<summary><b>▸ <code>useState</code> 와 <code>useEffect</code> 가 뭔가요?</b></summary>

| | 뜻 |
|---|---|
| `useState` | 화면이 기억해야 할 값. **값이 바뀌면 React가 알아서 화면을 다시 그립니다** |
| `useEffect(fn, [])` | 화면이 **처음 뜰 때 딱 한 번** 실행 |
| `useEffect(fn, [x])` | **`x`가 바뀔 때마다** 실행 |

마지막 `[]`를 **의존성 배열**이라고 합니다. "이 안의 값이 바뀌면 다시 실행해라"는 뜻이고, 비어 있으면 "바뀔 게 없으니 처음 한 번만"이 됩니다.

</details>

### 3-6.6 화면의 세 가지 상태

```
data 없음 + error 없음  →  "불러오는 중..."
error 있음              →  빨간 에러 메시지
data 있음               →  이력서 내용
```

**데이터를 다루는 화면이라면 반드시 필요한 세 갈래입니다.** 지금은 단순하지만 구조는 실전과 같습니다.

---

## 3-7. ⑤ `openapi-fetch` — 마지막 구멍 메우기

### 3-7.1 지금 문제

`client.ts`에 두 개의 구멍이 있었습니다.

```ts
const res = await fetch('/api/profile')       // ① 주소를 검사하지 않음
return res.json() as Promise<ProfileResponse>  // ② 응답 모양을 믿기만 함
```

```ts
fetch('/api/profil')     // 오타 — 조용히 통과, 실행하면 404
```

`as`는 "이 모양이라고 **쳐줘**"라는 선언일 뿐이라, 실제로 그런지 아무도 확인하지 않습니다.

### 3-7.2 해결

```
npm i openapi-fetch
```

```diff
-import type { ProfileResponse } from './types'
+import createClient from 'openapi-fetch'
+import type { paths } from './schema'
+
+const client = createClient<paths>()

-export async function getProfile(): Promise<ProfileResponse> {
-  const res = await fetch('/api/profile')
-  if (!res.ok) {
-    throw new Error(`서버가 ${res.status} 로 응답했습니다`)
-  }
-  return res.json() as Promise<ProfileResponse>
-}
+export async function getProfile() {
+  const { data, error, response } = await client.GET('/api/profile')
+  if (error !== undefined || data === undefined) {
+    throw new Error(`서버가 ${response.status} 로 응답했습니다`)
+  }
+  return data
+}
```

**`App.tsx`는 한 줄도 안 바뀝니다.** 아까 호출을 분리해둔 보상입니다.

### 3-7.3 확인 — 주소에 오타를 내보세요

```ts
const { data, error, response } = await client.GET('/api/profil')
```

```
Argument of type '"/api/profil"' is not assignable to parameter of type
'"/" | "/api/health" | "/api/profile"'
```

**백엔드에 실제로 있는 주소 목록을 TypeScript가 알고 있습니다.**

주소를 바꾸면 응답 타입도 자동으로 따라 바뀝니다. `client.GET('/api/health')`로 바꾸면 그 순간 `data`가 `{ database, postgres_version }`이 됩니다.

### 3-7.4 없어진 것들

| 사라진 것 | 이유 |
|---|---|
| `as Promise<ProfileResponse>` | 캐스팅 불필요 — client가 이미 타입을 앎 |
| `: Promise<ProfileResponse>` | 반환 타입을 안 적어도 추론됨 |
| 주소 오타 위험 | 존재하는 주소만 컴파일됨 |

**손으로 타입을 적는 곳이 프론트엔드에 한 군데도 없습니다.**

### 3-7.5 솔직하게 — 완전히 해결된 건 아닙니다

**여전히 런타임 검증은 없습니다.** 백엔드가 갑자기 다른 모양을 보내면 화면이 깨집니다.

다만 이제 그건 **"타입 안전성" 문제가 아니라 "백엔드가 계약을 어겼다"는 문제**입니다. 그리고 그 계약은 백엔드의 Pydantic DTO가 강제하고 있어서 실수로 어길 수가 없습니다.

진짜 런타임 검증(Zod 등)까지 넣는 건 **남이 만든 외부 API를 쓸 때** 필요하고, 내가 만든 백엔드에는 과합니다.

---

## 3-8. 코드 전체

### `backend/main.py` (DTO 부분)

```python
from datetime import datetime
from pydantic import BaseModel


class MessageResponse(BaseModel):
    message: str


class HealthResponse(BaseModel):
    database: str
    postgres_version: str


class Profile(BaseModel):
    id: int
    full_name: str
    headline: str
    summary: str | None
    updated_at: datetime


class ProfileResponse(BaseModel):
    profile: Profile


@app.get("/", response_model=MessageResponse)
def root():
    return MessageResponse(message="서버가 살아있습니다")


@app.get("/api/health", response_model=HealthResponse)
def health():
    with psycopg.connect(**CONN_INFO) as conn:
        with conn.cursor() as cur:
            cur.execute("select version()")
            version = cur.fetchone()[0]

    return HealthResponse(database="연결됨", postgres_version=version)


@app.get("/api/profile", response_model=ProfileResponse)
def get_profile():
    with psycopg.connect(**CONN_INFO) as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                select id, full_name, headline, summary, updated_at
                from public.profile
                order by id
                limit 1
                """
            )
            row = cur.fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="프로필이 아직 없습니다.")

    # DB 결과(dict)를 DTO 로 변환해서 내보낸다.
    # 컬럼이 늘어나도 DTO 에 없으면 밖으로 나가지 않는다.
    return ProfileResponse(profile=Profile(**row))
```

### `frontend/vite.config.ts`

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },
})
```

### `frontend/src/api/client.ts`

```ts
import createClient from 'openapi-fetch'
import type { paths } from './schema'

// 자동 생성된 paths 타입을 통째로 넘겨준다.
// 이 client 는 우리 백엔드에 "실제로 존재하는 주소"만 받아들이고,
// 응답 타입도 그 주소에 맞춰 자동으로 결정된다.
const client = createClient<paths>()

export async function getProfile() {
  const { data, error, response } = await client.GET('/api/profile')

  if (error !== undefined || data === undefined) {
    throw new Error(`서버가 ${response.status} 로 응답했습니다`)
  }

  return data
}
```

### `frontend/src/App.tsx`

```tsx
import { useEffect, useState } from 'react'
import { getProfile } from './api/client'
import type { Profile } from './api/types'

function App() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getProfile()
      .then((data) => setProfile(data.profile))
      .catch((e: Error) => setError(e.message))
  }, [])

  useEffect(() => {
    if (profile) {
      document.title = `${profile.full_name} — 이력서`
    }
  }, [profile])

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

  return (
    <main className="cv">
      <header className="cv-header">
        <h1>{profile.full_name}</h1>
        <p className="headline">{profile.headline}</p>
        {profile.summary && <p className="summary">{profile.summary}</p>}
      </header>

      <footer className="cv-footer">
        마지막 수정{' '}
        {new Date(profile.updated_at).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </footer>
    </main>
  )
}

export default App
```

---

## 3-9. 이번에 배운 개념

| 용어 | 한 줄 설명 |
|---|---|
| **Vite** | 프론트엔드 개발 서버 + 빌드 도구. 저장하면 즉시 화면에 반영 |
| **HMR** | Hot Module Replacement. 새로고침 없이 바뀐 부분만 교체 |
| **프록시** | 요청을 대신 받아 다른 서버로 넘겨주는 것 |
| **DTO** | 밖으로 나갈 데이터의 모양. DB 구조와 API 형태를 분리해줌 |
| **`response_model`** | FastAPI에 "이 주소는 이런 모양으로 응답한다"고 알려주는 설정 |
| **OpenAPI** | API의 주소·요청·응답을 기계가 읽을 수 있게 적어둔 문서 |
| **peer dependency** | "나는 이 패키지랑 같이 써야 한다"는 선언 |
| **`useState`** | 화면이 기억하는 값. 바뀌면 화면이 다시 그려짐 |
| **`useEffect`** | 화면이 뜰 때(또는 특정 값이 바뀔 때) 실행할 코드 |
| **의존성 배열 `[]`** | `useEffect`를 언제 다시 실행할지 정하는 목록 |

---

## 3-10. 다음 단계 (Step 4)

> 🎯 **내가 로그인해서 이력서를 직접 수정합니다.**

지금은 내용을 바꾸려면 Supabase SQL Editor에 들어가야 합니다. 이제 **웹에서 편집**하게 만듭니다.

```
[지금]    Supabase 대시보드에서 SQL 실행 → 내용 변경
[Step 4]  이력서 화면에서 로그인 → 그 자리에서 수정 → 저장
```

여기서 새로 등장할 것들:

| | |
|---|---|
| **`POST` / `PUT` 요청** | 브라우저가 본 요청 전에 허락을 먼저 묻는 **Preflight**를 실제로 만나게 됩니다 |
| **쿠키와 세션** | `httpOnly`, `SameSite` 같은 쿠키 속성이 실전으로 |
| **폼 다루기** | 입력값 관리, 검증, 저장 중 상태 |
| **한 화면 두 모드** | 같은 주소에서 읽기 ↔ 편집 전환 |

### 상태관리 라이브러리는 그때 검토합니다

지금은 `fetch` 한 번뿐이라 아무것도 필요 없습니다. Step 4에서 데이터가 여러 개가 되고 "저장 후 목록 갱신"이 필요해지면 그때 판단합니다.

| | 예시 | 맞는 도구 |
|---|---|---|
| **서버 데이터** | 프로필, 경력 목록 — 서버가 진실이고 언젠가 낡음 | **TanStack Query** |
| **클라이언트 상태** | 모달 열림, 다크모드 토글, 로그인 여부 | Zustand / Context |

**이 앱에서 앞으로 아플 곳은 전부 위쪽입니다.** Zustand 같은 도구에 서버 데이터를 넣으면 "언제 다시 불러올지"를 전부 손으로 관리하게 돼서 오히려 복잡해집니다.

← 이전: [Step 2 — 첫 테이블 만들고 API로 읽어오기](step2_first_table_api.md)
다음 → [Step 4 — 내가 로그인해서 수정하기](step4_login_and_edit.md)
