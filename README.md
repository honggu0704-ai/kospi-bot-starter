# kospi-bot-starter (Render & GPTs Actions용)

KOSPI 전체 전자공시(DART)와 관련 뉴스(네이버)를 모아주는 간단한 API 서버입니다.

## 엔드포인트
- `GET /healthz` : 헬스 체크
- `GET /updates` : 최신 공시/뉴스 목록 (OpenAPI `openapi.json` 포함)

## 필수 환경변수
- `TZ=Asia/Seoul`
- `BOT_API_KEY` : GPTs 액션에서 `X-API-Key` 헤더로 보낼 값
- `DART_API_KEY` : 오픈DART API 키
- `NAVER_CLIENT_ID` : 네이버 검색 API
- `NAVER_CLIENT_SECRET` : 네이버 검색 API

## 로컬 실행
```bash
npm i
BOT_API_KEY=dev-key DART_API_KEY=키 NAVER_CLIENT_ID=키 NAVER_CLIENT_SECRET=키 TZ=Asia/Seoul npm start
```

## Render 배포
1. Render Web Service 생성 (Node 18 이상)
2. **Environment** 탭에서 아래 추가 후 저장
   - `TZ=Asia/Seoul`
   - `BOT_API_KEY=...`
   - `DART_API_KEY=...`
   - `NAVER_CLIENT_ID=...`
   - `NAVER_CLIENT_SECRET=...`
3. Manual Deploy 또는 최신 커밋 배포

## GPTs 액션 연결
1. `openapi.json` 파일 내용을 **GPTs > Edit > Actions > Import from OpenAPI**에 붙여넣기
2. **Actions > Authentication**에서
   - 인증 유형: API 키
   - API 키: Render의 `BOT_API_KEY` 값
   - 맞춤형 헤더 이름: `X-API-Key`
3. Build > Preview에서 `/updates` 호출 확인

## 간단 테스트
```bash
curl -s https://<your-render-service>.onrender.com/healthz
curl -s -H "X-API-Key: <BOT_API_KEY>" "https://<your-render-service>.onrender.com/updates?market=KOSPI&limit=50" | jq '.items | length, .[:3]'
```
