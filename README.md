# Survive the Traffic Frontend

Survive the Traffic 티켓 예매 서비스의 React 프론트엔드입니다. 별도 Spring Boot 백엔드의 세션·CSRF 인증과 실제 API를 사용하며, 확인된 계약은 [API_CONTRACT.md](./API_CONTRACT.md)에 정리되어 있습니다.

## 구현 범위

- 회원가입, 로그인, 로그아웃, 새로고침 후 로그인 복원
- 공연 검색·목록·상세
- 대기열 참여, 약 1초 간격 폴링, `ADMITTED` 전환 및 새로고침 복원
- 입장 상태 확인 후 좌석 조회·검색·페이지 분할
- 좌석 예약과 `409 Conflict` 발생 시 좌석 재조회
- 새로고침 후에도 복원되는 예약 결제와 로그인 사용자의 예약 목록
- API 공통 오류 처리와 보호 경로

대기열 상태와 좌석 상태는 브라우저가 임의로 만들지 않습니다. 새로고침하거나 페이지에 다시 진입하면 백엔드 상태를 다시 조회합니다.

## 기술 스택

- React 19
- TypeScript
- Vite
- React Router
- Vitest, Testing Library

## 로컬 실행

백엔드를 먼저 `http://localhost:8080`에서 실행합니다. 기본 CORS 계약이 `http://localhost:5173`을 허용하므로 프론트엔드도 `localhost` 주소로 접속해야 합니다.

```bash
npm install
cp .env.example .env.local
npm run dev
```

다른 백엔드 주소를 사용한다면 `.env.local`에서 설정합니다.

```dotenv
VITE_API_BASE_URL=http://localhost:8080
```

실제 비밀값은 커밋하지 않습니다.

## 주요 경로

| 경로 | 기능 |
|---|---|
| `/login` | 로그인 |
| `/signup` | 회원가입 |
| `/concerts` | 공연 목록 |
| `/concerts/:concertId` | 공연 상세 |
| `/concerts/:concertId/queue` | 대기열 참여·상태 복원 |
| `/concerts/:concertId/seats` | 좌석 선택·예약 |
| `/reservations/:reservationId/payment` | 결제 |
| `/my/reservations` | 내 예약 |

## 인증과 CSRF

백엔드는 JWT가 아닌 HTTP 세션을 사용합니다. 모든 API 요청은 쿠키를 포함하고, 상태 변경 요청 전에는 `/api/csrf`에서 발급된 `XSRF-TOKEN` 쿠키 값을 `X-XSRF-TOKEN` 헤더로 전송합니다. 로그인 성공 후 세션과 토큰이 회전하므로 CSRF를 다시 발급받습니다.

## 검증

```bash
npm test
npm run build
```

자동 테스트는 CSRF 요청, 백엔드 오류 보존, 대기열 폴링·재시도·중지, 좌석 예약 충돌 후 재조회를 검증합니다.

## 결제 화면 복원

결제 화면은 `GET /api/reservations/{reservationId}`로 로그인 사용자의 예약을 다시 조회합니다. 따라서 좌석 선택 화면에서 직접 이동한 경우뿐 아니라 새로고침하거나 결제 URL로 다시 진입한 경우에도 공연·좌석·금액·결제 기한·예약 상태를 복원합니다.
