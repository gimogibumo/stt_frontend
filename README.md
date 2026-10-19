# Survive the Traffic Frontend

티켓 예매 프로젝트의 React 프론트엔드입니다. 백엔드는 별도 저장소에서 실행되며, 이 저장소는 확인된 API 계약만 사용합니다.

## 기술 스택

- React
- TypeScript
- Vite
- React Router

## 로컬 실행

```bash
npm install
cp .env.example .env.local
npm run dev
```

`VITE_API_BASE_URL`에는 별도로 실행한 백엔드의 기본 URL을 지정합니다. 현재 초기 화면은 API를 호출하지 않습니다.

## 검증

```bash
npm run build
```

## 구현 상태

현재 Phase 6의 프로젝트 골격만 초기화되어 있습니다. 로그인, 공연, 대기열, 좌석, 예약, 결제 API 연동은 실제 백엔드 계약을 확인한 뒤 순서대로 구현합니다.
