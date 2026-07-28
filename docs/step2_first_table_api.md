# Step 2 — 첫 테이블 만들고 API로 읽어오기

> MyHub(온라인 이력서) 개발 기록 · 2026-07-27
> 이전 문서: [Step 1 — 파이썬 백엔드와 Supabase 연결하기](step1_backend_supabase.md)

---

## 전체 로드맵에서 지금 어디쯤인가

```
[✓  Step 1]  백엔드 ↔ Supabase 연결        완료
[✅ Step 2]  테이블 만들고 데이터 읽기      ← 지금 여기
[   Step 3]  화면(프론트엔드) 붙이기
[   Step 4]  내가 로그인해서 수정하기
[   Step 5]  ORM 도입 (SQLAlchemy)
```

> 🖥️ 명령어는 **cmd / PowerShell / macOS·Linux** 를 모두 적어뒀습니다.
> **트러블슈팅은 문제가 터지는 단계 바로 아래에 접어두었습니다.** `▸` 를 클릭하면 펼쳐집니다.

---

## 1. 이 단계의 목표

> 🎯 **내가 데이터베이스에 넣은 데이터가 웹 주소로 나오게 만드는 것.**
> Step 1에서 길이 뚫렸다면, Step 2는 그 길로 **실을 짐을 만드는** 단계입니다.

```
[Step 1]  브라우저 → 서버 → DB → "나 PostgreSQL 17.4야"    (DB 자기소개)
[Step 2]  브라우저 → 서버 → DB → "백영민 / 백엔드 개발자"   (내 데이터!)
```

| | |
|---|---|
| ✅ **만드는 것** | `profile` 테이블, `GET /profile` 주소, 커넥션 풀 |
| ❌ **아직 없는 것** | 화면(HTML), 수정 기능, 로그인, 나머지 이력서 항목들 |

---

## 2. 완성된 모습

브라우저에서 `http://127.0.0.1:8080/profile` 에 들어가면:

```json
{
  "profile": {
    "id": 1,
    "full_name": "백영민",
    "headline": "백엔드 개발자",
    "summary": "온라인 이력서를 직접 만들고 있습니다.",
    "updated_at": "2026-07-27T13:42:11.283Z"
  }
}
```

글자는 아직 투박하지만, **내가 DB에 넣은 값이 인터넷 주소를 통해 나왔다**는 게 핵심입니다. Step 3에서 이걸 예쁘게 그리기만 하면 됩니다.

---

## 3. ① 테이블 만들기

### SQL Editor 열기

Supabase 대시보드 **왼쪽 사이드바**에서 찾습니다.

```
🏠  Project overview
📋  Table Editor        ← 표를 눈으로 보고 편집하는 곳
💻  SQL Editor          ← ★ 여기
🗄️  Database
🔑  Authentication
📦  Storage
⚙️  Project Settings    (맨 아래)
```

**SQL Editor** 클릭 → 입력창이 안 보이면 좌측 상단 **`+ New query`**.

### 실행할 SQL

```sql
create table public.profile (
  id         bigint generated always as identity primary key,
  full_name  text        not null,
  headline   text        not null,
  summary    text,
  updated_at timestamptz not null default now()
);

insert into public.profile (full_name, headline, summary)
values (
  '백영민',
  '백엔드 개발자',
  '온라인 이력서를 직접 만들고 있습니다.'
);
```

붙여넣고 **`Run`** 버튼 또는 **Ctrl + Enter**.

> 💡 **`Success. No rows returned` 이 정상입니다.**
> 테이블을 만들고 데이터를 넣는 명령은 **결과 표를 돌려주지 않습니다.** 에러가 아닙니다.

### 눈으로 확인

왼쪽 사이드바 **Table Editor** → 목록에서 **`profile`** 클릭.

| id | full_name | headline | summary | updated_at |
|---|---|---|---|---|
| 1 | 백영민 | 백엔드 개발자 | 온라인 이력서를... | 2026-07-27 ... |

