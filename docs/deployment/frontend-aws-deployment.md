# 프론트엔드 AWS 배포 진행 기록

확인일: 2026-10-22 (KST)

## 현재 상태

`CODEX_FRONTEND_AWS_DEPLOY.md`의 프론트 분석, 인프라 생성, 수동 배포 및 실제
브라우저 인증·예매 E2E를 완료했다. 백엔드 담당자가 `FRONTEND_ORIGIN`을 적용한
후 CORS 차단이 해소됐다. CI/CD workflow, 최소 권한 IAM 역할 및 GitHub 변수
6개를 구성했으며 실제 GitHub Actions 실행 검증을 이어서 진행한다.

서비스 주소: **https://d2eomise0zoyt8.cloudfront.net**

초기 릴리스: `manual-20261022-initial`

기존 디자인 변경을 보존했다. 백엔드 소스, Kubernetes 설정 및 Secret은 수정하지
않았고 Secret 값도 조회하지 않았다.

## 프로젝트 분석

| 항목 | 확인 결과 |
| --- | --- |
| 저장소 | `gimogibumo/stt_frontend` |
| 브랜치 | `main` |
| 프레임워크 | React 19 + TypeScript + React Router |
| 빌드 도구 | Vite 7 |
| 패키지 매니저 | npm (`package-lock.json`) |
| 개발 서버 | `npm run dev` |
| 테스트 | `npm test` (Vitest) |
| 빌드 | `npm run build` (`tsc -b && vite build`) |
| 빌드 출력 | `dist/` |
| lint | 현재 별도 스크립트 없음 |
| API 계층 | `src/api/apiClient.ts`의 `fetch` 래퍼 |
| 인증 | Session Cookie + CSRF, `credentials: 'include'` |
| CSRF | `/api/csrf` → `XSRF-TOKEN` 쿠키 → `X-XSRF-TOKEN` 헤더 |

로그인 요청에도 CSRF를 적용하며, 로그인 성공 후 `refreshCsrfToken()`을 호출한다.
세션·CSRF 계약을 중복 구현하지 않았다.

## 환경 변수 변경

`VITE_API_BASE_URL`을 유지하면서 다음과 같이 구분한다.

| 실행 환경 | 기본 API 기준 주소 | 공연 조회 예시 |
| --- | --- | --- |
| 개발 | `http://localhost:8080` | `http://localhost:8080/api/concerts` |
| 프로덕션 | 빈 문자열 (같은 출처) | `/api/concerts` |
| 명시적 설정 | 설정한 기준 주소 | `<기준 주소>/api/concerts` |

`.env.production`에 `VITE_API_BASE_URL=`을 추가했다. 클라이언트는 `||` 대신
`??`로 기본값을 선택하므로 명시적인 빈 문자열도 유지한다. API 함수의 경로에는
이미 `/api`가 들어 있으므로 환경 변수에 `/api`를 다시 넣지 않는다.

Vite 환경 변수는 빌드 시 번들에 포함된다. 토큰이나 비밀번호를 넣지 않는다.
기존 `.env.local` 또는 실행 환경의 같은 변수가 배포 설정을 덮어쓰지 않도록
향후 배포 명령에서도 `VITE_API_BASE_URL=''`을 명시해야 한다.

## 조회한 기존 AWS 리소스

| 항목 | 확인 결과 |
| --- | --- |
| 리전 | `ap-northeast-2` |
| EKS | `survive-traffic` |
| namespace | `ticketing` |
| Ingress / 서비스 | `ticketing-api` |
| 서비스 포트 | `8080` |
| Ingress ALB | `k8s-ticketin-ticketin-69b717c52b-310633674.ap-northeast-2.elb.amazonaws.com` |
| 현재 ALB 프런트 포트 | HTTP `80` |
| 프론트 CloudFormation 스택 | `stt-frontend` / `CREATE_COMPLETE` |
| 새 private S3 버킷 | `stt-frontend-248189924429-ap-northeast-2` |
| 새 CloudFront 배포 | `E2GS2C5V8X1VFN` |
| 새 CloudFront 주소 | `d2eomise0zoyt8.cloudfront.net` |
| OIDC | 기존 GitHub 공급자 확인: `token.actions.githubusercontent.com` |
| GitHub OIDC audience | `sts.amazonaws.com` |
| 프론트 배포 IAM 역할 | `arn:aws:iam::248189924429:role/stt-frontend-github-deploy` |
| IAM CloudFormation 스택 | `stt-frontend-github-deploy` / `CREATE_COMPLETE` |
| GitHub CLI | 로컬에 설치되어 있지 않음 |

