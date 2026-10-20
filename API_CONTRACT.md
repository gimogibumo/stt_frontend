# API_CONTRACT.md

## Survive the Traffic — Frontend / Backend API Contract

This document is for the **frontend repository**.

The backend lives in a separate repository.
The frontend must not invent endpoint paths, DTO fields, authentication behavior, or enum values that are not documented here.

## Verification baseline

This contract was checked against the backend repository at:

```text
repository: /Users/gimgibeom/Downloads/survive_the_traffic
branch:     main
commit:     2b0f6ec71db577045fc297a7097bf379915699a6
verified:   2026-10-19
```

The complete backend test suite passed against that revision:

```text
115 tests
0 failures
0 errors
1 skipped
```

The reservation-detail contract in section 4.2 was additionally verified on
2026-10-20 against backend commit `5ce200a` (`feat: 단건 예약 조회 추가`), its
controller test, and a live HTTP `200` response from the local server on port
8080. The backend working tree's unrelated user-owned test edits were not
modified.

Source verification covers controller mappings, HTTP DTOs, enum values, exception handlers, and build dependencies. Repository-only queue result types are documented separately from JSON returned to the browser.

---

# 0. Contract Status

This document separates information into three levels.

| Marker | Meaning |
|---|---|
| `CONFIRMED` | Verified in the backend source at the revision recorded above, and by controller tests where tests exist |
| `SEMANTICS CONFIRMED` | Backend behavior is confirmed, but the exact HTTP endpoint or JSON shape is not fully available in the current material |
| `NEEDS BACKEND VERIFICATION` | Do not implement against an assumed shape; backend contract must be checked first |

If a required item is marked `NEEDS BACKEND VERIFICATION`, the frontend agent must report a `BACKEND BLOCKER` rather than inventing a contract.

---

# 1. Authentication, Session, and CSRF

## Status

`CONFIRMED`

The backend uses Spring Security with server-side HTTP sessions. It does not issue JWTs. The authenticated user ID comes from the session principal and must not be supplied by the browser for queue, reservation, payment, or My Reservations APIs.

The frontend must send cookies on cross-origin API requests:

```ts
fetch(url, {
  credentials: "include",
});
```

### Access policy

| Request | Access |
|---|---|
| `GET /api/csrf` | Public |
| `POST /api/auth/signup` | Public, but CSRF token required |
| `POST /api/auth/login` | Public, but CSRF token required |
| `GET /api/concerts/**` | Public |
| All other application requests | Authenticated session required |

An unauthenticated request to a protected endpoint returns HTTP `401`. The Spring Security entry point does not establish an `ErrorResponse` JSON body for this case.

## 1.1 Get CSRF Token

```http
GET /api/csrf
```

### Response

```json
{
  "headerName": "X-XSRF-TOKEN",
  "parameterName": "_csrf",
  "token": "<generated-token>"
}
```

The response also sets the JavaScript-readable `XSRF-TOKEN` cookie. The tested browser-style contract sends that cookie's value in the `X-XSRF-TOKEN` request header.