### SQL 한 줄씩 뜯어보기

| 구문 | 뜻 |
|---|---|
| `public.profile` | `public`은 스키마(폴더 같은 개념) 이름. 내가 만드는 테이블은 기본적으로 여기 들어감 |
| `bigint generated always as identity` | **자동으로 1, 2, 3... 번호가 매겨짐.** 내가 안 넣어도 DB가 채움 |
| `primary key` | "이 칸으로 각 줄을 구별한다" |
| `text` | 글자. PostgreSQL에서는 길이 제한 없이 `text`를 쓰는 게 일반적 |
| `not null` | "비워둘 수 없다". 이름 없는 이력서는 없으니까 |
| `summary text` (not null 없음) | **비워둬도 됨.** 소개글은 나중에 써도 되니까 |
| `timestamptz` | 시간대 정보까지 포함한 시각 |
| `default now()` | "값을 안 주면 지금 시각을 넣어라" → `insert`에 안 적었는데도 채워지는 이유 |

---

## 4. ② 바깥에서 못 보게 잠그기

테이블을 만든 직후에 **두 줄을 항상 같이 실행**하세요.

```sql
alter table public.profile enable row level security;
revoke all on table public.profile from anon, authenticated;
```

| | |
|---|---|
| `enable row level security` | 이 테이블을 **기본 "아무도 못 봄"** 상태로. 허락한 것만 열림 |
| `revoke all ... from anon, authenticated` | 외부 API 역할이 가진 **모든 권한을 회수** |

> ✅ **이래도 우리 서버는 잘 읽습니다.**
> 파이썬은 `anon key`가 아니라 `.env`에 적은 **DB 계정**으로 직접 접속합니다. 그 계정은 테이블 주인이라 이 잠금을 통과합니다.
>
> ```
> 방문자 (anon key)  →  ❌ 막힘   (RLS + 권한 회수)
> 우리 파이썬 서버   →  ✅ 통과   (테이블 주인 계정)
> ```
>
> **"밖에서는 잠겨 있고, 내 서버만 들어갈 수 있는"** 상태 — 이게 목표입니다.

### 확인하는 방법

#### ① RLS가 켜져 있나?

```sql
select relname as 테이블, relrowsecurity as rls_켜짐
from pg_class
where relname = 'profile';
```

→ `rls_켜짐` 이 **`true`** 여야 합니다.

#### ② 외부(anon)에게 권한이 나가 있나?

```sql
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'profile'
  and grantee in ('anon', 'authenticated');
```

→ 결과가 **`no rows`** 여야 합니다. 한 줄이라도 나오면 아래 트러블슈팅을 보세요.

<details>
<summary><b>▸ 트러블슈팅 — 권한 조회에 <code>TRUNCATE / REFERENCES / TRIGGER</code> 가 남아 있다면</b></summary>

**증상**
```
grantee        | privilege_type
---------------+---------------
anon           | TRUNCATE
anon           | REFERENCES
anon           | TRIGGER
authenticated  | TRUNCATE
...
```

**먼저 — 중요한 건 다 빠져 있습니다**

데이터를 읽고 쓰는 권한(**SELECT / INSERT / UPDATE / DELETE**)이 **하나도 없습니다.** 프로젝트 만들 때 *Automatically expose new tables*를 끈 게 제대로 동작한 결과입니다.

**남은 세 개는 무엇인가**

| 권한 | 뜻 | 위험도 |
|---|---|---|
| `REFERENCES` | 이 테이블을 참조하는 외래키를 만들 수 있음 | 거의 없음 |
| `TRIGGER` | 이 테이블에 트리거를 달 수 있음 | 낮음 |
| `TRUNCATE` | 테이블 내용을 통째로 비울 수 있음 | 이름은 무섭지만 ↓ |

