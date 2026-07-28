# Step 1 — 파이썬 백엔드와 Supabase 연결하기

> MyHub(온라인 이력서) 개발 기록 · 2026-07-27
> 이 문서 하나만 따라 하면 처음부터 끝까지 재현할 수 있습니다.

---

## 전체 로드맵에서 지금 어디쯤인가

```
[✅ Step 1]  백엔드 ↔ Supabase 연결        ← 지금 여기
[   Step 2]  테이블 만들고 데이터 읽기
[   Step 3]  화면(프론트엔드) 붙이기
[   Step 4]  내가 로그인해서 수정하기
[   Step 5]  ORM 도입 (SQLAlchemy)
```

> 🖥️ **터미널 안내** — 명령어는 **cmd / PowerShell / macOS·Linux** 세 가지를 모두 적어뒀습니다. 본인 환경의 것만 쓰시면 됩니다.
> 문제가 생겼을 때 보는 **트러블슈팅은 해당 단계 바로 아래에 접어두었습니다.** `▸` 를 클릭하면 펼쳐집니다.

---

## 1. 이 단계의 목표

> 🎯 **"파이썬 서버가 Supabase 데이터베이스와 진짜로 대화할 수 있다"를 눈으로 확인하는 것.**
> 딱 이거 하나입니다. 이력서 기능도, 화면도, 로그인도 아직 없습니다.

### 왜 이런 시시한 것부터 하나요

집을 지을 때 수도관이 물을 실어 나르는지부터 확인하는 것과 같습니다.
화장실, 부엌, 세탁실을 다 만들어놓고 나서 "어? 물이 안 나오네?"를 발견하면, 어디가 문제인지 찾느라 훨씬 고생합니다.

그래서 **가장 얇은 한 줄기**를 먼저 끝까지 통과시킵니다.

```
브라우저  →  파이썬 서버  →  Supabase (PostgreSQL)
   ①            ②                ③
```

이 세 칸이 한 번 이어지면, 그 다음부터는 여기에 살을 붙이는 일만 남습니다.

| | |
|---|---|
| ✅ **만든 것** | 파이썬 서버, DB 접속, 연결 확인용 주소 1개 |
| ❌ **아직 없는 것** | 테이블, 이력서 데이터, 화면, 로그인, 인터넷 배포 |

---

## 2. 완성된 모습

서버를 켜고 브라우저에서 `http://127.0.0.1:8080/health` 에 들어가면 이게 나옵니다.

```json
{
  "database": "연결됨",
  "postgres_version": "PostgreSQL 17.4 on aarch64-unknown-linux-gnu, ..."
}
```

이 글자가 보이면 **파이썬이 Supabase에 접속해서 실제로 질문을 던지고 답을 받아온 것**입니다.
(`select version()` 이라는 질문을 던졌습니다 — "너 몇 버전이니?")

---

## 3. 파일 구조와 작업 위치

```
project-root/     ← 프로젝트 루트
├── .gitignore
├── docs/
└── backend/                          ← ★ 터미널은 여기서 연다
    ├── .venv/              이 프로젝트 전용 파이썬 창고 (자동 생성)
    ├── main.py             서버 코드 (전부 여기)             ─┐
    ├── requirements.txt    필요한 패키지 목록                 │ 1단계에서 만듦
    ├── .env.example        .env 를 어떻게 채우는지 알려주는 양식 ─┘
    └── .env                내 접속 정보 (깃에 안 올라감, 4단계에서 직접 만듦)
```

### 왜 `backend` 폴더 안에서 작업하나요

루트에서도 할 수는 있지만, **`backend`로 들어가서 작업하는 쪽이 확실히 낫습니다.**

| | 루트에서 | `backend` 안에서 |
|---|---|---|
| 서버 실행 | `... -m uvicorn main:app --app-dir backend --port 8080` | `uvicorn main:app --port 8080` |
| 파일 복사 | `copy backend\.env.example backend\.env` | `copy .env.example .env` |
| `--app-dir` | 필요함 | **불필요** |

