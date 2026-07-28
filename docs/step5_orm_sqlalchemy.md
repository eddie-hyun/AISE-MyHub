# Step 5 — ORM 도입 (SQLAlchemy)

> MyHub(온라인 이력서) 개발 기록 · 2026-07-28
> 이전 문서: [Step 4 — 내가 로그인해서 수정하기](step4_login_and_edit.md)

---

## 전체 로드맵에서 지금 어디쯤인가

```
[✓  Step 1]  백엔드 ↔ Supabase 연결        완료
[✓  Step 2]  테이블 만들고 데이터 읽기      완료
[✓  Step 3]  화면(프론트엔드) 붙이기        완료
[✓  Step 4]  내가 로그인해서 수정하기       완료
[✅ Step 5]  ORM 도입 (SQLAlchemy)         ← 지금 여기
```

> 🖥️ 명령어는 **cmd / PowerShell / macOS·Linux** 를 모두 적어뒀습니다.
> **트러블슈팅은 문제가 터지는 단계 바로 아래에 접어두었습니다.** `▸` 를 클릭하면 펼쳐집니다.

---

## 1. 이 단계의 목표

> 🎯 **SQL 을 직접 쓰지 않고, 파이썬 클래스로 데이터베이스를 다루는 것.**
> 그리고 **테이블을 서버가 알아서 만들게** 하는 것.

**겉보기 동작은 하나도 안 바뀝니다.** 화면도, API 응답도 그대로예요. 안쪽만 통째로 교체합니다.

이 단계는 손으로 하나씩 짠 게 아니라, **AI 코딩 에이전트(Claude Code)에게 아래 프롬프트를 그대로 줘서** 만들었습니다.

```
이제는 SQLAlchemy를 도입하여 데이터 접근을 오브젝트 방식으로 변경할 것임.

* 마이그레이션과 스키마 관리는 불필요함.
* 현재의 테이블 정의를 파이썬 엔티티 클래스를 만들어서 이전.
* 서버가 시작할 때 엔티티 기준으로 없는 테이블은 자동 생성하고 새 테이블은 비어있으니 초기 데이터 1건을 insert.
* 기존에 구현된 기능들의 데이터베이스 접근을 raw SQL 대신 ORM 호출로 교체.
* API의 주소와 응답 모양(OpenAPI 스펙)은 그대로 둠.
* db.py, models.py, schemas.py 로 구현 내용을 적절히 분리하여야 함.
```

> 📌 **OpenAPI 스펙이 정말 그대로인지 직접 확인했습니다.** 리팩터링 전후로 `npm run gen:api` 를 두 번 돌려 생성된 `schema.d.ts` 를 `diff` 해봤는데 **한 글자도 다르지 않았습니다.** 안쪽 구현을 통째로 갈아엎어도 계약서(OpenAPI)가 그대로면 프론트엔드는 손댈 필요가 없다는 걸 프롬프트 하나로 실제로 확인한 셈입니다.

### 네 조각으로 나눠서 진행합니다

| | 하는 일 | 확인 방법 |
|---|---|---|
| **①** | SQLAlchemy 설치 · 파일 분리 · 엔티티 정의 | 기존 기능 그대로 동작 |
| **②** | 서버 시작 시 테이블 자동 생성 + seed 1건 | 테이블을 지워도 다시 생김 |
| **③** | 엔드포인트를 ORM 으로 교체 (raw SQL 제거) | 화면 동작 동일 |
| **④** | 정리 | 최종 구조 확인 |

### 바뀌는 것 한눈에

| | Step 4 까지 | Step 5 |
|---|---|---|
| 테이블 정의 | SQL Editor 에서 `create table` | **파이썬 클래스** (엔티티) |
| 테이블 생성 | 손으로 SQL 실행 | **서버 시작 시 자동** |
| 조회 | `cur.execute("select ...")` | `select(models.Profile)` |
| 수정 | `update ... set ...` | `entity.full_name = "..."` |
| `updated_at` | UPDATE 문에 직접 적음 | 엔티티에 선언, 자동 갱신 |
| SQL 인젝션 | 자리 표시를 꼼꼼히 써야 함 | **걱정거리 자체가 사라짐** |
| DB 연결 | 요청마다 `psycopg.connect()` 로 새로 접속 | **엔진의 커넥션 풀이 재사용** |

---

## 2. ORM 이 뭐고, 왜 쓰나

**ORM** = Object-Relational Mapping. **파이썬 객체와 테이블의 행을 이어주는 것**입니다.

```
파이썬 객체                  데이터베이스 행
─────────────────           ────────────────────
Profile 클래스        ↔     profile 테이블
profile 인스턴스      ↔     한 줄(row)
profile.full_name    ↔     full_name 컬럼
```

### 지금 우리 코드가 실제로 불편했던 점

Step 4 까지의 코드에서 **컬럼 목록을 네 군데에 반복해서** 적고 있었습니다.