`TRUNCATE`는 **Data API(REST)로는 도달할 방법이 없습니다.** REST는 `GET→SELECT`, `POST→INSERT`, `PATCH→UPDATE`, `DELETE→DELETE`만 매핑하고 TRUNCATE에 해당하는 요청 방식이 아예 없습니다. 게다가 SELECT 권한이 없어서 이 테이블은 API 목록에 나타나지도 않습니다.

**해결**
```sql
revoke all on table public.profile from anon, authenticated;
```
다시 조회하면 `no rows`가 나옵니다.

> ⚠️ **프로젝트 전체 기본값은 건드리지 마세요.**
> `alter default privileges` 로 한 번에 처리하는 방법도 있지만, Supabase 내부 동작에 영향을 줄 수 있습니다. **테이블을 만들 때마다 위 두 줄을 같이 실행하는 습관**이 훨씬 안전합니다.

</details>

<details>
<summary><b>▸ Table Editor에 RLS 경고가 안 보이는데 괜찮은가요?</b></summary>

괜찮습니다. 오히려 정상일 가능성이 높습니다.

Supabase의 경고는 보통 **"밖에 열려 있는데 잠금이 없다"**일 때 뜹니다. *Automatically expose new tables*를 꺼둔 상태라면 애초에 **외부 API에 노출조차 안 됐으니** 경고할 이유가 없습니다.

확신이 필요하면 위의 확인 쿼리 ②를 돌려보세요. `no rows`면 안전합니다.

</details>

---

## 5. ③ `/profile` 주소 만들기

`backend/main.py`에 추가한 부분입니다.

```python
@app.get("/profile")
def get_profile():
    with pool.connection() as conn:
        # dict_row: 결과를 튜플이 아니라 {컬럼명: 값} 형태로 받는다.
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

    # 최상위는 항상 이름 있는 오브젝트로 감싼다.
    return {"profile": row}
```

<details>
<summary><b>▸ <code>row_factory=dict_row</code> 는 왜 붙이나요?</b></summary>

이게 없으면 DB 결과가 **튜플**로 옵니다.

```python
(1, '백영민', '백엔드 개발자', '...', datetime(...))
# row[1]이 이름... 순서를 외워야 함
```

붙이면 **딕셔너리**로 옵니다.

```python
{'id': 1, 'full_name': '백영민', 'headline': '백엔드 개발자', ...}
# row['full_name'] — 순서를 몰라도 됨
```

게다가 딕셔너리는 FastAPI가 그대로 JSON으로 바꿔주기 때문에 **변환 코드를 한 줄도 안 써도 됩니다.**

</details>

<details>
<summary><b>▸ <code>order by id limit 1</code> 은 왜 필요한가요?</b></summary>

프로필은 한 줄만 있으면 되니 **첫 줄 하나만** 가져옵니다.

`order by`를 빼면 **어떤 줄이 나올지 보장되지 않습니다.** 데이터베이스는 "순서를 지정하지 않으면 아무 순서로나 줘도 된다"는 규칙이라, 지금은 한 줄뿐이라 문제없어 보여도 나중에 줄이 늘면 예측 불가능해집니다.

</details>

<details>
<summary><b>▸ 왜 <code>404</code> 를 따로 내보내나요?</b></summary>

테이블이 비어 있으면 `row`가 `None`이 됩니다. 그냥 두면 `{"profile": null}` 같은 애매한 응답이 나갑니다.

그러면 나중에 화면 쪽에서 **"데이터가 없는 건지, 서버가 이상한 건지" 구분이 안 됩니다.** 404는 "그런 건 없다"는 명확한 신호입니다.

</details>

<details>
<summary><b>▸ 왜 <code>{"profile": row}</code> 로 한 겹 감싸나요?</b></summary>

나중에 이력서 전체를 내려줄 때 이런 모양이 됩니다.

```json
{ "profile": {...}, "experiences": [...], "projects": [...] }
```

지금부터 감싸두면 **그때 응답 형태를 안 바꿔도 됩니다.** 안 감쌌으면 화면 코드를 전부 고쳐야 하고요.