All state-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`) require both:

```text
cookie: XSRF-TOKEN=<token>
header: X-XSRF-TOKEN: <token>
```

Missing or invalid CSRF credentials return HTTP `403` before the controller is called. No `{ code, message }` body is guaranteed.

Successful login rotates the session ID and CSRF token. The frontend must fetch `GET /api/csrf` again after login before its next state-changing request.

## 1.2 Sign Up

```http
POST /api/auth/signup
Content-Type: application/json
X-XSRF-TOKEN: <token>
```

### Request

```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "홍길동"
}
```

```ts
export interface SignupRequest {
  email: string;
  password: string;
  name: string;
}
```

Validation rules:

```text
email    required, non-blank, valid email format
password required, non-blank, 8 through 12 characters
name     required, non-blank, at most 50 characters
```

Email is trimmed and normalized to lowercase before storage.

### Success — `201 Created`

```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "홍길동"
}
```

The response never exposes a password or password hash.

Signup does not create an authenticated session. After signup, the user must complete the login flow.

### Errors

| HTTP Status | Code | Meaning |
|---|---|---|
| `400` | `INVALID_REQUEST` | Request validation failed |
| `409` | `DUPLICATE_EMAIL` | Email is already registered |
| `403` | not guaranteed | CSRF credential is missing or invalid |

## 1.3 Log In

```http
POST /api/auth/login
Content-Type: application/json
X-XSRF-TOKEN: <token>
```

### Request

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

```ts
export interface LoginRequest {
  email: string;
  password: string;
}
```

Both fields are required and non-blank, and `email` must have a valid email format. Email is trimmed and normalized to lowercase before authentication.

### Success — `200 OK`

```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "홍길동"
}
```

```ts
export interface AuthenticatedUserResponse {
  id: number;
  email: string;
  name: string;
}
```

The response is accompanied by the authenticated HTTP session. The frontend must continue using `credentials: "include"`.

### Errors

| HTTP Status | Code | Meaning |
|---|---|---|
| `400` | `INVALID_REQUEST` | Request validation failed |
| `401` | `INVALID_CREDENTIALS` | Email or password is incorrect |
| `403` | not guaranteed | CSRF credential is missing or invalid |

## 1.4 Get Current User

```http
GET /api/users/me
```

Authenticated success returns the same `AuthenticatedUserResponse` shape as login. An unauthenticated request returns HTTP `401` without a guaranteed JSON error body.

Use this endpoint to recover authentication state after browser refresh.

## 1.5 Log Out

```http
POST /api/auth/logout
X-XSRF-TOKEN: <token>
```

No request body is used.

Successful logout invalidates the session and returns:

```http
204 No Content
```

Without a valid CSRF token it returns HTTP `403` and keeps the login session active.

---

# 2. Concert APIs

## 2.1 Get Concert List

`CONFIRMED`

```http
GET /api/concerts
```

### Response

```json
[
  {
    "id": 1,
    "title": "2026 Backend Festival",
    "reservationOpenAt": "2026-09-01T20:00:00",
    "concertAt": "2026-09-30T19:00:00"
  }
]
```

### Frontend Type

```ts
export interface ConcertSummary {
  id: number;
  title: string;
  reservationOpenAt: string;
  concertAt: string;
}
```

### Notes

Dates are ISO-8601 local date-time JSON strings produced from Java `LocalDateTime`. They contain no UTC offset or time-zone identifier.

The frontend may format them for display but must not append `Z` or silently treat them as UTC. The backend contract does not currently identify the intended time zone.

### Errors

The list endpoint has no documented domain error. Unexpected failures are not normalized by a generic exception handler.

---

## 2.2 Get Concert Detail

`CONFIRMED`

```http
GET /api/concerts/{concertId}
```

Example:

```http
GET /api/concerts/1
```

### Response

```json
{
  "id": 1,
  "title": "2026 Backend Festival",
  "reservationOpenAt": "2026-09-01T20:00:00",
  "concertAt": "2026-09-30T19:00:00"
}
```

### Frontend Type

```ts
export interface ConcertDetail {
  id: number;
  title: string;
  reservationOpenAt: string;
  concertAt: string;
}
```

### Not currently confirmed

The current contract does **not** establish fields such as:

```text
venue
description
posterUrl
artist
seatMapImage
```

Do not fabricate them.

### Errors

```http
404 Not Found
```

```json
{
  "code": "CONCERT_NOT_FOUND",
  "message": "콘서트를 찾을 수 없습니다."
}
```

## 2.3 Update Concert — Not Used by Phase 6 Frontend

`CONFIRMED`

```http
PUT /api/concerts/{concertId}
Content-Type: application/json
```

```json
{
  "title": "2026 Backend Festival",
  "reservationOpenAt": "2026-09-01T20:00:00",
  "concertAt": "2026-09-30T19:00:00"
}
```

The response has the same shape as `ConcertResponse`. A missing concert returns `CONCERT_NOT_FOUND` with HTTP `404`.

This mutation requires an authenticated session and CSRF token, but there is no admin-role restriction. It has no Phase 6 user-journey requirement. The frontend must not expose it as an admin feature without an explicit authorization contract.

---

# 3. Seat API

## 3.1 Get Seats for Concert

`CONFIRMED`

```http
GET /api/concerts/{concertId}/seats
```

Example:

```http
GET /api/concerts/1/seats
```

### Response

```json
[
  {
    "seatId": 101,
    "section": "A",
    "row": 1,
    "number": 1,
    "price": 150000,
    "status": "AVAILABLE"
  },
  {
    "seatId": 102,
    "section": "A",
    "row": 1,
    "number": 2,
    "price": 150000,
    "status": "SOLD"
  }
]
```

### Confirmed Seat Status Semantics

```text
AVAILABLE
HELD
SOLD
```

### Frontend Type

```ts
export type SeatStatus =
  | "AVAILABLE"
  | "HELD"
  | "SOLD";