```python
# ① SELECT 문
select full_name, headline, summary, updated_at from public.profile

# ② UPDATE 문
update public.profile set full_name = %(full_name)s, headline = ...

# ③ RETURNING 절
returning full_name, headline, summary, updated_at

# ④ Pydantic DTO
class Profile(BaseModel):
    full_name: str
    ...
```

**컬럼을 하나 추가하면 이 네 곳을 전부 고쳐야 합니다.** 그리고 한 곳을 빠뜨려도 **실행해봐야** 알 수 있습니다. SQL 은 문자열이라 편집기가 오타를 잡아주지 못하거든요.

ORM 을 쓰면 **엔티티 한 곳만** 고칩니다.

### 솔직하게 — 공짜는 아닙니다

| 얻는 것 | 잃는 것 |
|---|---|
| 컬럼 정의가 한 곳으로 모임 | **쿼리 수가 늘어남** (뒤에서 자세히) |
| 오타를 편집기가 잡아줌 | 실제 나가는 SQL 이 안 보임 |
| SQL 인젝션 걱정 사라짐 | ORM 문법을 새로 배워야 함 |
| 테이블 자동 생성 | 복잡한 쿼리는 오히려 더 어려움 |

> 실제로 나가는 SQL 이 궁금하면 `db.py` 의 `echo=False` 를 `True` 로 바꿔보세요. 터미널에 전부 찍힙니다. 확인 후엔 다시 `False` 로 — 안 그러면 너무 시끄럽습니다.

---

## 3. ① 설치 · 파일 분리 · 엔티티 정의

### 3.1 패키지

`backend/requirements.txt`

```
fastapi
uvicorn[standard]
sqlalchemy
psycopg[binary]
python-dotenv
itsdangerous
```

```
pip install -r requirements.txt
```

> `psycopg` 는 계속 필요합니다. **SQLAlchemy 가 PostgreSQL 과 대화할 때 쓰는 드라이버**거든요. 커넥션 풀도 이제 필요 없이 저절로 생깁니다 — **엔진이 자체적으로 관리**하기 때문입니다. Step 4 까지는 요청마다 `psycopg.connect()` 로 새로 접속했는데, 그 연결-재사용 로직을 우리가 짤 필요가 없어진 셈입니다.

### 3.2 `db.py` — 엔진과 세션

```python
import os
from collections.abc import Iterator

from dotenv import load_dotenv
from sqlalchemy import URL, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

load_dotenv()

DATABASE_URL = URL.create(
    "postgresql+psycopg",
    username=os.getenv("DB_USER", "postgres"),
    password=os.getenv("DB_PASSWORD"),
    host=os.getenv("DB_HOST"),
    port=int(os.getenv("DB_PORT", "5432")),
    database=os.getenv("DB_NAME", "postgres"),
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True, echo=False)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    """이 클래스를 상속하면 SQLAlchemy 가 '이건 테이블이다'라고 인식한다."""


def get_db() -> Iterator[Session]:
    with SessionLocal() as session:
        yield session
```

<details>
<summary><b>▸ <code>URL.create()</code> 가 Step 1 의 문제를 어떻게 푸나요?</b></summary>

Step 1 에서 이 에러로 고생했었죠.

```
failed to resolve host 'xxxxxxxx@aws-0-...pooler.supabase.com'
```

비밀번호 안의 `@` 가 주소 구분자로 잘못 해석된 거였고, 그래서 **URL 을 버리고 항목별로 전달**하는 방식으로 바꿨습니다.

그런데 SQLAlchemy 는 접속 정보를 URL 로 받습니다. 다시 원점인가 싶지만, `URL.create()` 가 해결해줍니다.

```python
URL.create("postgresql+psycopg", username=..., password=..., host=...)
```

**항목별로 넘기면 SQLAlchemy 가 알아서 안전하게 조립합니다.** 우리가 문자열을 만들지 않는 게 핵심이에요. 그래서 `.env` 는 지금까지처럼 항목별로 유지합니다.

</details>

<details>
<summary><b>▸ <code>pool_pre_ping=True</code> 는 왜 필요한가요?</b></summary>

Supabase 는 **오래 쉬는 연결을 끊습니다.**

이게 없으면 *"한참 놔뒀다가 첫 요청만 실패하고, 두 번째부터는 되는"* 이상한 증상이 생깁니다. 재현이 안 돼서 원인 찾기가 아주 어려운 유형이에요.

`pre_ping` 은 연결을 빌려주기 전에 **살아 있는지 한 번 확인**하고, 죽었으면 조용히 새로 만듭니다.

</details>

<details>
<summary><b>▸ <code>expire_on_commit=False</code> 는 무슨 뜻인가요?</b></summary>

기본값(`True`)이면 **`commit()` 직후 객체의 모든 값이 "만료" 상태**가 됩니다. 그 뒤에 `profile.full_name` 을 읽으면 DB 를 다시 조회해요.