최상위에 배열이나 값을 그대로 두지 않고 **항상 이름 있는 오브젝트로 감싸는 것**이 이 프로젝트의 규칙입니다.

</details>

> 🎁 **보너스 — 자동 생성된 API 문서**
> **http://127.0.0.1:8080/docs** 를 열어보세요.
> 만든 주소 3개(`/`, `/health`, `/profile`)가 목록으로 나오고 **`Try it out` 버튼으로 브라우저에서 바로 실행**해볼 수 있습니다. 따로 만든 게 아니라 FastAPI가 코드를 읽고 자동 생성한 것입니다.

---

## 6. ④ 커넥션 풀 — 연결을 재사용하기

### 왜 필요한가

풀이 없으면 요청이 올 때마다 **매번 처음부터** 이 과정을 다 합니다.

```
TCP 연결 → TLS 암호화 협상 → 로그인 인증 → 쿼리 실행 → 연결 종료
└────────── 여기까지 0.2~0.4초 ──────────┘   └ 0.01초 ┘
```

정작 하려던 쿼리는 눈 깜짝할 새인데 **연결하고 끊는 데 대부분의 시간**을 씁니다. 서버가 도쿄에 있으니 왕복 시간도 붙고요.

**커넥션 풀**은 연결 몇 개를 미리 열어두고 **빌려주고 반납받는** 방식입니다.

> 💡 **지금은 체감이 안 될 수도 있습니다.**
> 혼자서 가끔 새로고침하는 정도면 차이를 느끼기 어렵습니다. 진짜 효과는 **한 화면이 여러 요청을 동시에 던질 때**(Step 3부터 그렇게 됩니다)와 **방문자가 여럿일 때** 납니다. 미리 깔아두는 기반이라고 보시면 됩니다.

### 패키지 추가

`requirements.txt`의 `psycopg` 줄을 이렇게 바꿉니다.

```
psycopg[binary,pool]
```

서버를 **끄고**(Ctrl+C) 다시 설치합니다.

```
pip install -r requirements.txt
uvicorn main:app --reload --port 8080
```

> ⚠️ **프롬프트에 `(.venv)` 가 있는지 먼저 확인하세요.**
> 없으면 **컴퓨터 전체 파이썬에 설치되어** 다음 단계에서 에러가 납니다. 아래 트러블슈팅 참고.

### 바뀐 코드 3곳

먼저 전체 변경사항을 한눈에 봅시다. `-` 줄이 지운 것, `+` 줄이 추가한 것입니다.

```diff
 import os
+from contextlib import asynccontextmanager
 from pathlib import Path

-import psycopg
 from dotenv import load_dotenv
 from fastapi import FastAPI, HTTPException
 from psycopg.rows import dict_row
+from psycopg_pool import ConnectionPool

 CONN_INFO = { ... }

+pool = ConnectionPool(kwargs=CONN_INFO, min_size=1, max_size=5, open=False)
+
+
+@asynccontextmanager
+async def lifespan(app: FastAPI):
+    pool.open(wait=True, timeout=10)
+    yield
+    pool.close()
+
+
-app = FastAPI(title="MyHub")
+app = FastAPI(title="MyHub", lifespan=lifespan)


 @app.get("/health")
 def health():
-    with psycopg.connect(**CONN_INFO) as conn:
+    with pool.connection() as conn:
         ...


 @app.get("/profile")
 def get_profile():
-    with psycopg.connect(**CONN_INFO) as conn:
+    with pool.connection() as conn:
         ...
```

#### ① 풀 만들기

```python
pool = ConnectionPool(kwargs=CONN_INFO, min_size=1, max_size=5, open=False)
```

| | |
|---|---|
| `kwargs=CONN_INFO` | 접속 정보는 그대로 재사용 |
| `min_size=1` | 최소 1개는 항상 열어둔다 |
| `max_size=5` | 바빠도 5개까지만. 무한정 늘어나서 DB를 괴롭히지 않도록 |
| `open=False` | **여기서는 아직 열지 않는다** (다음 항목에서 엽니다) |

