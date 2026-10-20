import { describe, expect, it } from 'vitest'
import { formatLocalDateTime } from './format'

describe('formatLocalDateTime', () => {
  it('Asia/Seoul LocalDateTime 문자열을 브라우저 시간대로 변환하지 않는다', () => {
    expect(formatLocalDateTime('2026-10-20T22:30:00')).toBe(
      '2026.10.20 22:30',
    )
  })
})
