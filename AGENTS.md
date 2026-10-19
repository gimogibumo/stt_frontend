# AGENTS.md

## Project: Ticketing — Survive the Traffic Frontend

This repository contains the **frontend only** for the Survive the Traffic ticket-reservation project.

The backend exists in a **separate repository / working directory**.

You must treat the backend as an external service.

---

# 1. Your Role

You are the implementation agent for **Phase 6 — React + TypeScript Frontend Integration**.

Your responsibility is to build a usable frontend that connects to the existing backend API and completes the end-to-end user journey.

You are responsible for:

```text
React UI
TypeScript types
Routing
API client code
Authentication UI integration
Queue UI
Polling
Refresh recovery
Seat selection
Reservation UX
Payment UX
My Reservations UI
Frontend error handling
Frontend tests/build
```

You are **not** responsible for modifying backend code from this repository.

---

# 2. Repository Boundary

The backend is not part of this repository.

Therefore:

```text
DO NOT modify Spring Boot code.
DO NOT assume access to backend source files.
DO NOT invent backend DTO fields.
DO NOT invent endpoint paths.
DO NOT change backend behavior indirectly.
DO NOT add mock backend behavior as if it were real production behavior.
```

If the frontend needs a backend change, stop and report it clearly.

Use this format:

```text
BACKEND BLOCKER

Frontend feature:
<feature>

Observed API limitation:
<what is missing / inconsistent>

Required backend change:
<minimal requested change>

Why it is required:
<reason>

Frontend work that can continue meanwhile:
<what is still possible>
```

Do not work around a backend contract problem by fabricating client-side data.

---

# 3. Project Development Principle

This project follows:

```text
Observe
  ↓
Reproduce
  ↓
Understand
  ↓
Change
  ↓
Verify
```

Do not add technology because it is fashionable.

Do not add complexity before a concrete problem exists.

For Phase 6 specifically:

```text
build the simplest usable frontend
→ connect actual backend APIs
→ observe real integration problems
→ solve only those problems
```

---

# 4. Phase 6 Goal

Phase 6 is complete when the service can be used from a browser without Postman.

Target user journey:

```text
Login
  ↓
Concert List
  ↓
Concert Detail
  ↓
Join Waiting Queue
  ↓
View Queue Position
  ↓
ADMITTED
  ↓
View Seats
  ↓
Select Seat
  ↓
Create Reservation
  ↓
Payment
  ↓
View My Reservations
```

The frontend does not need production-level visual polish.

Priority order:

```text
correctness
recoverability
API integration
state transitions
clear error handling
basic usability
visual polish
```

---

# 5. Target Frontend Stack

Use:

```text
React
TypeScript
Vite
React Router
```

Do not introduce Next.js unless explicitly requested.

Do not introduce Redux by default.

Do not introduce a large UI framework unless there is a concrete need.

Start simple.

---

# 6. Recommended Project Structure

Use a simple structure such as:

```text
src/
├── api/
├── auth/
├── components/
├── hooks/
├── pages/
├── router/
├── types/
├── App.tsx
└── main.tsx
```

Do not create unnecessary architectural layers.

Avoid enterprise-style abstractions for a small frontend.

---

# 7. API Contract Rule

The backend API contract is authoritative.

The frontend must consume only documented or explicitly provided backend contracts.

Do not guess.

Before implementing a screen, confirm that the required API contract is known.

The API contract should include:

```text
HTTP method
endpoint path
request body
query parameters
response fields
enum values
error status codes
authentication requirements
```

If any required part is unknown, report a `BACKEND BLOCKER` rather than inventing it.

---

# 8. API Client Layer

Do not scatter `fetch()` calls across page components.

Create a small typed API layer.

Recommended shape:

```text
src/api/
├── apiClient.ts
├── authApi.ts
├── concertApi.ts
├── queueApi.ts
├── seatApi.ts
├── reservationApi.ts
├── paymentApi.ts
└── userApi.ts
```