export interface SeatResponse {
  seatId: number;
  section: string;
  row: number;
  number: number;
  price: number;
  status: SeatStatus;
}
```

### Important Frontend Rule

Seat state is not authoritative once rendered in the browser.

Two users can see the same seat as `AVAILABLE`, race to reserve it, and only one may succeed.

A stale `AVAILABLE` display is therefore expected behavior and must be handled through reservation conflict UX.

### Errors

A missing concert returns HTTP `404` with `CONCERT_NOT_FOUND`.

---

# 4. Reservation API

## 4.1 Create Reservation

`CONFIRMED`

```http
POST /api/reservations
Content-Type: application/json
X-XSRF-TOKEN: <token>
```

### Current Request

The authenticated user ID is not part of the request body:

```json
{
  "concertId": 1,
  "seatId": 100
}
```

### Frontend Type

```ts
export interface CreateReservationRequest {
  concertId: number;
  seatId: number;
}
```

The backend always uses the user ID from the authenticated session principal. An extra browser-supplied `userId` is ignored during JSON deserialization and is never used as reservation identity.

### Current Response

Observed current successful response:

```json
{
  "reservationId": 1,
  "seatId": 100,
  "status": "PENDING",
  "expiresAt": "2026-10-16T00:48:05.841634"
}
```

### Frontend Type

```ts
export type ReservationStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "EXPIRED";

export interface CreateReservationResponse {
  reservationId: number;
  seatId: number;
  status: ReservationStatus;
  expiresAt: string;
}
```

### Reservation Domain Semantics

```text
Seat AVAILABLE
    ↓ reservation succeeds
Seat HELD

Reservation
PENDING
```

A reservation hold expires five minutes after creation in the current service implementation. `expiresAt` is also a timezone-less Java `LocalDateTime` string.

### Important Error Behavior

Current controller tests establish the intended HTTP behavior:

```text
admission missing or expired
→ 429 ADMISSION_REQUIRED

unauthenticated session
→ 401 without a guaranteed error body

missing or invalid CSRF token
→ 403 without a guaranteed error body

nonexistent seat
→ 404 SEAT_NOT_FOUND

seat does not belong to concert
→ 400 SEAT_CONCERT_MISMATCH

seat not available / reservation conflict
→ 409 SEAT_NOT_AVAILABLE
```

Admission and concert-seat mismatch responses are:

```json
{
  "code": "ADMISSION_REQUIRED",
  "message": "Reservation admission is required"
}
```

```json
{
  "code": "SEAT_CONCERT_MISMATCH",
  "message": "Seat does not belong to the requested concert"
}
```

The frontend must treat a `409` as an expected concurrency outcome.

Recommended UX:

```text
예약에 실패했습니다.
다른 사용자가 해당 좌석을 먼저 예약했습니다.