```python
db.commit()
print(profile.full_name)   # ← 여기서 SELECT 가 한 번 더 나감
```

우리는 commit 후에 응답을 만들어야 하므로 그때마다 조회가 나가면 낭비입니다. `False` 로 두면 메모리에 있는 값을 그대로 씁니다.

> 단, **DB 가 계산한 값**(`updated_at` 같은)은 여전히 옛날 값입니다. 그건 `refresh()` 로 따로 읽어옵니다. 뒤에서 다룹니다.

</details>

### 3.3 `models.py` — 엔티티 (테이블의 모양)

```python
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Identity, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from db import Base


class Profile(Base):
    __tablename__ = "profile"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    full_name: Mapped[str] = mapped_column(Text, nullable=False)
    headline: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
```

**Step 2 에서 SQL 로 만든 테이블과 모양이 정확히 같습니다.**

| 엔티티 | 만들어지는 SQL |
|---|---|
| `BigInteger, Identity(always=True), primary_key=True` | `bigint generated always as identity primary key` |
| `Text, nullable=False` | `text not null` |
| `DateTime(timezone=True), server_default=func.now()` | `timestamptz not null default now()` |

`onupdate=func.now()` 하나만 새로 추가됐습니다. **이제 UPDATE 문에 `updated_at = now()` 를 적을 필요가 없습니다.**

### 3.4 `schemas.py` — DTO (API 의 모양)

```python
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class Profile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    full_name: str
    headline: str
    summary: str | None
    updated_at: datetime


class ProfileUpdate(BaseModel):
    full_name: str = Field(min_length=1, max_length=100)
    headline: str = Field(min_length=1, max_length=200)
    summary: str | None = Field(default=None, max_length=2000)
```

<details>
<summary><b>▸ <code>models.Profile</code> 과 <code>schemas.Profile</code> — 왜 나누나요?</b></summary>

이름이 같아서 **한 파일에 둘 다 둘 수 없다**는 게 직접적인 이유지만, 원래 다른 개념입니다.

```python
models.Profile    # 테이블 — DB 의 모양
schemas.Profile   # DTO   — API 의 모양
```

지금은 둘이 거의 같아서 중복처럼 보입니다. 하지만 곧 갈립니다.

**① 내보내면 안 되는 컬럼**
`internal_memo` 같은 컬럼이 생기면 `models` 에는 있고 `schemas` 에는 없습니다. 그러면 **밖으로 나갈 방법 자체가 없어집니다.**

**② 테이블 구조 ≠ API 형태**
경력을 보여줄 때 API 는 `{"experiences": [{"org": "...", "highlights": [...]}]}` 가 자연스럽지만, DB 에서는 두 테이블로 나뉘어 있습니다.

**③ 지금 당장도 이미 다릅니다**
`models.Profile` 에는 `id` 가 있지만 `schemas.Profile` 에는 없습니다. Step 3 부터 API 응답이 `id` 를 내보낸 적이 없기 때문입니다. `from_attributes=True` 를 써도 **Pydantic 은 자신이 선언한 필드만 꺼내 쓰므로** ORM 객체에 `id` 가 얹혀 있어도 그냥 무시됩니다.

`schemas.ProfileUpdate` 에도 `id` 와 `updated_at` 이 없습니다 — 둘 다 클라이언트가 정할 값이 아니니까요.

**이름이 겹쳐서 불편한 게 아니라, 원래 분리되어야 할 것이 이제야 분리된 것**입니다.

</details>

<details>
<summary><b>▸ <code>from_attributes=True</code> 는 뭔가요?</b></summary>

Pydantic 이 **일반 파이썬 객체의 속성을 읽어서** DTO 로 변환하게 해줍니다.

```python
entity = db.scalars(select(models.Profile)...).first()   # ORM 객체
schemas.Profile.model_validate(entity)                    # → DTO
```

이게 없으면 딕셔너리로 먼저 바꿔야 합니다. 있으면 ORM 객체를 그대로 넘길 수 있어요.

</details>

<details>
<summary><b>▸ 트러블슈팅 — <code>ModuleNotFoundError: No module named 'sqlalchemy'</code></b></summary>

**원인**
가상환경이 활성화되지 않았거나, 설치를 안 했습니다.

**해결**
프롬프트에 `(.venv)` 가 있는지 확인하고:

```
pip install -r requirements.txt
```

확인:

```
pip show sqlalchemy
```

</details>

<details>
<summary><b>▸ 트러블슈팅 — <code>Can't load plugin: sqlalchemy.dialects:postgresql.psycopg</code></b></summary>

**원인**
드라이버 이름이 틀렸거나, 그 드라이버가 설치되지 않았습니다.