#### ② `lifespan` — 서버의 시작과 끝

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    pool.open(wait=True, timeout=10)   # 서버 켜질 때
    yield                              # ← 이 지점에서 서버가 돌아감
    pool.close()                       # 서버 꺼질 때

app = FastAPI(title="MyHub", lifespan=lifespan)
```

`yield` **위쪽은 시작할 때 한 번**, **아래쪽은 끝날 때 한 번** 실행됩니다. 그 사이가 서버가 살아 있는 시간입니다.

풀을 파일 맨 위에서 바로 열면 서버가 준비되기도 전에 DB에 붙으려 해서 타이밍이 꼬입니다. **"서버가 준비됐을 때 열고, 끝날 때 닫는다"**가 올바른 순서입니다.

`wait=True`를 준 이유는 **연결 실패를 시작할 때 바로 알기 위해서**입니다. 없으면 서버는 멀쩡히 켜졌다가 첫 요청에서야 에러가 나서 원인 찾기가 헷갈립니다.

#### ③ 연결을 빌려 쓰기

```diff
-    with psycopg.connect(**CONN_INFO) as conn:
+    with pool.connection() as conn:
```

**딱 한 줄 차이입니다.** `with` 블록이 끝나면 연결이 닫히는 게 아니라 **풀로 돌아가서 다음 요청을 기다립니다.** `/health`와 `/profile` 두 군데를 똑같이 바꿉니다.

<details>
<summary><b>▸ 트러블슈팅 — <code>'uvicorn'은(는) 내부 또는 외부 명령...이 아닙니다</code></b></summary>

**증상**
```
C:\...\backend>uvicorn main:app --reload --port 8080
'uvicorn'은(는) 내부 또는 외부 명령, 실행할 수 있는 프로그램, 또는
배치 파일이 아닙니다.
```

**원인 — 가상환경이 활성화되지 않았습니다**

프롬프트 맨 앞에 **`(.venv)` 가 없으면** 이 상태입니다.

바로 위에서 실행한 `pip install` 메시지를 보면 증거가 있습니다.

```
C:\Users\...\AppData\Local\Python\pythoncore-3.14-64\python.exe -m pip ...
                    ↑ 컴퓨터 전체 파이썬 (창고 밖)
```

패키지가 `.venv` 창고가 아니라 **컴퓨터 전체 파이썬에 설치**됐고, `uvicorn` 명령도 PATH에 없어서 못 찾는 것입니다.

**해결 — 활성화부터**

cmd
```
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8080
```

PowerShell
```powershell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8080
```

macOS / Linux
```bash
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8080
```

**또는 — 활성화 없이 창고를 직접 지목**

cmd
```
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8080
```

macOS / Linux
```bash
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m uvicorn main:app --reload --port 8080
```

> ✅ **습관 하나로 끝납니다.**
> **터미널을 새로 열면 항상 비활성 상태입니다.** 명령을 치기 전에 `(.venv)` 가 있는지 보는 습관을 들이면 이 문제는 다시 안 생깁니다.
> 컴퓨터 전체에 잘못 깔린 패키지는 그냥 두셔도 됩니다. 용량만 조금 차지할 뿐 문제를 일으키지 않습니다.

</details>

<details>
<summary><b>▸ 트러블슈팅 — <code>ModuleNotFoundError: No module named 'psycopg_pool'</code></b></summary>

**원인**
위와 같은 문제입니다. `pip install`이 **다른 파이썬에 설치**했습니다. 또는 `requirements.txt`를 `psycopg[binary,pool]`로 바꾼 뒤 재설치를 안 했을 수도 있습니다.

**해결**
`(.venv)` 확인 후 다시 설치하세요.

```
pip install -r requirements.txt
```

설치가 제대로 됐는지 확인:

```
pip show psycopg-pool
```

</details>

<details>
<summary><b>▸ 트러블슈팅 — <code>404 프로필이 아직 없습니다</code></b></summary>

**원인**
테이블은 만들어졌는데 **데이터가 한 줄도 없습니다.** `insert` 문을 빼먹었거나 실행이 안 된 경우입니다.

**해결 — SQL Editor에서 확인**

```sql
select * from public.profile;
```

`no rows`가 나오면 다시 넣으세요.

```sql
insert into public.profile (full_name, headline, summary)
values ('내이름', '내 한 줄 소개', '조금 더 긴 소개글');
```

> ✅ 이건 **코드가 잘 동작한다는 증거**입니다. 404가 나왔다는 건 서버가 DB까지 잘 다녀왔다는 뜻이에요. 진짜로 데이터가 없었을 뿐입니다.

</details>

---

## 7. 코드 전체 (`backend/main.py`)

```python
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

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