→ refresh seat list
→ clear stale seat selection
→ allow user to select another seat
```

Do not automatically retry the same seat reservation.

---

## 4.2 Get Reservation Detail

`CONFIRMED`

```http
GET /api/reservations/{reservationId}
```

This endpoint requires an authenticated session. The backend resolves the
reservation using both `reservationId` and the authenticated user ID. A
reservation owned by another user is intentionally indistinguishable from a
missing reservation.

### Response

```json
{
  "reservationId": 1001,
  "concertTitle": "2026 Backend Festival",
  "section": "A",
  "row": 1,
  "seatNumber": 1,
  "price": 150000,
  "status": "PENDING",
  "expiresAt": "2026-10-20T14:30:00"
}
```

### Frontend Type

```ts
export interface ReservationDetail {
  reservationId: number;
  concertTitle: string;
  section: string;
  row: number;
  seatNumber: number;
  price: number;
  status: ReservationStatus;
  expiresAt: string;
}
```

`expiresAt` is a timezone-less Java `LocalDateTime` string. The payment page
uses this endpoint to restore the reservation summary after a browser refresh.

### Errors

| HTTP Status | Code | Meaning |
|---|---|---|
| `401` | not guaranteed | No authenticated session |
| `404` | `RESERVATION_NOT_FOUND` | Reservation does not exist or belongs to another user |

---

# 5. Payment API

## 5.1 Pay for Reservation

`CONFIRMED`

```http
POST /api/reservations/{reservationId}/payments
X-XSRF-TOKEN: <token>
```

Example:

```http
POST /api/reservations/1001/payments
```

### Request Body

No request body is established by the current project contract.

Do not add card / PG fields unless the backend is explicitly changed.

### Response

```json
{
  "paymentId": 5001,
  "reservationId": 1001,
  "status": "SUCCESS",
  "amount": 150000
}
```

### Frontend Type

```ts
export type PaymentStatus =
  | "READY"
  | "SUCCESS"
  | "FAILED"
  | "CANCELLED";

export interface PaymentResponse {
  paymentId: number;
  reservationId: number;
  status: PaymentStatus;
  amount: number;
}
```

### Domain Transition

Successful payment conceptually performs:

```text
Reservation
PENDING → CONFIRMED

Seat
HELD → SOLD

Payment
→ SUCCESS
```

The current project uses mock payment behavior rather than a real external PG integration.

The backend looks up the reservation by both `reservationId` and the authenticated user ID. A reservation owned by another user is intentionally indistinguishable from a missing reservation and returns `RESERVATION_NOT_FOUND`.

### Errors

| HTTP Status | Code | Meaning |
|---|---|---|
| `401` | not guaranteed | No authenticated session |
| `403` | not guaranteed | CSRF credential is missing or invalid |
| `404` | `RESERVATION_NOT_FOUND` | Reservation does not exist or belongs to another user |
| `409` | `RESERVATION_NOT_PENDING` | Reservation is not `PENDING` |
| `409` | `RESERVATION_EXPIRED` | Reservation hold has expired |

---

# 6. User Reservation API

## 6.1 Get User Reservations

`CONFIRMED`

```http
GET /api/users/me/reservations
```

The user ID comes only from the authenticated session principal. The browser does not send a path, query, or body user ID.

### Response

```json
[
  {
    "reservationId": 1001,
    "concertTitle": "2026 Backend Festival",
    "section": "A",
    "row": 1,
    "seatNumber": 1,
    "price": 150000,
    "status": "CONFIRMED"
  }
]
```

### Frontend Type

```ts
export interface UserReservationResponse {
  reservationId: number;
  concertTitle: string;
  section: string;
  row: number;
  seatNumber: number;
  price: number;
  status: ReservationStatus;
}
```

### Errors

An unauthenticated request returns HTTP `401` without a guaranteed JSON error body.

---

# 7. Waiting Queue API

The HTTP mappings and DTOs in this section are `CONFIRMED`.

## 7.1 Join Queue

```http
POST /api/queues/{concertId}/join
X-XSRF-TOKEN: <token>
```

### Request

There is no request body or `userId` parameter. The backend uses the authenticated session principal.

### Response

```json
{
  "concertId": 1,
  "userId": 10,
  "position": 3,
  "waitingCount": 100
}
```

```ts
export interface WaitingQueueResponse {
  concertId: number;
  userId: number;
  position: number;
  waitingCount: number;
}
```

`position` is already converted by the backend to a **one-based, human-facing position**. The frontend must not add `1` again.

### Important join response limitation

The Redis repository internally distinguishes:

```text
JOINED
ALREADY_WAITING
ALREADY_ADMITTED
```

Those internal values are **not included in the HTTP response**. `WaitingQueueResponse` exposes only `concertId`, `userId`, `position`, and `waitingCount`.

The current service converts internal `rank` to `position` by adding `1`. For an already admitted user the internal rank is `-1`, so a repeated join currently returns:

```json
{
  "concertId": 1,
  "userId": 10,
  "position": 0,
  "waitingCount": 50
}
```

This `position: 0` is an implementation limitation, not a valid waiting position. The frontend must not infer queue state from it. After any join response, fetch the status endpoint and use its `status` as authoritative.

No controller test currently covers the `ALREADY_ADMITTED` HTTP join response.

---

## 7.2 Get Queue Position

```http
GET /api/queues/{concertId}/position
```

The success response uses `WaitingQueueResponse`, and `position` is one-based.

This endpoint is valid only while the user is in the waiting queue. If the user is not waiting, the current service throws an unhandled `IllegalStateException`; no stable domain error body is defined. The frontend should use the status endpoint for refresh recovery and polling instead.

---

## 7.3 Get Queue Status

```http
GET /api/queues/{concertId}/status
```

### Response

```json
{
  "concertId": 1,
  "userId": 10,
  "status": "WAITING",
  "position": 5,
  "waitingCount": 100
}
```

```ts
export type QueueStatus =
  | "NOT_JOINED"
  | "WAITING"
  | "ADMITTED";

