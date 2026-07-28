### step 1: Project init
```
backend 디렉토리에 다음 기술스택을 갖는 파이썬 백엔드 프로젝트 초기화.

* python
* fastapi
* supabase (postgresql, session spooler) + psycopg 동기호출


supabase 데이터베이스에 접속하여 연결된 데이터베이스의 상태와 버전을 json으로 응답하는 /health 엔드포인트를 미니멀하게 구현.
구현체는 main.py 파일 하나로 통합.
필요한 conn info, api secret  등은 .env 파일에 만들어서 서버가 env로부터 로드하도록 함. (.env.example로 예제를 제공해야 함)
필요한 디펜던시는 pip requirements.txt 파일로 정리.
```