Only create files that are actually needed.

The API layer should centralize:

```text
base URL
headers
authentication token
JSON parsing
HTTP error handling
typed request/response contracts
```

---

# 9. Environment Configuration

Use an environment variable for the backend API URL.

Preferred:

```text
VITE_API_BASE_URL
```

Do not scatter hardcoded localhost or deployment URLs across source files.

A local default is acceptable only when clearly isolated to development configuration.

Never commit real secrets.

---

# 10. TypeScript Policy

Avoid `any`.

Prefer explicit frontend types based on the actual backend response.

For finite backend states, use union types when appropriate.

Example only:

```ts
type QueueStatus =
  | "NOT_JOINED"
  | "WAITING"
  | "ADMITTED";
```

Do not use this example unless those are confirmed backend values.

Never silently rename or normalize backend enum values without an explicit mapping.

---

# 11. Queue Semantics

This section is an established backend invariant and must be respected.

The queue lifecycle is:

```text
NOT_JOINED
    ↓ join
WAITING
    ↓ backend admission worker
ADMITTED
    ↓ expiry
not admitted anymore
```

`ADMITTED` means:

> The user has a temporary access window to reservation functionality.

It does **not** mean one reservation attempt only.

Do not implement:

```text
ADMITTED
→ RESERVING
→ CONSUMED
```

Do not consume admission in frontend state after one reservation attempt.

The backend remains authoritative.

---

# 12. Queue Join Outcomes

The backend conceptually distinguishes:

```text
JOINED
ALREADY_WAITING
ALREADY_ADMITTED
```

Frontend behavior should map naturally:

```text
JOINED
→ show waiting state

ALREADY_WAITING
→ restore waiting state

ALREADY_ADMITTED
→ restore or continue reservation flow
```

Repeated queue join must not reset the user's position.

Do not simulate queue order in the browser.

---

# 13. Queue Polling

Phase 6 uses polling first.

Do not introduce SSE or WebSocket during this phase unless explicitly requested.

Initial polling interval:

```text
approximately 1 second
```

Polling logic must:

```text
start while WAITING
stop after ADMITTED
stop when component unmounts
avoid duplicate intervals
survive rerenders
handle temporary request failures
recover after browser refresh
```

If polling logic becomes nontrivial, extract it into a custom hook.

Example:

```text
useQueueStatus(...)
```

Do not add a large state-management library only for polling.

---

# 14. Refresh / Recovery Is Mandatory

Browser refresh must not destroy logical server state.

React memory is not authoritative.

Examples:

```text
WAITING
→ refresh
→ request backend queue status
→ restore WAITING UI
```

```text
ADMITTED
→ refresh
→ request backend queue status
→ restore reservation access
```

Do not rely only on `useState`.

When the page mounts, server state should be restored using backend APIs.

---

# 15. Authentication

Authentication belongs to the backend contract.

The frontend must not invent an authentication protocol.

If the backend provides:

```text
login endpoint
token
current-user endpoint
authenticated API behavior
```

implement the frontend accordingly.

If authentication is not yet available, report a backend blocker.

Do not fake production authentication by permanently hardcoding `userId`.

Temporary development-only user selection may be used only if explicitly requested and clearly labeled as development behavior.

Never treat client-provided user IDs as secure identity.

---

# 16. Concert List

Create a concert list page using real backend data.

Possible route:

```text
/concerts
```

Display only fields actually provided by the API.

Examples may include:

```text
title
date
venue
booking availability
```

Do not fabricate missing values.

Selecting a concert should navigate to its detail page.

---

# 17. Concert Detail

Possible route:

```text
/concerts/:concertId
```

Minimum goal:

```text
display actual concert data
provide booking action
```

The booking action must enter the waiting-queue flow when queue admission is required.

Do not bypass queue admission from the frontend.

---

# 18. Waiting Queue UI

The queue page should clearly represent:

```text
joining
waiting
admitted
temporary error
expired / no longer admitted
```

