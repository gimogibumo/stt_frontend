interface ErrorBody {
  code?: string
  message?: string
}

interface CsrfResponse {
  headerName: string
  parameterName: string
  token: string
}

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL

export const API_BASE_URL = (
  configuredBaseUrl ?? (import.meta.env.PROD ? '' : 'http://localhost:8080')
).replace(/\/$/, '')

export const AUTH_UNAUTHORIZED_EVENT = 'stt:unauthorized'

export class ApiError extends Error {
  readonly status: number
  readonly code?: string

  constructor(status: number, message: string, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

let csrfToken: string | null = null
let csrfRequest: Promise<string> | null = null

function readCookie(name: string): string | null {
  const prefix = `${encodeURIComponent(name)}=`
  const entry = document.cookie
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(prefix))

  return entry ? decodeURIComponent(entry.slice(prefix.length)) : null
}

async function parseError(response: Response): Promise<ApiError> {
  let body: ErrorBody | null = null

  try {
    body = (await response.json()) as ErrorBody
  } catch {
    body = null
  }

  const fallback =
    response.status >= 500
      ? '서버에 일시적인 문제가 발생했습니다.'
      : '요청을 처리하지 못했습니다.'

  return new ApiError(response.status, body?.message || fallback, body?.code)
}

export async function refreshCsrfToken(): Promise<string> {
  csrfToken = null

  const response = await fetch(`${API_BASE_URL}/api/csrf`, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw await parseError(response)
  }

  const body = (await response.json()) as CsrfResponse
  const cookieToken = readCookie('XSRF-TOKEN')

  if (!cookieToken) {
    throw new Error(
      `CSRF 쿠키를 확인할 수 없습니다. API(${API_BASE_URL})와 프론트엔드의 쿠키 도메인을 확인해 주세요.`,
    )
  }

  if (body.headerName !== 'X-XSRF-TOKEN') {
    throw new Error('지원하지 않는 CSRF 헤더 계약입니다.')
  }

  csrfToken = cookieToken
  return cookieToken
}

async function ensureCsrfToken(): Promise<string> {
  const cookieToken = readCookie('XSRF-TOKEN')

  if (csrfToken && cookieToken === csrfToken) {
    return csrfToken
  }

  if (!csrfRequest) {
    csrfRequest = refreshCsrfToken().finally(() => {
      csrfRequest = null
    })
  }

  return csrfRequest
}

export function clearCsrfToken(): void {
  csrfToken = null
}

interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase()
  const headers = new Headers(options.headers)
  const hasBody = options.body !== undefined
  const requiresCsrf = !['GET', 'HEAD', 'OPTIONS'].includes(method)

  if (hasBody) {
    headers.set('Content-Type', 'application/json')
  }

  if (requiresCsrf) {
    headers.set('X-XSRF-TOKEN', await ensureCsrfToken())
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    method,
    headers,
    credentials: 'include',
    body: hasBody ? JSON.stringify(options.body) : undefined,
  })

  if (!response.ok) {
    const error = await parseError(response)

    if (error.status === 401 && path !== '/api/auth/login') {
      window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT))
    }

    throw error
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message
  }

  return '알 수 없는 오류가 발생했습니다.'
}

