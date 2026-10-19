export function formatLocalDateTime(value: string): string {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?/,
  )

  if (!match) {
    return value
  }

  const [, year, month, day, hour, minute] = match
  return `${year}.${month}.${day} ${hour}:${minute}`
}

export function formatCurrency(value: number): string {
  return `${new Intl.NumberFormat('ko-KR').format(value)}원`
}