| 쓰려는 드라이버 | URL 앞부분 | 설치할 패키지 |
|---|---|---|
| psycopg 3 (우리) | `postgresql+psycopg` | `psycopg[binary]` |
| psycopg2 (옛 버전) | `postgresql+psycopg2` | `psycopg2-binary` |
| asyncpg (비동기) | `postgresql+asyncpg` | `asyncpg` |

**`psycopg` 와 `psycopg2` 는 다른 패키지입니다.** 이름이 비슷해서 자주 헷갈립니다. 우리는 3 버전을 씁니다.

</details>

---

## 4. ② 테이블 자동 생성과 seed

### 4.1 SQLAlchemy 가 이미 제공합니다

```python
Base.metadata.create_all(engine)
```

**이 한 줄이 전부입니다.** `checkfirst=True` 가 기본값이라 내부적으로 이렇게 동작합니다.

```
엔티티 목록을 훑는다
  → 각 테이블이 DB 에 있는지 조회
  → 없는 것만 CREATE TABLE
  → 있는 것은 건너뜀
```

**"있는지 확인하고 없으면 생성"을 우리가 짤 필요가 없습니다.**

### 4.2 `init_db.py` — 생성 · 잠금 · seed 을 한 파일에

```python
import argparse

from sqlalchemy import inspect, select, text

import models
from db import Base, SessionLocal, engine


def create_tables() -> list[str]:
    """새로 만들어진 테이블 이름 목록을 돌려준다."""
    before = set(inspect(engine).get_table_names(schema="public"))
    Base.metadata.create_all(engine)  # checkfirst=True 가 기본값이라 없는 테이블만 만든다.
    after = set(inspect(engine).get_table_names(schema="public"))
    return sorted(after - before)


def lock_down(table_names: list[str]) -> None:
    with engine.begin() as conn:
        for name in table_names:
            conn.execute(text(f'alter table public."{name}" enable row level security'))
            conn.execute(text(f'revoke all on table public."{name}" from anon, authenticated'))


def seed() -> None:
    with SessionLocal() as db:
        if db.scalars(select(models.Profile)).first() is not None:
            return
        db.add(
            models.Profile(
                full_name="백영민",
                headline="백엔드 개발자",
                summary="온라인 이력서를 직접 만들고 있습니다.",
            )
        )
        db.commit()
        print("[init] 초기 데이터 1건 입력")


def init_database() -> None:
    new_tables = create_tables()
    if new_tables:
        lock_down(new_tables)
        print(f"[init] 테이블 생성 + 잠금: {', '.join(new_tables)}")
    seed()


def reset() -> None:
    Base.metadata.drop_all(engine)
    init_database()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true", help="기존 테이블을 지우고 다시 만든다.")
    args = parser.parse_args()

    if args.reset:
        reset()
    else:
        init_database()
```

`inspect()` 는 **생성 여부를 판단하려는 게 아닙니다.** 그건 `create_all` 이 이미 합니다. "이번에 뭐가 새로 생겼는지"를 알아내서 **로그와 잠금 대상**으로 쓰려는 것입니다.

### 4.3 보안 잠금이 자동화됐습니다

Step 2 에서는 테이블을 만들 때마다 **손으로** 두 줄을 실행해야 했죠.

```sql
alter table public.profile enable row level security;
revoke all on table public.profile from anon, authenticated;
```

이제 `lock_down()` 이 **새로 생긴** 테이블 이름을 돌면서 처리합니다. **테이블이 10개로 늘어도 빠뜨릴 일이 없고**, 이미 있던 테이블을 매번 다시 잠그려 들지도 않습니다.

<details>
<summary><b>▸ 여기서는 SQL 을 문자열로 조립합니다 — 괜찮은가요?</b></summary>

Step 4 에서 *"문자열을 이어 붙여 SQL 을 만들지 마라"* 고 했는데, 이 함수는 그렇게 합니다.

```python
conn.execute(text(f'alter table public."{name}" enable row level security'))
```

**파라미터 바인딩은 "값"에만 쓸 수 있고, 테이블·컬럼 이름 같은 "식별자"에는 쓸 수 없습니다.** 데이터베이스 문법 자체가 그렇습니다.

```python
text("select ... where id = :id")        # ✅ 값은 바인딩 가능
text("alter table :name enable ...")     # ❌ 이름은 불가능
```

그래서 식별자를 문자열로 넣어야 할 때는 **그 값이 사용자 입력이 아님을 보장**해야 합니다. 여기서는 `Base.metadata` 에 있는 **우리 코드에 적힌 엔티티 이름**이라 안전합니다.

> 규칙을 "절대 문자열 조립 금지"로 외우면 이런 상황에서 막힙니다.
> 진짜 규칙은 **"사용자 입력이 SQL 문법의 일부가 되지 않게 하라"** 입니다.

</details>

### 4.4 초기 데이터 한 건

`seed()` 는 **테이블에 행이 하나도 없을 때만** 실행됩니다.

```python
if db.scalars(select(models.Profile)).first() is not None:
    return
```