While WAITING, show available queue information such as:

```text
current position
waiting count
waiting message
```

Use only actual response fields.

When ADMITTED:

```text
stop polling
allow / redirect to seat selection
```

---

# 19. Queue Recovery Scenarios

Explicitly test:

```text
refresh while WAITING
navigate away and return while WAITING
duplicate join
refresh while ADMITTED
temporary network failure
backend 5xx during polling
multiple browser tabs
admission expiry
```

Do not preemptively build complex distributed-client coordination.

Reproduce first, then implement the smallest reasonable behavior.

---

# 20. Seat Selection

Create a seat-selection page using actual backend seat data.

Possible route:

```text
/concerts/:concertId/seats
```

Known conceptual seat states are:

```text
AVAILABLE
HELD
SOLD
```

Use actual backend enum values if they differ.

The frontend must treat displayed seat state as potentially stale.

Do not assume an AVAILABLE seat is guaranteed to remain available until reservation.

---

# 21. Reservation Conflict UX

Backend concurrency correctness already exists.

Therefore the frontend must expect a race like:

```text
User A sees Seat 101 AVAILABLE
User B sees Seat 101 AVAILABLE

A reserves
B reserves

one succeeds
one receives conflict
```

This is expected behavior.

On conflict, the frontend should:

```text
show a clear message
refresh seat state
allow another selection
```

Do not retry the same reservation automatically without user intent.

Do not hide backend conflict semantics.

---

# 22. Reservation Flow

Use the actual backend reservation API.

Expected frontend responsibilities:

```text
selected seat confirmation
reservation request
loading state
success state
domain conflict state
generic failure state
```

Do not invent reservation lifecycle values.

Use actual backend statuses.

---

# 23. Payment Flow

Connect the real backend payment endpoint if available.

Actual external PG integration is not required for Phase 6 unless explicitly requested.

The goal is to exercise the existing service flow.

Conceptually:

```text
Reservation PENDING
        ↓
Payment SUCCESS
        ↓
Reservation CONFIRMED
        ↓
Seat SOLD
```

Use actual backend fields and status values.

---

# 24. My Reservations

Create a page for the authenticated user's reservations.

Possible route:

```text
/my/reservations
```

Display only backend-provided information.

Examples:

```text
concert
seat
reservation status
payment status
reservation timestamp
```

If an important field is unavailable, report a backend blocker.

Do not fabricate display data.

---

# 25. Error Handling

Error handling is part of the product.

Do not collapse every error into:

```text
Something went wrong
```

Handle meaningful categories separately when the backend exposes them.

Examples:

```text
400 → invalid request / validation
404 → missing resource
409 → reservation conflict
admission required → return to queue flow
admission expired → return to queue flow
500 → recoverable generic server error
```

Do not expose stack traces.

If the backend error format is inconsistent or insufficient for frontend handling, report it as a backend blocker.

---

# 26. State Management Policy

Start with:

```text
React state
custom hooks
small Context only if justified
```

Do not add Redux by default.

If real server-state duplication becomes a problem around:

```text
loading state
error state
request deduplication
cache
refetch
polling
stale data
```

then TanStack Query may be introduced.

If you introduce it, document the concrete problem it solves.

---

# 27. Styling Policy

The target is:

```text
clean
readable
usable
consistent
```

Not:

```text
complex design system
advanced animation
production branding
micro frontend
theme engine
SSR
SEO work
```

Use simple CSS, CSS Modules, or the repository's existing styling approach.

Do not spend disproportionate time on visuals.

---

# 28. Out of Scope for Phase 6

Do not introduce:

```text
Kafka
SSE
WebSocket
Kubernetes
Microservices
GraphQL
Elasticsearch
new backend queue architecture
new distributed lock
new rate limiter
Next.js migration
```

unless explicitly requested.

Phase 7 will deploy and observe the actual system.

Phase 8 will choose architectural improvements based on measured bottlenecks.

---

# 29. Backend Change Handling

