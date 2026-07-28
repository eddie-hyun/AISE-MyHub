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
| ✅ **만드는 것** | `GET /profile` 주소, `profile` 테이블 |
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

## 3. ① `/profile` 주소 만들기

이 엔드포인트는 손으로 짠 게 아니라, **AI 코딩 에이전트(Claude Code)에게 아래 프롬프트를 그대로 줘서** 만들었습니다.

```
DB에 저장된 사용자 정보를 돌려주는 엔드포인트를 추가:

GET /profile

응답에는 이름, 한 줄 소개, 상세 소개, 마지막 업데이트 시각이 포함되어야 함.

sql query를 직접 쓰는 간단한 방식으로 구현.
```

> 📌 **AI가 만든 초안을 그대로 쓰지는 않았습니다.** 4장의 SQL과 같은 이유입니다 — 어떤 컬럼을 어떤 방식으로 읽어올지는 프롬프트가 정해준 게 아니라 **AI가 그때그때 고른 것**이라, 같은 프롬프트를 다시 줘도 다른 모양이 나올 수 있습니다.

> ⚠️ **아직 이 코드를 실행해도 에러가 납니다.** `select`가 읽으려는 `public.profile` 테이블이 아직 없기 때문입니다. 이 코드가 **어떤 컬럼을 기대하는지**(`full_name`, `headline`, `summary`, `updated_at`)는 이미 정해졌으니, 다음 절에서는 그 모양에 맞춰 테이블을 만듭니다.

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

## 4. ② 테이블 만들기

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

> ⚠️ **이 SQL은 고정된 정답이 아니라 예시입니다.**
> 위에서 만든 엔드포인트가 요구하는 건 "이름 · 한 줄 소개 · 상세 소개 · 마지막 업데이트 시각을 담을 테이블"이라는 **내용**뿐입니다. `full_name` / `headline` / `summary` / `updated_at`이라는 **컬럼 이름과 타입은 AI가 고른 것**이라, 다른 AI에게 같은 요구를 하거나 같은 AI에게 다시 물어봐도 `name` / `tagline` / `bio` / `modified_at`처럼 다르게 나올 수 있습니다.
> 지금 아래 SQL은 **바로 위 코드가 실제로 사용 중인 모양**이고, `backend/main.py`의 쿼리와 1:1로 맞춰져 있습니다.

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

> 💡 **코드가 먼저, SQL은 그 다음입니다.**
> 앞 절에서 만든 엔드포인트가 이미 어떤 컬럼을 기대하는지 정해놨습니다. 그 모양을 SQL로 손수 옮겨 적는 대신, **AI에게 코드를 보여주고 맞춰달라고 하는 편이 더 안전합니다.**
>
> ```
> backend/main.py 의 현재 구현(쿼리, DTO)을 보고,
> 거기서 요구하는 컬럼 구성에 맞는 public.profile 테이블 생성 SQL을 만들어줘.
> ```
>
> **코드가 진실(source of truth)이고, SQL은 그걸 따라가는 쪽**이어야 나중에 "테이블은 이렇게 만들었는데 코드는 다른 컬럼을 찾는다"는 불일치가 생기지 않습니다.

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

> 🎁 **보너스 — 자동 생성된 API 문서**
> 이제 코드와 테이블이 모두 준비됐으니 **http://127.0.0.1:8080/docs** 를 열어보세요.
> 만든 주소 3개(`/`, `/health`, `/profile`)가 목록으로 나오고 **`Try it out` 버튼으로 브라우저에서 바로 실행**해볼 수 있습니다. 따로 만든 게 아니라 FastAPI가 코드를 읽고 자동 생성한 것입니다.

---

## 5. ③ 바깥에서 못 보게 잠그기

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

## 6. 코드 전체 (`backend/main.py`)

```python
import os
from pathlib import Path

import psycopg
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from psycopg.rows import dict_row

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
    with psycopg.connect(**CONN_INFO) as conn:
        with conn.cursor() as cur:
            cur.execute("select version()")
            version = cur.fetchone()[0]

    return {"database": "연결됨", "postgres_version": version}


@app.get("/profile")
def get_profile():
    with psycopg.connect(**CONN_INFO) as conn:
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

## 7. 이번에 배운 개념

| 용어 | 한 줄 설명 |
|---|---|
| **스키마 (`public`)** | 테이블을 담는 폴더 같은 것. 내 테이블은 기본적으로 `public`에 들어감 |
| **기본키 (primary key)** | 각 줄을 구별하는 칸. 보통 자동 증가하는 `id` |
| **`not null`** | 비워둘 수 없는 칸 |
| **`default`** | 값을 안 주면 대신 채워 넣을 값 |
| **RLS** | 행 단위 접근 제어. 켜면 기본이 "아무도 못 봄" |
| **`revoke`** | 이미 준 권한을 회수하는 명령 |
| **`dict_row`** | DB 결과를 튜플이 아니라 딕셔너리로 받게 하는 설정 |
| **404** | "그런 건 없다"는 HTTP 응답 코드 |

---

## 8. 다음 단계 (Step 3)

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