`select(models.Profile)` 로 아무거나 한 줄만 찾아보고, 있으면 그냥 돌아갑니다. **여러 번 실행해도 두 번째부터는 아무 일도 안 일어납니다.**

### 4.5 서버 시작 때 실행

`backend/main.py`

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 엔티티 기준으로 테이블이 있는지 확인하고, 없으면 만든다.
    # 비어 있으면 화면에 보여줄 한 건을 넣는다.
    init_database()
    yield
    engine.dispose()


app = FastAPI(lifespan=lifespan)
```

**여러 번 실행해도 안전**하므로 매번 시작할 때 호출합니다.

### 4.6 확인

**테이블을 지워보고** 서버를 켜보세요.

```sql
drop table if exists public.profile;
```

```
[init] 테이블 생성 + 잠금: profile
[init] 초기 데이터 1건 입력
INFO:     Application startup complete.
```

두 번째 시작부터는 `[init]` 줄이 **안 나옵니다.** 이미 있으니 아무것도 안 하는 거예요.

### 4.7 통째로 다시 만들기

```
python init_db.py --reset
```

> ⚠️ **기존 테이블과 데이터가 모두 사라집니다.** 서버를 끄고 실행하세요.

<details>
<summary><b>▸ 트러블슈팅 — 컬럼을 추가했는데 DB 에 안 생긴다</b></summary>

**증상**
`models.py` 에 컬럼을 추가하고 서버를 재시작했는데, 조회하면 이런 에러가 납니다.

```
psycopg.errors.UndefinedColumn: column profile.phone does not exist
```

**원인 — `create_all` 은 마이그레이션 도구가 아닙니다**

```
테이블 추가        → create_all 이 처리 ✅
컬럼 추가·변경     → 아무 일도 안 일어남 ❌ (조용히 넘어감)
```

`checkfirst` 는 **테이블 존재만** 확인합니다. 테이블이 있으면 "됐네" 하고 넘어가지, 안의 컬럼이 맞는지는 보지 않아요.

**에러도 안 나고 조용히 넘어간다**는 게 가장 헷갈리는 부분입니다.

**해결 — 지금 규모에서는 통째로 다시 만들기**

```
python init_db.py --reset
```

데이터가 쌓인 뒤에는 이 방법을 쓸 수 없습니다. 그때는 **Alembic** 같은 마이그레이션 도구를 도입하거나, 변경 SQL 을 직접 실행해야 합니다.

</details>

<details>
<summary><b>▸ 트러블슈팅 — <code>drop_all</code> 이 멈춰 있다</b></summary>

**원인**
다른 연결이 그 테이블을 붙들고 있습니다. 대개 **서버가 켜져 있는 상태**입니다.

**해결**
`backend` 터미널에서 `Ctrl+C` 로 서버를 끄고 다시 실행하세요.

</details>

---

## 5. ③ 엔드포인트를 ORM 으로

### 5.1 수정 로직 — 이게 가장 극적으로 바뀝니다

```diff
-@app.put("/api/profile", response_model=ProfileResponse, dependencies=[Depends(require_admin)])
-def update_profile(body: ProfileUpdate):
-    with psycopg.connect(**DB_CONFIG, connect_timeout=5) as conn:
-        with conn.cursor(row_factory=dict_row) as cur:
-            cur.execute(
-                """
-                update public.profile
-                   set full_name  = %(full_name)s,
-                       headline   = %(headline)s,
-                       summary    = %(summary)s,
-                       updated_at = now()
-                 where id = (select id from public.profile order by id limit 1)
-             returning full_name, headline, summary, updated_at
-                """,
-                body.model_dump(),
-            )
-            row = cur.fetchone()
-
-    if row is None:
-        raise HTTPException(status_code=404, detail="프로필이 아직 없습니다.")
-
-    return ProfileResponse(profile=Profile(**row))
+@app.put("/api/profile", response_model=schemas.ProfileResponse, dependencies=[Depends(require_admin)])
+def update_profile(body: schemas.ProfileUpdate, db: Session = Depends(get_db)):
+    entity = load_profile(db)
+
+    entity.full_name = body.full_name
+    entity.headline = body.headline
+    entity.summary = body.summary
+
+    db.commit()
+    db.refresh(entity)
+
+    return schemas.ProfileResponse(profile=schemas.Profile.model_validate(entity))
```

### 5.2 조회

```python
def load_profile(db: Session) -> models.Profile:
    profile = db.scalars(
        select(models.Profile).order_by(models.Profile.id).limit(1)
    ).first()

    if profile is None:
        raise HTTPException(status_code=404, detail="프로필이 아직 없습니다.")

    return profile