초기 조회 때 S3·CloudFront는 없었고, 재개 시에도 없는 것을 확인한 뒤 생성했다.
GitHub OIDC 공급자는 재개 시 새로 존재했으므로 중복 생성하지 않는다.
기존 ALB·EKS·RDS·Valkey는 재사용하며 수정하지 않았다.

새로 생성한 리소스는 S3 버킷, 버킷 정책, CloudFront 배포, OAC, 정적 캐시 정책,
SPA 라우팅 함수의 6개다. `infra/frontend-stack.json`을 검증하고 변경안이 이
리소스들의 `Add`만 포함하는지 확인한 후 실행했다. 버킷 삭제 정책은 `Retain`이며
버전 관리와 AES256 암호화를 켰다.

## 확정된 백엔드 Origin 설정

사용자가 2026-10-22에 다음 계약을 제공했다.

```text
환경변수: FRONTEND_ORIGIN
Spring 속성: app.cors.allowed-origins
기본값: http://localhost:5173
형식: scheme + hostname, 경로 및 마지막 / 제외
```

백엔드 담당자가 기존 배포 방식으로 아래 값을 적용했고 실제 요청으로 확인했다.
이 프론트 작업에서 백엔드 ConfigMap이나 Deployment를 수정하지 않았다.

```dotenv
FRONTEND_ORIGIN=https://d2eomise0zoyt8.cloudfront.net
```

## 배포 구조

```text
Browser (HTTPS)
  → CloudFront
      ├─ 기본 경로 → private S3 + OAC
      └─ /api/*   → 기존 ALB → 기존 ticketing-api
```

브라우저에서 프론트와 API는 같은 HTTPS 출처를 사용한다. CloudFront의 API
behavior는 `Origin`을 포함한 요청 정보를 그대로 전달하므로 백엔드의 명시적
허용 Origin에도 이 주소를 반영해야 한다.

현재 기존 ALB는 HTTP 80만 제공하므로 CloudFront → ALB는 `http-only`다.
브라우저 → CloudFront는 HTTPS다. 원본 구간 TLS까지 적용한 상태로 설명해서는
안 되며, 원본 TLS는 백엔드 인프라의 별도 변경 사항이다.

기존 ALB에 다음 읽기 전용 요청을 보내 재현했다. `frontend-probe.invalid`는
실제 호스팅 주소가 아니라 HTTPS 프록시 조건을 확인하기 위한 헤더 값이다.

| 요청 조건 | 결과 |
| --- | --- |
| Origin 없는 `/api/csrf` | `200`, CSRF 쿠키 발급 |
| `Origin: https://frontend-probe.invalid` | `403` |
| HTTPS Origin + 같은 Host + `X-Forwarded-Proto: https` | `403` |
| HTTPS Origin + 같은 Host + `Forwarded: proto=https;host=frontend-probe.invalid` | `403 Invalid CORS request` |
| HTTPS Origin + 같은 Host + `X-Forwarded-Host` + `CloudFront-Forwarded-Proto: https` | `403 Invalid CORS request` |
| HTTP Origin + 같은 Host의 `/api/concerts` | `200` |

위 테스트 Origin은 허용 목록에 없는 값이다. 따라서 이 결과는 HTTPS 자체의
지원 불가를 의미하지 않는다. 실제 CloudFront 주소도 최초에는 거절됐으나,
백엔드의 `FRONTEND_ORIGIN` 적용 후 같은 Origin의 `/api/csrf`가 `200`을 반환했다.
쿠키·CSRF·로그인·대기열·예약·결제까지 정상 검증했으며 현재 이 차단은 해소됐다.