Since the backend is in a separate repository, frontend work must never silently depend on an unimplemented backend change.

When a backend dependency appears:

```text
1. report it
2. describe the minimal required contract
3. continue independent frontend work where possible
4. do not fabricate the response
```

Example:

```text
BACKEND BLOCKER

Frontend feature:
Concert Detail

Observed API limitation:
The current contract has no concert date field.

Required backend change:
Expose `concertDate` in the concert-detail response.

Why it is required:
The page must display the event date.

Frontend work that can continue meanwhile:
Layout, loading state, error state, routing.
```

---

# 30. Testing Policy

Prefer behavior-oriented tests.

Do not create large numbers of low-value snapshot tests.

Important frontend scenarios:

```text
login
concert list
concert detail
queue join
WAITING state
polling
ADMITTED transition
refresh recovery
seat selection
reservation success
reservation conflict
payment
my reservations
admission expiry
temporary API failure
```

Where practical, test important hooks and state transitions.

---

# 31. Full Browser Journey

Before Phase 6 is considered complete, verify:

```text
1. Login
2. Concert list
3. Concert detail
4. Join queue
5. WAITING state
6. Poll queue status
7. Become ADMITTED
8. Open seats
9. Select seat
10. Create reservation
11. Complete payment
12. Open My Reservations
13. Confirm final state
```

Also test the same-seat conflict scenario with two users if possible.

---

# 32. Code Quality

Prefer:

```text
small focused components
clear names
typed API boundaries
explicit loading states
explicit error states
predictable effects
minimal hidden side effects
```

Avoid:

```text
very large page components
duplicated API logic
nested effect chains
silent catch blocks
magic strings everywhere
untyped JSON handling
```

---

# 33. Implementation Order

Use this order unless the actual API contract forces a different dependency order.

```text
6-1  Project skeleton
6-2  Router + API client
6-3  Authentication integration
6-4  Concert list
6-5  Concert detail
6-6  Queue join
6-7  Queue polling
6-8  Queue refresh / recovery
6-9  Seat selection
6-10 Reservation
6-11 Payment
6-12 My Reservations
6-13 Error / race UX
6-14 Full browser E2E
```

Do not implement every screen in one speculative pass.

Work incrementally.

---

# 34. Verification

At each meaningful step:

```text
implement
→ run typecheck/build
→ test the actual flow
→ fix errors
→ continue
```

Typical frontend commands:

```bash
npm install
npm run dev
npm run build
```

Use the actual package scripts defined by the repository.

Do not claim completion if the build fails.

---

# 35. Definition of Done

Phase 6 is complete only when:

```text
[ ] React + TypeScript frontend runs
[ ] Frontend can call the real backend
[ ] Authentication integration works
[ ] Concert list works
[ ] Concert detail works
[ ] Queue join works
[ ] WAITING UI works
[ ] Polling works
[ ] Polling stops after ADMITTED
[ ] Queue state recovers after refresh
[ ] Seat list works
[ ] Seat selection works
[ ] Reservation works
[ ] Reservation conflict is handled
[ ] Payment works
[ ] My Reservations works
[ ] Admission expiry is handled
[ ] Basic API errors are handled
[ ] Full browser E2E flow succeeds
[ ] Frontend build succeeds
```

Backend-dependent items may remain blocked only when explicitly reported as `BACKEND BLOCKER`.

---

# 36. Completion Report Format

After each meaningful task, report:

```text
1. What changed
2. Files changed
3. API contract used
4. Build/test commands run
5. Result
6. Remaining frontend work
7. Backend blockers, if any
```

Do not say "done" without verification.

---

# 37. Final Rule

This frontend is not an isolated demo.

It exists to expose the real behavior of the current backend service.

Therefore:

```text
Do not hide backend problems.
Do not invent missing backend behavior.
Do not over-engineer the client.
Do not bypass queue semantics.
Do not weaken conflict handling.
```

Build the smallest correct frontend that lets real users exercise the complete ticketing flow.