```

`select(models.Profile)` — **SQL 문자열이 아니라 파이썬 표현식**입니다. 컬럼 이름을 오타 내면 편집기가 바로 잡아줍니다.

`db.scalars(...)` 는 "행 전체가 아니라 **객체 하나씩** 꺼내라"는 뜻입니다.

`get_profile` 과 `update_profile` 이 이 함수 하나를 같이 씁니다 — 첫 줄을 찾는 로직이 두 곳에 흩어지지 않습니다.

### 5.3 수정은 속성 대입으로

```python
entity.full_name = body.full_name
db.commit()
```

**객체의 속성을 바꾸기만 하면 됩니다.** SQLAlchemy 가 "이 객체의 어떤 필드가 바뀌었는지" 추적하고 있다가, `commit()` 때 **바뀐 컬럼만** 골라 `UPDATE` 문을 만듭니다.

이름만 고쳤다면 `set full_name = ...` 하나만 나갑니다.

> 이 추적을 **더티 트래킹(dirty tracking)** 이라고 합니다. 세션이 자기가 들고 있는 객체들의 원래 값을 기억하고 있다가, 달라진 것만 찾아냅니다.

### 5.4 `updated_at` 이 코드에서 사라졌습니다

이전 UPDATE 문에는 `updated_at = now()` 가 손으로 적혀 있었습니다. 지금은 없습니다 — `models.py` 에 선언해뒀으니까요.

```python
updated_at: Mapped[datetime] = mapped_column(..., onupdate=func.now())
```

**컬럼이 늘어나도 UPDATE 문을 고칠 일이 없다**는 게 ORM 의 실질적 이득입니다.

### 5.5 `db.refresh()` — 대가를 정직하게

```python
db.commit()
db.refresh(entity)
```

`updated_at` 은 **DB 가 `now()` 로 계산한 값**입니다. 파이썬 쪽 객체는 아직 옛날 값을 들고 있어요. `refresh()` 로 다시 읽어옵니다.

| | Step 4 (raw) | Step 5 (ORM) |
|---|---|---|
| 수정 | `UPDATE ... RETURNING` **1번** | `SELECT` + `UPDATE` + `SELECT` **3번** |

Step 4 에서 `RETURNING` 으로 한 번에 끝냈던 걸 세 번에 나눠 합니다.

**이 앱 규모에서는 전혀 문제가 안 되지만**, ORM 이 공짜가 아니라는 건 알고 계시는 게 좋습니다. 정말 성능이 중요한 지점에서는 ORM 을 우회해 최적화된 쿼리를 쓰면 됩니다.

### 5.6 `text()` — ORM 을 써도 raw SQL 은 쓸 수 있습니다

```python
@app.get("/api/health", response_model=schemas.HealthResponse)
def health(db: Session = Depends(get_db)):
    version = db.scalar(text("select version()"))
    ...
```

`/api/health` 는 그대로 raw SQL 입니다. **버전 문자열은 엔티티로 표현할 대상이 아니니까요.**

**대부분은 ORM 으로, 안 맞는 것만 `text()` 로** — 이게 현실적인 사용법입니다. ORM 을 도입한다고 SQL 을 못 쓰게 되는 게 아닙니다.

### 5.7 세션의 수명

```python
def get_db() -> Iterator[Session]:
    with SessionLocal() as session:
        yield session
```
```python
def get_profile(db: Session = Depends(get_db)):
```

**요청이 들어오면 세션 하나를 빌려주고, 응답이 나가면 자동으로 닫습니다.**

`yield` 앞이 준비, 뒤가 정리 — `lifespan` 과 같은 구조인데 범위가 "서버 전체"가 아니라 **"요청 하나"** 입니다.

Step 4 까지는 요청마다 `psycopg.connect()` 로 새로 접속했습니다. 이제는 **SQLAlchemy 엔진이 자체 커넥션 풀을 갖고 있어서** 세션 뒤에서 연결을 재사용합니다 — 우리가 직접 짜지 않아도 따라온 부수 효과입니다.

### 5.8 SQL 인젝션 걱정이 사라졌습니다

Step 4 에서 `%(name)s` 자리 표시를 꼼꼼히 썼던 이유가 SQL 인젝션 방어였죠.

**ORM 은 항상 바인딩으로 값을 넘깁니다.** 실수로 문자열을 이어 붙일 방법이 없어요.

```python
entity.full_name = body.full_name   # 무슨 값이 들어와도 그냥 값이다
db.commit()
```

> 단, `text()` 로 raw SQL 을 쓸 때는 여전히 조심해야 합니다. **ORM 은 기본값을 안전하게 만들어줄 뿐, 면제권이 아닙니다.**

<details>
<summary><b>▸ 트러블슈팅 — <code>sqlalchemy.exc.OperationalError</code> (연결 실패)</b></summary>

**원인 대부분은 `.env`** 입니다.

**확인 1 — 항목이 다 있는가**

```
DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD
```

값이 비어 있으면 `URL.create()` 에 `None` 이 그대로 들어가 접속 자체가 실패합니다.

**확인 2 — Session pooler 주소인가**
`db.[프로젝트ID].supabase.co` 로 시작하는 **직접 연결 주소는 IPv6 전용**이라 실패할 수 있습니다. Supabase → Connect → Session pooler 의 주소를 쓰세요.

**확인 3 — 비밀번호에 특수문자**
`URL.create()` 를 쓰므로 값 자체는 안전하게 조립됩니다. 다만 **`.env` 파일에 적을 때**는 작은따옴표로 감싸는 게 안전합니다.

</details>

---

## 6. 코드 전체

### `backend/db.py`

```python
import os
from collections.abc import Iterator