### 관찰한 쿠키 속성과 운영 한계

실제 Chrome에서 쿠키 값을 제외하고 속성만 확인했다.

| 쿠키 | Domain | Path | HttpOnly | Secure | SameSite |
| --- | --- | --- | --- | --- | --- |
| `SESSION` | `d2eomise0zoyt8.cloudfront.net` | `/` | true | false | Lax |
| `XSRF-TOKEN` | `d2eomise0zoyt8.cloudfront.net` | `/` | false | false | 명시 없음 |

인증 및 CSRF는 동작하지만 `Secure=false`와 CloudFront → ALB HTTP 구간이
남아 있으므로 이를 전체 구간 TLS 및 운영 쿠키 보안까지 완료한 배포로 설명하지
않는다. 쿠키 속성과 원본 TLS는 백엔드 담당자의 후속 보안 점검 항목이며 이
프론트 작업에서 임의로 변경하지 않았다.

## S3·CloudFront 동작

- S3 Public Access Block 4개 항목 모두 `true`, 버킷 정책 `IsPublic: false`.
- S3 `index.html` 직접 접근은 `403`, CloudFront 접근은 `200`.
- OAC 서명과 해당 Distribution ARN 조건으로만 S3 읽기를 허용한다.
- 기본 behavior는 S3이며 CloudFront Function으로 확장자 없는 SPA 경로를
  `/index.html`로 바꾼다. 쿼리스트링은 유지한다.
- `/api/*` 및 `/api`는 기존 ALB, HTTP 메서드 7종, `CachingDisabled` 관리형 정책을
  사용한다. min/default/max TTL 모두 `0`이다.
- `AllViewer` 원본 요청 정책으로 쿠키·쿼리·Origin·CSRF 헤더를 전달한다.
- 배포 전체 `CustomErrorResponses`를 사용하지 않으므로 API 오류를 HTML로
  치환하지 않는다. API behavior에는 SPA 함수를 연결하지 않는다.

## 수동 재배포

다음 값은 비밀값이 아니다. AWS 인증 정보는 기존 로컬 AWS 로그인 또는 OIDC로
공급하며 파일이나 저장소에 기록하지 않는다.

```bash
export AWS_ACCOUNT_ID=248189924429
export AWS_REGION=ap-northeast-2
export S3_BUCKET=stt-frontend-248189924429-ap-northeast-2
export CLOUDFRONT_DISTRIBUTION_ID=E2GS2C5V8X1VFN

npm ci --no-audit --no-fund
npm test
npm run test:infra
VITE_API_BASE_URL='' npm run build
node scripts/deploy-frontend.mjs
node scripts/smoke-frontend.mjs https://d2eomise0zoyt8.cloudfront.net
```

배포 스크립트는 계정 ID·버킷 소유자·CloudFront의 연결 버킷을 먼저 검증한다.
빌드 파일과 로컬 API 주소 유무를 검사하고, 신규 릴리스를 `releases/<id>/`에
보존한 뒤 해시 자산 → 비해시 파일 → `index.html` 순서로 배포한다. 기존 파일을
삭제하는 `--delete`는 사용하지 않는다. 사용 중인 릴리스 ID의 덮어쓰기도 거절한다.
기본 릴리스 ID는 실행 시각으로 생성하며 CI에서는 고유한 `RELEASE_ID`를 전달한다.

HTML과 비해시 파일은 `no-cache,max-age=0,must-revalidate`, 해시 자산은
`public,max-age=31536000,immutable`이다. 정적 캐시 정책의 최소 TTL은 0이므로
HTML 재검증 지시를 존중한다. invalidation은 `/`, `/index.html`, `/images/*`로
한정하고 완료될 때까지 확인한다.

## 롤백

동일한 AWS 환경 변수와 권한으로 보존된 릴리스를 다시 배포한다.