export interface QueueStatusResponse {
  concertId: number;
  userId: number;
  status: QueueStatus;
  position: number | null;
  waitingCount: number;
}
```

Response rules:

| Status | `position` | Meaning |
|---|---:|---|
| `WAITING` | one-based number | User is waiting |
| `ADMITTED` | `null` | Temporary reservation access is active |
| `NOT_JOINED` | `null` | User is neither waiting nor currently admitted |

Logical queue states are returned as successful HTTP `200` responses. `NOT_JOINED` is not an HTTP error.

---

## 7.4 Admission Semantics

`ADMITTED` is **not** a single-use reservation token. It means that the user has a temporary reservation access window. The current backend TTL is exactly five minutes.

During that valid window the user may perform multiple reservation attempts. Do not implement:

```text
ADMITTED
→ RESERVING
→ CONSUMED
```

A failed or successful reservation does not consume admission. The backend remains authoritative for expiry.

When admission expires, status becomes logically `NOT_JOINED` and the user may join again. Concurrent rejoin attempts create one waiting member; the internal results are one `JOINED` and one `ALREADY_WAITING`.

---

## 7.5 Queue Error Contract

The queue controller defines no queue-specific domain error response.

Unauthenticated requests return HTTP `401`. A join request with missing or invalid CSRF credentials returns HTTP `403`. Neither security response has a guaranteed `{ code, message }` body.

Malformed path values may be rejected by Spring MVC, but their JSON shape is not covered by the project `ErrorResponse` contract. Redis/script failures and the not-waiting case of the position endpoint are currently unhandled server errors.

The frontend should:

```text
use GET /status for recovery and polling
treat temporary 5xx/network failures as recoverable
never infer ADMITTED from POST /join position
stop polling only after GET /status returns ADMITTED
```

---

# 8. Queue Polling Policy

Phase 6 initially uses polling.

Do not add SSE or WebSocket yet.

Initial target:

```text
about 1 request / second while WAITING
```

Frontend behavior:

```text
WAITING
→ poll queue status

ADMITTED
→ stop polling

component unmount
→ stop polling

refresh
→ fetch server state again