# 커넥션 풀: 연결을 미리 열어두고 요청마다 빌려준다.
# open=False 로 만들어 두고, 실제로 여는 것은 서버가 시작될 때(lifespan).
pool = ConnectionPool(kwargs=CONN_INFO, min_size=1, max_size=5, open=False)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 서버가 켜질 때 실행된다. wait=True 라서 연결에 실패하면 여기서 바로 알 수 있다.
    pool.open(wait=True, timeout=10)
    yield
    # 서버가 꺼질 때 실행된다.
    pool.close()


app = FastAPI(title="MyHub", lifespan=lifespan)


@app.get("/")
def root():
    return {"message": "서버가 살아있습니다"}


@app.get("/health")
def health():
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("select version()")
            version = cur.fetchone()[0]

    return {"database": "연결됨", "postgres_version": version}


@app.get("/profile")
def get_profile():
    with pool.connection() as conn:
        # dict_row: 결과를 튜플이 아니라 {컬럼명: 값} 형태로 받는다.
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

    # 최상위는 항상 이름 있는 오브젝트로 감싼다.
    # 나중에 다른 항목을 같이 내려줄 때 형태를 안 바꿔도 되기 때문이다.
    return {"profile": row}
```

---

## 8. 이번에 배운 개념

| 용어 | 한 줄 설명 |
|---|---|
| **스키마 (`public`)** | 테이블을 담는 폴더 같은 것. 내 테이블은 기본적으로 `public`에 들어감 |
| **기본키 (primary key)** | 각 줄을 구별하는 칸. 보통 자동 증가하는 `id` |
| **`not null`** | 비워둘 수 없는 칸 |
| **`default`** | 값을 안 주면 대신 채워 넣을 값 |
| **RLS** | 행 단위 접근 제어. 켜면 기본이 "아무도 못 봄" |
| **`revoke`** | 이미 준 권한을 회수하는 명령 |
| **`dict_row`** | DB 결과를 튜플이 아니라 딕셔너리로 받게 하는 설정 |
| **커넥션 풀** | DB 연결을 미리 열어두고 빌려주고 반납받는 구조 |
| **`lifespan`** | 서버가 켜질 때와 꺼질 때 실행할 코드를 지정하는 곳 |
| **404** | "그런 건 없다"는 HTTP 응답 코드 |

---

## 9. 다음 단계 (Step 3)

> 🎯 **JSON 글자를 사람이 보는 이력서 페이지로 만듭니다.**
> 여기부터 비로소 "웹사이트"가 됩니다.

```
[지금]   브라우저 → {"profile":{"full_name":"백영민", ...}}   ← 개발자만 읽는 글자

[Step 3] 브라우저 → ┌──────────────────┐                     ← 사람이 보는 화면
                    │  백영민            │
                    │  백엔드 개발자      │
                    └──────────────────┘
```

← 이전: [Step 1 — 백엔드와 Supabase 연결](step1_backend_supabase.md)
다음 → [Step 3 — 화면 붙이기 (React + TypeScript)](step3_react_frontend.md)