```bash
node scripts/deploy-frontend.mjs --rollback manual-20261022-initial
node scripts/smoke-frontend.mjs https://d2eomise0zoyt8.cloudfront.net
```

스크립트는 해당 릴리스를 임시 디렉토리에 내려받고 빌드 구조를 검증한 뒤,
자산을 먼저 배포하고 HTML을 마지막에 교체한다. CloudFront 캐시도 갱신한다.
현재 보존된 초기 릴리스는 존재하지만, 실제 롤백 실행 자체는 아직 검증하지 않았다.
버킷 버전 관리도 켜져 있다. 오래된 릴리스/버전 정리 정책은 아직 추가하지 않았다.

## GitHub Actions와 OIDC

- `.github/workflows/frontend-ci.yml`: PR 및 `main`에서 `npm ci` → 프론트 테스트 →
  인프라 테스트 → 프로덕션 빌드 → 빌드 아티팩트 보존.
- `.github/workflows/frontend-deploy.yml`: `main` push 또는 수동 실행에서 검증·빌드
  → OIDC → 배포 스크립트 → 제한된 invalidation → HTTPS/API smoke test.
- 문서만 바뀐 push는 배포를 생략한다. 배포 동시 실행은 직렬화하며 진행 중인
  배포를 새 push가 중간 취소하지 않는다.
- 수동 실행의 `rollback_release_id`에 기존 릴리스 ID를 넣으면 같은 workflow로
  롤백한다. 입력은 환경 변수로 전달하고 배포 스크립트가 경로·와일드카드를 거절한다.
- 공식 Actions는 조회한 릴리스의 전체 commit SHA로 고정했다. actionlint도 통과했다.

`infra/github-deploy-role.json`은 기존 OIDC 공급자를 참조하는 IAM 역할 하나만
생성한다. 신뢰 조건은 audience `sts.amazonaws.com` 및 다음 subject의 정확한
일치다.

```text
repo:gimogibumo@149920842/stt_frontend@1425037988:ref:refs/heads/main
```

이 저장소는 2026-10-19에 생성됐으며 기본 OIDC subject를 사용한다. GitHub의
2026-07-15 이후 생성 저장소 계약에 맞춰 변경 불가능한 소유자·저장소 ID를
포함했다. 브랜치/저장소 와일드카드나 PR subject는 허용하지 않는다.

역할 권한은 해당 버킷의 list/get/put과 해당 CloudFront 배포의 조회·invalidation
생성/조회만 포함한다. 객체 삭제·IAM 관리·인프라 변경 권한은 없다. 실제 IAM
시뮬레이션에서도 S3 업로드는 허용, 객체 삭제와 IAM 역할 생성은 거절됐다.

다음 **Repository variables**를 GitHub API로 등록하고 값을 다시 읽어 검증했다.
Secret으로 AWS Access Key를 저장하지 않았다. GitHub에서 추가로 입력할 변수는 없다.

| 변수 | 값 |
| --- | --- |
| `AWS_ACCOUNT_ID` | `248189924429` |
| `AWS_REGION` | `ap-northeast-2` |
| `AWS_DEPLOY_ROLE_ARN` | `arn:aws:iam::248189924429:role/stt-frontend-github-deploy` |
| `S3_BUCKET` | `stt-frontend-248189924429-ap-northeast-2` |
| `CLOUDFRONT_DISTRIBUTION_ID` | `E2GS2C5V8X1VFN` |
| `FRONTEND_ORIGIN` | `https://d2eomise0zoyt8.cloudfront.net` |

## 실제 브라우저 E2E

`scripts/browser-e2e.mjs`는 격리된 Chrome의 debugging port 9224에 접속하며,
실제 UI로 테스트 계정과 예약을 각각 1개 생성한다. 토큰·비밀번호·쿠키 값을
출력하거나 저장하지 않는다. 스크린샷은 OS 임시 디렉토리에만 저장한다.
Node 20에서는 `--experimental-websocket` 옵션이 필요하다.

```bash
node --experimental-websocket scripts/browser-e2e.mjs https://d2eomise0zoyt8.cloudfront.net
```

