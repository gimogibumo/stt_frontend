import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('apiRequest', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('PROD', false)
    vi.stubEnv('VITE_API_BASE_URL', undefined)
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('프로덕션에서는 같은 출처의 API를 호출한다', async () => {
    vi.stubEnv('PROD', true)
    vi.stubEnv('VITE_API_BASE_URL', undefined)
    vi.mocked(fetch).mockResolvedValue(new Response('[]'))

    const { apiRequest } = await import('./apiClient')
    await apiRequest('/api/concerts')

    expect(fetch).toHaveBeenCalledWith(
      '/api/concerts',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('빈 API 주소 설정도 같은 출처로 유지한다', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    const { API_BASE_URL } = await import('./apiClient')
    expect(API_BASE_URL).toBe('')
  })

  it('명시한 API 주소의 마지막 슬래시를 제거한다', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test/')
    const { API_BASE_URL } = await import('./apiClient')
    expect(API_BASE_URL).toBe('https://api.example.test')
  })

  it('변경 요청 전에 CSRF 쿠키를 발급받고 같은 값을 헤더에 보낸다', async () => {
    const fetchMock = vi.mocked(fetch)

    fetchMock.mockImplementation(async (input) => {
      const url = String(input)

      if (url.endsWith('/api/csrf')) {
        document.cookie = 'XSRF-TOKEN=csrf-token; Path=/'
        return new Response(
          JSON.stringify({
            headerName: 'X-XSRF-TOKEN',
            parameterName: '_csrf',
            token: 'csrf-token',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }

      return new Response(JSON.stringify({ id: 1 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })

    const { apiRequest } = await import('./apiClient')
    await apiRequest('/api/example', {
      method: 'POST',
      body: { value: 'ticket' },
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:8080/api/csrf',
      { credentials: 'include' },
    )

    const [, request] = fetchMock.mock.calls[1]
    const headers = new Headers(request?.headers)

    expect(headers.get('X-XSRF-TOKEN')).toBe('csrf-token')
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(request).toMatchObject({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ value: 'ticket' }),
    })
  })

  it('구조화된 백엔드 오류를 ApiError로 보존한다', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ code: 'SEAT_ALREADY_RESERVED', message: '이미 예약된 좌석입니다.' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const { ApiError, apiRequest } = await import('./apiClient')

    await expect(apiRequest('/api/example')).rejects.toEqual(
      new ApiError(409, '이미 예약된 좌석입니다.', 'SEAT_ALREADY_RESERVED'),
    )
  })
})