temporary request failure
→ show recoverable state and continue according to the implemented retry policy
```

Do not run multiple polling intervals for the same queue page.

---

# 9. Common Error Response

## Status

`CONFIRMED FOR HANDLED DOMAIN EXCEPTIONS`

`GlobalExceptionHandler` returns this exact shape for `BusinessException`, request validation failures, `AdmissionRequiredException`, and `SeatConcertMismatchException`:

```json
{
  "code": "SEAT_NOT_AVAILABLE",
  "message": "이미 선택되었거나 예약된 좌석입니다."
}
```

The frontend should define a tolerant error parser:

```ts
export interface ApiErrorBody {
  code?: string;
  message?: string;
}
```

Not every backend exception uses this shape. There is no generic `Exception` handler. Spring Security `401`/`403` responses, malformed JSON, type conversion failures, and unhandled queue exceptions are not normalized by this contract.

HTTP status must remain the primary fallback signal. Do not expose a backend stack trace or raw framework response to users.

## 9.1 Confirmed Error Codes

| HTTP Status | Code | Message |
|---|---|---|
| `400` | `INVALID_REQUEST` | `잘못된 요청입니다.` |
| `400` | `SEAT_CONCERT_MISMATCH` | `Seat does not belong to the requested concert` |
| `401` | `INVALID_CREDENTIALS` | `이메일 또는 비밀번호가 올바르지 않습니다.` |
| `404` | `USER_NOT_FOUND` | `유저를 찾을 수 없습니다.` |
| `404` | `CONCERT_NOT_FOUND` | `콘서트를 찾을 수 없습니다.` |
| `404` | `SEAT_NOT_FOUND` | `좌석을 찾을 수 없습니다.` |
| `404` | `RESERVATION_NOT_FOUND` | `예약을 찾지 못했습니다.` |
| `409` | `SEAT_NOT_AVAILABLE` | `이미 선택되었거나 예약된 좌석입니다.` |
| `409` | `DUPLICATE_EMAIL` | `이미 사용 중인 이메일입니다.` |
| `409` | `RESERVATION_NOT_PENDING` | `예약 상태가 'PENDING'이 아닙니다.` |
| `409` | `RESERVATION_EXPIRED` | `예약이 만료되었습니다.` |
| `429` | `ADMISSION_REQUIRED` | `Reservation admission is required` |

`INTERNAL_SERVER_ERROR` exists in the backend enum but is not currently emitted by a generic handler. Do not depend on receiving that code for every HTTP `500`.

---

# 10. Confirmed HTTP Status Semantics

The following semantics are established by current controllers and tests:

| HTTP Status | Meaning |
|---|---|
| `200` | Successful application request, including login, queue join, reservation, and payment |
| `201` | Signup succeeded |
| `204` | Logout succeeded; response has no body |
| `400` | Validated request is invalid, seat/concert mismatch, or a framework conversion failure |
| `401` | Login credentials are wrong, or an authenticated endpoint has no valid session |
| `403` | CSRF credential is missing/invalid, or the browser origin is not allowed |
| `404` | Referenced resource such as User / Seat does not exist |
| `409` | Duplicate email, seat unavailable, reservation not pending, or reservation expired |
| `429` | Reservation admission is missing or expired |
| `500` | Unexpected or currently unhandled server error; error body is not guaranteed |

Only `INVALID_CREDENTIALS` is a confirmed structured `401`. Security-filter `401` and `403` responses do not guarantee the common JSON shape.

---

# 11. Browser Cross-Origin Contract

## Status

`CONFIRMED`

Spring Security provides credentialed CORS for a configured frontend origin.

Default allowed origin:

```text
http://localhost:5173
```

Deployment can override it with:

```text
FRONTEND_ORIGIN=<exact frontend origin>
```

Confirmed policy:

```text
credentials:     allowed
methods:         GET, POST, PUT, PATCH, DELETE, OPTIONS
request headers: Content-Type, X-XSRF-TOKEN
```

Allowed-origin responses include `Access-Control-Allow-Origin` for that exact origin and `Access-Control-Allow-Credentials: true`. A preflight from another origin returns HTTP `403`.

The frontend must still use `credentials: "include"`; CORS permission alone does not send the session or CSRF cookies.

The backend does not yet define an explicit deployment contract for session-cookie attributes such as `SameSite` and `Secure`. This must be reviewed if frontend and backend are deployed on different sites rather than the current localhost setup.

---

# 12. Current Frontend Integration Map

```text
CSRF Bootstrap
GET /api/csrf
        ↓