검증 결과: 회원가입 → 로그인 → 세션 복원 → 실제 대기열 참여 → WAITING 상태의
새로고침 → ADMITTED 전환·새로고침 → 좌석 선택 → 예약 → 결제 화면 새로고침 →
결제 → 마이티켓 CONFIRMED → 로그아웃까지 확인했다. 결제 뒤에도 입장 권한이
ADMITTED로 유지됨을 확인했다. 테스트 데이터는 공연 2의 예약 `6088` 한 건이며
계정 비밀번호는 보존하지 않았다. 검증 도구의 마지막 링크 선택 구문 오류를 수정한
뒤 같은 세션에서 최종 예약 확인과 로그아웃을 마쳐 추가 예약은 생성하지 않았다.

## 검증 결과

- `npm test`: 5개 파일, 13개 테스트 통과.
- `npm ci --no-audit --no-fund`: lockfile 기준 설치 통과.
- `npm run test:infra`: 7개 테스트 통과. SPA/API 경로 분리, 캐시·권한 조건,
  배포 대상 검증, 잘못된 릴리스 경로, 빌드 누락 및 IAM/OIDC 범위를 검사한다.
- `npm run build`: TypeScript 및 Vite 프로덕션 빌드 통과.
- `git diff --check`: 통과.
- 새 회귀 테스트: 프로덕션 상대 API 요청, 빈 기준 주소 보존, 명시적 URL 처리.
- ALB 읽기 전용 HTTP 요청: 위 재현표 참고.
- CloudFormation 템플릿 검증 및 변경안 검토 후 새 프론트 리소스 6개 생성 완료.
- 최초 S3 업로드 및 제한된 CloudFront invalidation 완료.
- 공개 HTTP 검증: `/`, `/concerts`, `/login`, `/my/reservations`,
  `/concerts/1/seats`, `/reservations/1/payment`의 HTML 및 실제 엔트리 자산 `200`.
- 실제 AWS 공연 데이터로 1440px·390px 목록, 상세 새로고침, 로그인 이동 검증.
  가로 넘침 및 처리되지 않은 브라우저 예외 없음.
- S3 직접 접근 `403`, 버킷 공개 상태 `false`, HTML·해시 자산 캐시 헤더 확인.
- 전체 smoke test: SPA 6개 경로, CSRF 쿠키, 실제 Origin 허용, 독립 토큰 발급,
  API 비캐시, 공연 조회, 미인증 `401` 보존까지 통과.
- 로그인·대기열·예약·결제 브라우저 E2E: 위 실제 브라우저 기록 참고.
- IAM 역할 및 GitHub 비밀이 아닌 변수 6개 등록·검증 완료.
- workflow YAML 파싱 및 actionlint 검증 통과. 실제 GitHub Actions 실행 결과는
  첫 배포 후 기록한다.

## Troubleshooting

- `403 Invalid CORS request`: 먼저 Origin/Host/프로토콜과 백엔드 허용 Origin을
  확인한다. 이 응답을 예약 입장 오류 `ADMISSION_REQUIRED`와 혼동하지 않는다.
- 배포 번들에 `localhost:8080` 포함: `.env.local` 및 빌드 환경의
  `VITE_API_BASE_URL` 재정의 여부를 확인한다.
- 로그인 후 `401`: API 캐시, 세션 쿠키 전달, 쿠키의 Domain/Path/Secure/SameSite
  속성과 로그인 후 CSRF 재발급을 확인한다.
- API `404`가 HTML로 바뀜: SPA fallback을 정적 behavior에만 적용했는지 확인한다.

## 참고

- [CloudFront 관리형 원본 요청 정책](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-origin-request-policies.html)
- [CloudFront의 사용자 지정 원본 요청·응답 처리](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/RequestAndResponseBehaviorCustomOrigin.html)
- [CloudFront Functions의 URI 변경과 behavior 선택](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-event-structure.html)
- [GitHub OIDC와 AWS 신뢰 조건](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws)
