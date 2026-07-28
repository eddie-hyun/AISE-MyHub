# MyHub — 실행 방법

온라인 이력서. **터미널 2개**를 켜면 됩니다.

---

## 1. 백엔드 (파이썬)

터미널 1번 — 프로젝트 루트에서:

```
cd backend
```

가상환경 활성화 — **터미널 종류에 맞는 것 하나만**

| 터미널 | 명령 |
|---|---|
| cmd | `.venv\Scripts\activate` |
| PowerShell | `.\.venv\Scripts\Activate.ps1` |
| macOS / Linux | `source .venv/bin/activate` |

프롬프트 앞에 **`(.venv)`** 가 붙으면 성공입니다. 그다음:

```
uvicorn main:app --reload --port 8080
```

✅ `Application startup complete.` 가 뜨면 켜진 겁니다.

---

## 2. 프론트엔드 (React)

터미널 2번 — 프로젝트 루트에서:

```
cd frontend
```

```
npm run dev
```

✅ 터미널에 뜨는 `http://localhost:5173/` 주소를 브라우저에서 엽니다.
(5173이 사용 중이면 5174 등으로 자동으로 올라갑니다. **찍힌 주소를 쓰세요.**)

> 📱 **휴대폰 등 다른 기기에서 보고 싶다면** — `frontend/vite.config.ts` 의 `host: '0.0.0.0'` 주석을 해제하세요. 자세한 내용과 주의사항은 [Step 3 설명서](docs/guide/step3_react_frontend.md)에 있습니다.

---

## 3. 접속 주소

| 주소 | 화면 |
|---|---|
| `http://localhost:5173` | 이력서 (아래 **관리자 로그인** → 그 자리에서 편집) |
| `http://127.0.0.1:8080/docs` | API 문서 (직접 테스트 가능) |

편집용 페이지는 따로 없습니다. 이력서 맨 아래 **관리자 로그인** 을 눌러
비밀코드를 넣으면, **보고 있던 그 화면의 글자를 그대로 눌러서 고칩니다.**
고친 뒤 위쪽 막대의 **저장** (또는 `Ctrl + S`) 을 누르면 반영됩니다.

> 예전 주소 `http://localhost:5173/admin` 으로 들어오면 이력서로 넘어갑니다.

---

## 끄기

각 터미널에서 **`Ctrl + C`**

---

## 자주 쓰는 것

### 테이블은 서버가 알아서 만듭니다

`backend/models.py`에 정의된 엔티티를 기준으로, **서버가 시작될 때 없는 테이블을 자동으로 생성**합니다. Supabase에서 SQL을 실행할 일이 없습니다.

```
[init] 테이블 생성 + 잠금: profile
[init] 초기 데이터 1건 입력
```

서버 로그에 이런 줄이 뜨면 새로 만들어진 것이고, 안 뜨면 이미 있다는 뜻입니다.

### 데이터베이스를 통째로 초기화하려면

`backend` 폴더에서 (**서버를 끄고**):

```
python init_db.py --reset
```

⚠️ **기존 테이블과 데이터가 모두 사라집니다.** 다시 만들고 초기 데이터 1건을 넣습니다.

### 백엔드 API를 고쳤다면 → 타입 다시 생성

`frontend` 터미널에서 (백엔드가 켜져 있어야 합니다):

```
npm run gen:api
```

이걸 안 하면 프론트엔드에서 *"그런 주소 없는데?"* 컴파일 에러가 납니다.

### 관리자 비밀코드를 잊었다면

`backend/.env` 파일의 `ADMIN_PASSCODE` 를 확인하세요.

---

## 처음 설정할 때 (새 컴퓨터에서 받았을 경우)

<details>
<summary><b>▸ 최초 1회만 하는 설정</b></summary>

### 백엔드

```
cd backend
python -m venv .venv
```

활성화 후:

```
pip install -r requirements.txt
```

`.env` 파일 만들기:

```
copy .env.example .env
notepad .env
```

Supabase 접속 정보 · `ADMIN_PASSCODE` · `SESSION_SECRET` 을 채웁니다.
`SESSION_SECRET` 은 아래 명령으로 만듭니다.

```
python -c "import secrets; print(secrets.token_hex(32))"
```

> **테이블은 따로 만들 필요 없습니다.** 서버를 처음 켜면 `models.py` 기준으로 자동 생성되고 초기 데이터 1건이 들어갑니다.

### 프론트엔드

```
cd frontend
npm install
npm run gen:api
```

</details>

---

## 문제가 생기면

각 단계 설명서에 **증상별 트러블슈팅**이 정리돼 있습니다.

| 문서 | 다루는 문제 |
|---|---|
| [Step 1](docs/guide/step1_backend_supabase.md) | 포트 충돌, `.env` 못 찾음, DB 접속 실패, 경로 슬래시 |
| [Step 2](docs/guide/step2_first_table_api.md) | `uvicorn` 명령 없음, 패키지 못 찾음, 권한/RLS |
| [Step 3](docs/guide/step3_react_frontend.md) | `npm` 위치, 포트 번호, 타입 생성 실패, CORS |
| [Step 4](docs/guide/step4_login_and_edit.md) | 로그인 안 됨, 세션 만료, `.env` 특수문자, 쿠키·XSS·SQL 인젝션 |
| [Step 5](docs/guide/step5_orm_sqlalchemy.md) | DB 연결 실패, 드라이버 이름, 컬럼 추가가 반영 안 됨, ORM |

### 가장 흔한 두 가지

**`'uvicorn'은(는) 내부 또는 외부 명령...`**
→ 가상환경 활성화를 안 했습니다. 프롬프트에 `(.venv)` 가 있는지 확인하세요.

**`npm` 명령이 안 먹음**
→ `frontend` 폴더가 아닙니다. `cd frontend` 하세요.

---

## 폴더 구조

```
project-root/
├── backend/           파이썬 서버 (FastAPI) — 포트 8080
│   ├── main.py            엔드포인트
│   ├── db.py              엔진 · 세션 · Base
│   ├── models.py          ORM 엔티티   (테이블의 모양)
│   ├── schemas.py         Pydantic DTO (API의 모양)
│   ├── init_db.py         시작 시 테이블 자동 생성 + seed
│   ├── .env               내 접속 정보 (깃에 안 올라감)
│   └── requirements.txt
├── frontend/          화면 (React) — 포트 5173
│   └── src/
│       ├── api/           백엔드 호출 + 자동 생성 타입
│       ├── components/    편집 도구 (제자리 입력칸 · 도구막대 · 로그인)
│       └── routes/        화면 (Cv.tsx — 읽기와 편집이 한 화면)
└── docs/
    ├── guide/         단계별 설명서
    └── architecture/  아키텍처 성장 다이어그램 (.excalidraw)
```