from dotenv import load_dotenv
from sqlalchemy import URL, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

load_dotenv()

DATABASE_URL = URL.create(
    "postgresql+psycopg",
    username=os.getenv("DB_USER", "postgres"),
    password=os.getenv("DB_PASSWORD"),
    host=os.getenv("DB_HOST"),
    port=int(os.getenv("DB_PORT", "5432")),
    database=os.getenv("DB_NAME", "postgres"),
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True, echo=False)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    """이 클래스를 상속하면 SQLAlchemy 가 '이건 테이블이다'라고 인식한다."""


def get_db() -> Iterator[Session]:
    with SessionLocal() as session:
        yield session
```

### `backend/models.py`

```python
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Identity, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from db import Base


class Profile(Base):
    __tablename__ = "profile"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    full_name: Mapped[str] = mapped_column(Text, nullable=False)
    headline: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
```

### `backend/schemas.py`

```python
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class HealthResponse(BaseModel):
    status: str
    database: str
    version: str


class Profile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

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
```

### `backend/init_db.py`

```python
import argparse

from sqlalchemy import inspect, select, text

import models
from db import Base, SessionLocal, engine


def create_tables() -> list[str]:
    """새로 만들어진 테이블 이름 목록을 돌려준다."""
    before = set(inspect(engine).get_table_names(schema="public"))
    Base.metadata.create_all(engine)  # checkfirst=True 가 기본값이라 없는 테이블만 만든다.
    after = set(inspect(engine).get_table_names(schema="public"))
    return sorted(after - before)


def lock_down(table_names: list[str]) -> None:
    with engine.begin() as conn:
        for name in table_names:
            conn.execute(text(f'alter table public."{name}" enable row level security'))
            conn.execute(text(f'revoke all on table public."{name}" from anon, authenticated'))


def seed() -> None:
    with SessionLocal() as db:
        if db.scalars(select(models.Profile)).first() is not None:
            return
        db.add(
            models.Profile(
                full_name="백영민",
                headline="백엔드 개발자",
                summary="온라인 이력서를 직접 만들고 있습니다.",
            )
        )
        db.commit()
        print("[init] 초기 데이터 1건 입력")


def init_database() -> None:
    new_tables = create_tables()
    if new_tables:
        lock_down(new_tables)
        print(f"[init] 테이블 생성 + 잠금: {', '.join(new_tables)}")
    seed()


def reset() -> None:
    Base.metadata.drop_all(engine)
    init_database()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true", help="기존 테이블을 지우고 다시 만든다.")
    args = parser.parse_args()

    if args.reset:
        reset()
    else:
        init_database()
```

### `backend/main.py`

```python
import os
import secrets
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request
from sqlalchemy import select, text
from sqlalchemy.orm import Session
from starlette.middleware.sessions import SessionMiddleware

import models
import schemas
from db import engine, get_db
from init_db import init_database

load_dotenv()

ADMIN_PASSCODE = os.environ["ADMIN_PASSCODE"]
SESSION_SECRET = os.environ["SESSION_SECRET"]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 엔티티 기준으로 테이블이 있는지 확인하고, 없으면 만든다.
    # 비어 있으면 화면에 보여줄 한 건을 넣는다.
    init_database()
    yield
    engine.dispose()


app = FastAPI(lifespan=lifespan)
app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET, session_cookie="myhub_session")


def require_admin(request: Request) -> None:
    if not request.session.get("admin"):
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")


def load_profile(db: Session) -> models.Profile:
    profile = db.scalars(select(models.Profile).order_by(models.Profile.id).limit(1)).first()

    if profile is None:
        raise HTTPException(status_code=404, detail="프로필이 아직 없습니다.")

    return profile


@app.get("/api/health", response_model=schemas.HealthResponse)
def health(db: Session = Depends(get_db)):
    try:
        version = db.scalar(text("select version()"))
        return schemas.HealthResponse(status="ok", database="connected", version=version)
    except Exception as e:
        raise HTTPException(status_code=503, detail={"status": "error", "database": "disconnected", "error": str(e)})


@app.get("/api/profile", response_model=schemas.ProfileResponse)
def get_profile(db: Session = Depends(get_db)):
    entity = load_profile(db)
    return schemas.ProfileResponse(profile=schemas.Profile.model_validate(entity))