Sign Up or Login
POST /api/auth/signup
POST /api/auth/login
        ↓
Refresh CSRF after login
GET /api/csrf
        ↓
Concert List
GET /api/concerts
        ↓
Concert Detail
GET /api/concerts/{concertId}
        ↓
Queue Join
POST /api/queues/{concertId}/join
        ↓
Queue Polling
GET /api/queues/{concertId}/status
        ↓
ADMITTED
        ↓
Seat List
GET /api/concerts/{concertId}/seats
        ↓
Reservation
POST /api/reservations
        ↓
Payment
POST /api/reservations/{reservationId}/payments
        ↓
My Reservations
GET /api/users/me/reservations
```

---

# 13. Frontend Implementation Rules Derived from This Contract

The frontend may immediately implement against these confirmed API contracts:

```text
GET  /api/csrf
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/logout
GET  /api/users/me
GET  /api/concerts
GET  /api/concerts/{concertId}
GET  /api/concerts/{concertId}/seats
POST /api/queues/{concertId}/join
GET  /api/queues/{concertId}/position
GET  /api/queues/{concertId}/status
POST /api/reservations
POST /api/reservations/{reservationId}/payments
GET  /api/users/me/reservations
```

Session and CSRF rules:

```text
send credentials: include on API requests
fetch CSRF before the first state-changing request
send the XSRF-TOKEN cookie value as X-XSRF-TOKEN
fetch a fresh CSRF token after successful login
restore login state with GET /api/users/me after refresh
never send userId as queue, reservation, payment, or My Reservations identity
```

Queue-specific rules:

```text
position returned by HTTP is already one-based
GET /status is authoritative for WAITING / ADMITTED / NOT_JOINED
POST /join does not expose internal JOINED / ALREADY_WAITING / ALREADY_ADMITTED
POST /join position 0 must not be treated as a valid waiting position
```

---

# 14. Known Backend Work Before Full Phase 6 Completion

The authentication and browser CORS contracts are now implemented. The following narrower integration gaps remain.

## Queue Join Outcome

The current join response does not expose `JOINED`, `ALREADY_WAITING`, or `ALREADY_ADMITTED`. An already admitted repeat join currently produces `position: 0`.

Minimal recommended backend change:

```text
add an explicit join status to WaitingQueueResponse
return position: null for ALREADY_ADMITTED
cover all three join outcomes in controller tests
```

Frontend work can continue without fabricating state by fetching `GET /status` immediately after joining.

## Request Validation / Framework Errors

Signup and login bean-validation failures return `INVALID_REQUEST`. Reservation fields use `jakarta.annotation.Nonnull` rather than Bean Validation constraints, so missing reservation fields are not confirmed to use that error contract. Malformed JSON, invalid path types, and security-filter failures may also return framework-specific bodies rather than `{ code, message }`.

This does not block valid-request flows, but frontend error parsing must be tolerant.

## Date-Time Zone

Concert and reservation timestamps are serialized from `LocalDateTime` without an offset or zone. The backend contract should define the intended zone before deployment across environments or users in different time zones.

These gaps do not block creation of:

```text
frontend skeleton
routing
API client foundation
Concert List
Concert Detail
queue join and status integration
Seat components
reservation client/types
payment client/types
My Reservations client/types
```

These limitations do not prevent implementation against the confirmed contract. Phase 6 completion still requires the full browser E2E journey and conflict/recovery verification.

---

# 15. Update Rule

Whenever the backend API changes, update this file first or in the same change before asking the frontend agent to consume the change.

The frontend agent must treat this document as the cross-repository contract.

Do not silently let frontend assumptions diverge from backend behavior.

When re-verifying, update the backend commit in the verification baseline so the document does not imply that a later backend revision was checked.