`--app-dir`은 "`main.py`가 다른 폴더에 있다"고 알려주는 옵션인데, 애초에 그 폴더 안에 있으면 필요가 없습니다. 명령도 짧아지고 실수할 여지도 줄어듭니다.

> 💡 **나중에 프론트엔드가 생기면** 터미널을 2개 열게 됩니다 — 하나는 `backend`에서 파이썬 서버, 하나는 `frontend`에서 화면 서버. 폴더별로 터미널을 따로 여는 게 원래 일반적인 방식이라, 지금부터 그 습관을 들이는 게 좋습니다.

### `.env` 와 `.env.example` 을 왜 나누나요

- **`.env`** — 비밀번호가 들어 있는 **진짜** 파일. 절대 남에게 주면 안 되고, 깃에도 안 올립니다.
- **`.env.example`** — "이런 항목들을 채우면 된다"는 **양식**. 값은 가짜입니다. 깃에 올립니다.

이렇게 해두면 나중에 다른 사람(또는 미래의 나)이 이 프로젝트를 받았을 때, `.env.example`을 보고 뭘 채워야 하는지 알 수 있습니다.

---

## 4. 처음부터 따라 하기

### 0단계 — Supabase 프로젝트 만들기

[supabase.com](https://supabase.com) 가입 후 새 프로젝트를 만듭니다.

**Security 설정은 이렇게:**

| 항목 | 선택 | 이유 |
|---|---|---|
| Enable Data API | ✅ 켜둠 | 나중의 선택지를 닫지 않기 위해 |
| Automatically expose new tables | ⬜ **끄기** | 새 테이블이 자동으로 외부에 열리지 않게 |
| Enable automatic RLS | ✅ **켜기** | 새 테이블은 기본이 "아무도 못 봄" |

> 💡 **왜 이게 중요한가**
> Supabase는 `anon key`라는 걸 줍니다. 이건 비밀번호가 아니라 **공개되는 값**이에요. 웹사이트 자바스크립트 안에 그대로 들어가서 누구나 볼 수 있습니다.
> 그래서 "anon key만 있으면 데이터를 읽을 수 있다"는 상태가 되면 **인터넷 전체에 DB를 열어둔 것**과 같습니다. 위의 두 설정이 그 사고를 막는 자물쇠입니다.

> ⚠️ **Database Password는 반드시 따로 저장해두세요.** 나중에 다시 볼 수 없고 재설정만 가능합니다.
> 그리고 **영문자와 숫자만** 쓰는 걸 권합니다 (이유는 5단계 트러블슈팅 ④에). Region은 **Seoul** 또는 **Tokyo**.

---

### 1단계 — 프로젝트 뼈대 만들기

> 아직 `backend` 폴더 자체가 없습니다. 이 뼈대는 손으로 한 줄씩 짠 게 아니라, **AI 코딩 에이전트(Claude Code)에게 아래 프롬프트를 그대로 줘서** 만들었습니다.

```
`backend` 디렉토리에 다음 기술스택을 갖는 파이썬 백엔드 프로젝트 초기화.

* python
* fastapi
* supabase (postgresql, session spooler) + psycopg 동기호출


supabase 데이터베이스에 접속하여 연결된 데이터베이스의 상태와 버전을 json으로 응답하는 /health 엔드포인트를 미니멀하게 구현.
구현체는 main.py 파일 하나로 통합.
필요한 conn info, api secret 등은 .env 파일에 만들어서 서버가 env로부터 로드하도록 함. (.env.example로 예제를 제공해야 함)
필요한 디펜던시는 pip requirements.txt 파일로 정리.
```

이 프롬프트 하나로 아래 세 파일이 만들어집니다.

| 파일 | 역할 |
|---|---|
| `backend/main.py` | 서버 코드 초안 |
| `backend/requirements.txt` | 필요한 패키지 목록 |
| `backend/.env.example` | `.env` 양식 (가짜 값만 들어있음) |

> 💡 **AI 없이 직접 만들어도 됩니다.** 위 세 파일을 손으로 만들고 `main.py`에 **5장의 최종 코드**를 그대로 옮겨 적으면 결과는 같습니다.

> 📌 **AI가 만든 초안은 다를 수 있습니다.** 이 시점의 `main.py`는 변수 이름과 에러 처리 방식이 지금의 5장에서 나온 코드와 다를 수 있습니다. 2~6단계를 진행하며 접속 문제(트러블슈팅 ④)를 거치며 다듬어진 것입니다. 지금 나온 코드가 5장과 다르게 생겼어도 정상입니다.

---

### 2단계 — `backend`로 이동하고 가상환경 만들기

**cmd / PowerShell**
```
cd backend
python -m venv .venv
```

**macOS / Linux**
```bash
cd backend
python3 -m venv .venv
```

**`.venv`가 뭔가요?** 이 프로젝트만 쓰는 파이썬 패키지 창고입니다.

컴퓨터 전체에 패키지를 깔면, A 프로젝트는 FastAPI 0.100이 필요한데 B 프로젝트는 0.115가 필요한 상황에서 충돌이 납니다. 그래서 프로젝트마다 창고를 따로 둡니다. `.venv`는 그냥 폴더예요 — 꼬이면 지우고 이 명령부터 다시 하면 됩니다.

#### 창고 활성화하기

"앞으로 이 창고를 쓰겠다"고 터미널에 알려주는 단계입니다. 이걸 해두면 이후 명령이 훨씬 짧아집니다.

**cmd**
```
.venv\Scripts\activate
```

**PowerShell**
```powershell
.\.venv\Scripts\Activate.ps1
```

**macOS / Linux**
```bash
source .venv/bin/activate
```

성공하면 프롬프트 맨 앞에 `(.venv)` 가 붙습니다.

```
(.venv) C:\...\project-root\backend>
```

터미널을 새로 열 때마다 **다시 활성화해야 합니다.** (창고 문을 다시 여는 것과 같습니다.)

<details>
<summary><b>▸ 트러블슈팅 — PowerShell에서 <code>이 시스템에서 스크립트를 실행할 수 없으므로</code> 에러</b></summary>

**증상**
```
.\.venv\Scripts\Activate.ps1 : 이 시스템에서 스크립트를 실행할 수 없으므로
파일 ...\Activate.ps1을(를) 로드할 수 없습니다.
```

**원인**
Windows PowerShell은 기본적으로 **스크립트 파일 실행을 막아둡니다.** 보안 설정이며, 정상 동작입니다.

**해결 — 이 창에서만 임시로 허용**
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```
그리고 다시 활성화 명령을 실행하면 됩니다.
`-Scope Process`는 **지금 열려 있는 이 터미널 창에서만** 적용된다는 뜻이라, 시스템 설정을 건드리지 않아 안전합니다. 창을 닫으면 원래대로 돌아옵니다.

**또는 — 활성화를 아예 안 하기**
활성화가 번거로우면 매번 창고 안의 파이썬을 직접 지목하는 방법도 있습니다.
```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8080
```

</details>

---

### 3단계 — 패키지 설치

**cmd / PowerShell / macOS / Linux — 공통**
```
pip install -r requirements.txt
```

`-r` 은 "설치할 목록이 이 파일에 적혀 있다"는 뜻입니다 (**r**equirements).

**설치되는 패키지 4개**

| 패키지 | 역할 |
|---|---|
| `fastapi` | 어떤 주소로 요청이 오면 뭘 응답할지 정하는 도구 |
| `uvicorn` | 실제로 포트를 열고 요청을 받아주는 웹서버 |
| `psycopg` | 파이썬에서 PostgreSQL에 접속하는 도구 |
| `python-dotenv` | `.env` 파일을 읽어주는 도구 |

> 💡 **활성화를 안 했다면?** `pip`이라고만 치면 **어느 창고의 pip인지 애매합니다.** 컴퓨터 전체 pip이 실행돼서 엉뚱한 곳에 설치되는 게 초보자가 가장 자주 겪는 사고입니다. 활성화를 했다면 `(.venv)` 표시가 그걸 보증해줍니다. 활성화가 싫다면 `.venv\Scripts\python.exe -m pip ...` 처럼 창고를 직접 지목하세요.

<details>
<summary><b>▸ 트러블슈팅 ① — <code>'backend'은(는) 내부 또는 외부 명령...이 아닙니다</code></b></summary>

**증상**
```
> backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
'backend'은(는) 내부 또는 외부 명령, 실행할 수 있는 프로그램, 또는 배치 파일이 아닙니다.
```

**원인**
Windows cmd는 **실행 파일 경로에 `/`(슬래시)를 못 씁니다.** `\`(역슬래시)만 인식합니다. macOS·Linux는 반대로 `/`만 씁니다.

**해결**

| 터미널 | 경로 구분자 |
|---|---|
| cmd | `\` 역슬래시만 |
| PowerShell | `\` 권장 (`/`도 대부분 동작) |
| macOS / Linux | `/` 슬래시만 |

**참고 — 왜 `python -m venv backend/.venv`는 됐나요?**
거기서 `backend/.venv`는 **실행할 프로그램이 아니라 그냥 인자(만들 폴더 이름)**였기 때문입니다. cmd는 **실행 파일 경로에만** 까다롭습니다.

참고로 이 가이드처럼 `cd backend` 후에 작업하면 긴 경로를 쓸 일 자체가 거의 없어서 이 문제를 만날 확률이 크게 줄어듭니다.

</details>

---

### 4단계 — 접속 정보 넣기

**cmd**
```
copy .env.example .env
notepad .env
```

**PowerShell**
```powershell
Copy-Item .env.example .env
notepad .env
```

**macOS / Linux**
```bash
cp .env.example .env
nano .env
```

**Supabase 대시보드 → Connect → Direct → Session pooler** 에서 연결 문자열을 확인하고, 항목별로 옮겨 적습니다.

```
postgresql://postgres.abcdefghijk:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres
             └──── DB_USER ────┘  └ DB_PASSWORD ┘ └──────────── DB_HOST ─────────────────┘ └PORT┘ └NAME┘
```

최종 `.env`:

```
DB_HOST=aws-0-ap-northeast-1.pooler.supabase.com
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres.실제프로젝트ID
DB_PASSWORD=실제비밀번호
```

체크할 것: **따옴표 없이**, **공백 없이**, **`[` `]` 대괄호가 남아 있지 않게.**

> 💡 **왜 Session pooler인가요?**
>
> | | |
> |---|---|
> | Direct connection | IPv6로만 접속됨. 인터넷 환경에 따라 **될 수도 안 될 수도** 있음 → 피하기 |
> | Transaction pooler | 특수 설정이 필요함 → 지금은 말고 |
> | **Session pooler** | **어디서든 됨** → 이거 |

---

### 5단계 — 서버 실행

**cmd / PowerShell / macOS / Linux — 공통**
```
uvicorn main:app --reload --port 8080
```

#### 명령어 해부

```
uvicorn   main:app   --reload   --port 8080
└─ ① ─┘  └── ② ──┘  └── ③ ──┘  └─── ④ ───┘
```

| | 의미 |
|---|---|
| ① `uvicorn` | 포트를 열고 요청을 받아주는 **웹서버를 실행** |
| ② `main:app` | `main.py` 파일 안의 `app` 이라는 변수를 서버로 띄워라 |
| ③ `--reload` | **코드를 고치면 서버가 알아서 재시작.** 개발할 때만 씀 |
| ④ `--port 8080` | 8080번 문으로 열어라 |

#### uvicorn과 FastAPI는 뭐가 다른가요?

| | 역할 |
|---|---|
| **uvicorn** | 8080번 포트에서 **기다리다가**, 브라우저 요청을 받아 FastAPI에 넘김 |
| **FastAPI** | 그 요청을 보고 **뭘 응답할지 결정**함 |

FastAPI 혼자서는 포트를 열지 못합니다. 식당으로 치면 **uvicorn이 홀 서빙, FastAPI가 주방**입니다.

#### `main:app`이 가리키는 곳

`backend/main.py` 안의 이 줄입니다.

```python
app = FastAPI(title="MyHub")
```

- `main` → 파일 이름 `main.py` (`.py`는 뺌)
- `:` → "이 파일 안의"
- `app` → 변수 이름

변수 이름을 `myserver`로 바꿨다면 명령어도 `main:myserver`가 돼야 합니다.

<details>
<summary><b>▸ 트러블슈팅 ② — <code>[WinError 10013] 액세스 권한에 의해 숨겨진 소켓에...</code></b></summary>

**증상**
```
ERROR:  [WinError 10013] 액세스 권한에 의해 숨겨진 소켓에 액세스를 시도했습니다
```

**원인**
**그 포트를 열 수 없었습니다.** 코드 문제가 아닙니다.

Windows에서는 Hyper-V, WSL2, Docker 같은 게 포트 대역을 통째로 예약해버리는 일이 흔합니다. 그 대역에 걸리면 **아무도 안 쓰고 있어도** "권한 없음"으로 거부됩니다.
이 가이드가 8000이 아니라 **8080**을 쓰는 이유가 이것입니다.

**해결 — 다른 포트로**
```
uvicorn main:app --reload --port 9000
```
주소도 함께 바뀝니다 → `http://127.0.0.1:9000/health`

**원인을 직접 확인하고 싶다면**

cmd
```
netsh interface ipv4 show excludedportrange protocol=tcp
netstat -ano | findstr :8080
```

PowerShell
```powershell
netsh interface ipv4 show excludedportrange protocol=tcp
Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue
```

macOS / Linux
```bash
lsof -i :8080
```

예약 목록에 그 포트가 포함돼 있으면 원인이 이것입니다.
(macOS·Linux에는 이런 예약 개념이 없어서 이 에러 자체가 거의 안 납니다. 대신 1024 미만 포트는 관리자 권한이 필요합니다.)

</details>

<details>
<summary><b>▸ 트러블슈팅 ③ — <code>KeyError: 'DB_HOST'</code></b></summary>

**증상**
```
File ".../backend/main.py", line 15, in <module>
    "host": os.environ["DB_HOST"],
KeyError: 'DB_HOST'
```

**원인**
`.env` 파일이 없거나, 있어도 **파이썬이 그 위치를 못 찾았습니다.**

`load_dotenv()`를 아무 인자 없이 쓰면 "현재 폴더 근처"에서 `.env`를 찾습니다. 실행하는 폴더가 바뀌면 못 찾을 수 있어서, 이 프로젝트는 경로를 코드에 못박아 뒀습니다.

```python
from pathlib import Path
load_dotenv(Path(__file__).parent / ".env")
```

`__file__`은 "지금 이 파이썬 파일"입니다. 그 옆의 `.env`를 읽으라고 지정한 것이라, **어느 폴더에서 실행하든** 확실합니다.

**해결 — `.env` 파일이 실제로 있는지 확인**

cmd
```
dir /a .env
type .env
```

PowerShell
```powershell
Get-ChildItem -Force .env
Get-Content .env
```

macOS / Linux
```bash
ls -la .env
cat .env
```

파일이 없다면 4단계로 돌아가 만드세요. 파일은 있는데 그 이름의 항목이 없다면 오타를 확인하세요.

> ✅ 사실 **좋은 신호**입니다. 포트 문제가 해결되어 파이썬이 `main.py`를 읽기 시작했다는 뜻이니까요.

</details>

<details>
<summary><b>▸ 트러블슈팅 ④ — <code>failed to resolve host '...@aws-0-...pooler.supabase.com'</code></b></summary>

**증상**
```
psycopg.OperationalError: failed to resolve host
  'xxxxxxxx@aws-0-ap-northeast-1.pooler.supabase.com': [Errno 11003] getaddrinfo failed
```

**원인 — 이번 단계에서 가장 헷갈리는 에러입니다**

접속 정보를 **URL 한 줄**로 받으면 이 문제가 생깁니다.

```
postgresql://아이디:비밀번호@호스트:포트/DB이름
                        ↑
                   여기부터 호스트
```

이 형식에서 **`@`는 "여기부터 호스트"라는 구분자**입니다.
그런데 **비밀번호 안에 `@`가 들어 있으면**, 파서가 그걸 구분자로 착각합니다.

```
postgresql://postgres.abc:AAA@xxxxxxxx@aws-0-...supabase.com:5432/postgres
                             ↑ 여기서 잘라버림
```

그 결과 호스트가 `xxxxxxxx@aws-0-...supabase.com`이 되어버렸고, 그런 주소는 세상에 없으니 `getaddrinfo failed`가 났습니다.
`@` 말고도 `# ? / % :` 가 있으면 같은 문제가 생깁니다.

**해결 — URL을 쓰지 않고 항목별로 전달**

이 프로젝트는 처음부터 이 방식을 씁니다.

```python
# 깨지기 쉬운 방식
DATABASE_URL = os.environ["DATABASE_URL"]
psycopg.connect(DATABASE_URL)

# 이 프로젝트가 쓰는 방식 — 특수문자가 있어도 안전
CONN_INFO = {
    "host":     os.environ["DB_HOST"],
    "port":     os.environ["DB_PORT"],
    "dbname":   os.environ["DB_NAME"],
    "user":     os.environ["DB_USER"],
    "password": os.environ["DB_PASSWORD"],
}
psycopg.connect(**CONN_INFO)
```

URL을 거치지 않으므로 **파싱 자체가 일어나지 않습니다.** 비밀번호에 뭐가 들어 있든 그대로 전달됩니다.

> 🚨 **이 에러가 났다면 비밀번호를 바꾸세요.**
> 에러 메시지에 **비밀번호가 그대로 찍힙니다.** 터미널 기록, 로그, 스크린샷에 남습니다.
> Supabase → Settings → Database → **Reset database password**
> 새 비밀번호는 **영문자와 숫자만** 쓰는 걸 권합니다.

</details>

---

### 6단계 — 확인

이 줄이 뜨면 성공입니다.

```
INFO:     Uvicorn running on http://127.0.0.1:8080 (Press CTRL+C to quit)
INFO:     Application startup complete.
```

브라우저에서 **http://127.0.0.1:8080/health** 를 엽니다. 서버를 끄려면 터미널에서 **Ctrl+C**.

> 📌 **`.env`를 고쳤는데 반영이 안 된다면** — `--reload`는 **`.py` 파일만** 감시합니다. `.env`를 고쳤다면 **Ctrl+C로 끄고 다시 실행**해야 합니다.

---

## 5. 코드 전체 (`backend/main.py`)

```python
import os
from pathlib import Path

import psycopg
from dotenv import load_dotenv
from fastapi import FastAPI

# 어느 폴더에서 실행하든 backend/.env 를 찾도록 경로를 직접 지정한다.
load_dotenv(Path(__file__).parent / ".env")

# 접속 정보를 항목별로 받는다.
# 하나의 URL 문자열로 받으면 비밀번호에 @ # ? / 같은 문자가 있을 때
# 주소 구분자로 잘못 해석되어 접속이 실패한다.
CONN_INFO = {
    "host": os.environ["DB_HOST"],
    "port": os.environ["DB_PORT"],
    "dbname": os.environ["DB_NAME"],
    "user": os.environ["DB_USER"],
    "password": os.environ["DB_PASSWORD"],
}

app = FastAPI(title="MyHub")


@app.get("/")
def root():
    return {"message": "서버가 살아있습니다"}


@app.get("/health")
def health():
    # 요청마다 새로 연결한다. 지금은 이게 제일 단순해서 이렇게 둔다.
    with psycopg.connect(**CONN_INFO) as conn:
        with conn.cursor() as cur:
            cur.execute("select version()")
            version = cur.fetchone()[0]

    return {"database": "연결됨", "postgres_version": version}
```

**`@app.get("/health")` 가 무슨 뜻인가요?**
"브라우저가 `/health` 주소로 들어오면, 바로 아래 함수를 실행해라"는 표시입니다.
`@app.get("/")` 이면 주소 없이 그냥 들어왔을 때고요.

> 📌 **알면서 남겨둔 부분:** `/health`는 요청이 올 때마다 DB에 **새로 접속**합니다. 방문자가 거의 없는 지금 단계에서는 연결을 매번 새로 여는 비용보다 **코드가 단순한 쪽**이 더 중요해서 이렇게 뒀습니다.

---

## 6. 보안 체크리스트

| | |
|---|---|
| ✅ | `.env`는 **절대 깃에 올리지 않는다** — `.gitignore`에 등록되어 있음 |
| ✅ | `.env.example`에는 **가짜 값만** 넣는다 — 이 파일은 깃에 올라감 |
| ✅ | 비밀번호를 채팅·이슈·스크린샷에 붙여넣지 않는다 |
| ✅ | 에러 메시지를 공유할 때는 **접속 정보가 들어간 줄을 지우고** 붙인다 |
| ✅ | 노출된 것 같으면 **즉시 재설정**한다 (몇 초면 됨) |

`.gitignore` 내용:

```
.env
.venv/
venv/
__pycache__/
*.pyc
```

---

## 7. 지금까지 배운 개념 정리

| 용어 | 한 줄 설명 |
|---|---|
| **가상환경 (venv)** | 이 프로젝트만 쓰는 파이썬 패키지 창고. 프로젝트끼리 버전 충돌을 막음 |
| **활성화 (activate)** | "앞으로 이 창고를 쓰겠다"고 터미널에 알리는 것. 프롬프트에 `(.venv)`가 붙음 |
| **FastAPI** | 어떤 주소로 요청이 오면 뭘 응답할지 정하는 도구 (주방) |
| **uvicorn** | 실제로 포트를 열고 요청을 받아주는 웹서버 (홀 서빙) |
| **psycopg** | 파이썬에서 PostgreSQL에 접속하는 도구 |
| **`.env`** | 비밀번호처럼 코드에 적으면 안 되는 값을 따로 보관하는 파일 |
| **엔드포인트** | 서버가 응답하는 주소 하나. 지금은 `/` 와 `/health` 두 개 |
| **포트** | 한 컴퓨터 안의 문 번호. 8080번 문으로 서버를 열었음 |
| **Session pooler** | Supabase가 제공하는 안정적인 DB 접속 창구 |
| **anon key** | Supabase의 공개 열쇠. **비밀번호가 아님.** 이것만으로 데이터가 열리면 안 됨 |
| **RLS** | 행 단위 접근 제어. 켜두면 새 테이블은 기본이 "아무도 못 봄" |

---

## 8. 다음 단계 (Step 2)

> 🎯 **테이블을 하나 만들고, 그 안의 데이터를 API로 읽어옵니다.**

지금은 `/health`가 "PostgreSQL 17.4"라는 **DB 자기소개**만 가져옵니다.
다음엔 `/profile`이 **내 이름과 한 줄 소개**를 가져오게 만듭니다.

```
[지금]  브라우저 → 서버 → DB → "나 PostgreSQL 17.4야"
[다음]  브라우저 → 서버 → DB → "백영민 / 백엔드 개발자"
```

1. Supabase SQL Editor에서 `profile` 테이블 만들기 (컬럼 3~4개)
2. 내 정보 한 줄 넣기
3. `GET /profile` 엔드포인트 추가
4. 브라우저에서 내 이름이 나오는 것 확인

여기까지 되면 **"데이터베이스에 있는 내 데이터가 웹 주소로 나온다"**가 완성됩니다.
그 다음 Step 3에서 화면을 붙이면 비로소 웹사이트가 됩니다.

다음 → [Step 2 — 첫 테이블 만들고 API로 읽어오기](step2_first_table_api.md)