@app.put("/api/profile", response_model=schemas.ProfileResponse, dependencies=[Depends(require_admin)])
def update_profile(body: schemas.ProfileUpdate, db: Session = Depends(get_db)):
    entity = load_profile(db)

    entity.full_name = body.full_name
    entity.headline = body.headline
    entity.summary = body.summary

    db.commit()
    db.refresh(entity)

    return schemas.ProfileResponse(profile=schemas.Profile.model_validate(entity))


@app.post("/api/auth/session", response_model=schemas.SessionResponse)
def login(body: schemas.LoginRequest, request: Request):
    if not secrets.compare_digest(body.passcode.encode("utf-8"), ADMIN_PASSCODE.encode("utf-8")):
        raise HTTPException(status_code=401, detail="비밀코드가 올바르지 않습니다.")

    request.session["admin"] = True
    return schemas.SessionResponse(authenticated=True)


@app.get("/api/auth/session", response_model=schemas.SessionResponse)
def check_session(request: Request):
    return schemas.SessionResponse(authenticated=bool(request.session.get("admin")))


@app.delete("/api/auth/session", response_model=schemas.SessionResponse)
def logout(request: Request):
    request.session.clear()
    return schemas.SessionResponse(authenticated=False)
```

---

## 7. ④ 정리

### 7.1 최종 구조

```
backend/
├── main.py       엔드포인트 — SQL 이 한 줄도 없음 (health 의 text() 제외)
├── db.py         엔진 · 세션 · Base
├── models.py     ORM 엔티티   (테이블의 모양)
├── schemas.py    Pydantic DTO (API 의 모양)
├── init_db.py    시작 시 테이블 자동 생성 + seed
└── .env
```

**Step 4 까지는 `main.py` 하나에 전부 있었습니다.** ORM 을 넣으면서 자연스럽게 나뉜 거예요 — 미리 나눈 게 아니라, **나눌 이유가 생겨서** 나눴습니다.

### 7.2 프론트엔드는 손대지 않았습니다

API 의 주소도 응답 모양도 그대로라 **`npm run gen:api` 조차 필요 없습니다.**

**이게 DTO 를 따로 둔 덕분입니다.** 백엔드 내부를 통째로 갈아엎었는데 계약서(OpenAPI)가 그대로라 프론트엔드는 아무 영향을 안 받았어요.

---

## 8. 이번에 배운 개념

| 용어 | 한 줄 설명 |
|---|---|
| **ORM** | 파이썬 객체와 테이블 행을 이어주는 것 |
| **엔티티 (Entity)** | 테이블 하나에 대응하는 파이썬 클래스 |
| **`DeclarativeBase`** | 엔티티들의 부모. 상속하면 테이블로 인식됨 |
| **`Base.metadata`** | 엔티티들의 테이블 정보가 모이는 곳 |
| **`create_all(checkfirst=True)`** | 없는 테이블만 만든다 (기본 동작) |
| **엔진 (Engine)** | DB 연결을 관리하는 객체. 자체 커넥션 풀을 가짐 |
| **세션 (Session)** | 한 작업 단위. 객체를 들고 있다가 commit 때 SQL 을 만듦 |
| **더티 트래킹** | 세션이 "어떤 속성이 바뀌었는지" 추적하는 것 |
| **`pool_pre_ping`** | 연결을 빌려주기 전에 살아 있는지 확인 |
| **`expire_on_commit`** | commit 후 값을 다시 조회할지 여부 |
| **`refresh()`** | DB 가 계산한 값을 다시 읽어오는 것 |
| **`text()`** | ORM 안에서 raw SQL 을 쓰는 탈출구 |
| **`URL.create()`** | 접속 정보를 안전하게 URL 로 조립 |
| **식별자 vs 값** | 테이블·컬럼 이름은 바인딩 불가, 값은 가능 |

---

## 9. 여기까지의 여정

```
Step 1   브라우저 → FastAPI → Supabase            데이터를 쌓을 곳을 마련했다
Step 2   테이블 + API                             데이터를 쌓아보고 이걸 확인했다
Step 3   React + 타입 자동 생성                    쌓은 데이터를 보여줄 수 있게 되었다
Step 4   로그인 + 편집                             쌓은 데이터를 편집할 수 있게 되었다
Step 5   ORM                                    쌓은 데이터를 우아하게 편집할 수 있게 되었다
```

**뼈대가 완성됐습니다.** 이제 이력서 항목(경력·프로젝트·학력·스킬)을 늘리는 일은 **같은 패턴의 반복**입니다.

```
models.py 에 엔티티 추가
  → 서버 재시작하면 테이블 자동 생성
  → schemas.py 에 DTO 추가
  → main.py 에 엔드포인트 추가
  → npm run gen:api
  → 화면에서 쓰기
```

Step 1~4 에서 한 번씩 겪었던 것들이라, 이제는 **새로 배울 게 거의 없습니다.**

← 이전: [Step 4 — 내가 로그인해서 수정하기](step4_login_and_edit.md)
