import assert from 'node:assert/strict'

const origin = new URL(process.argv[2])
assert.equal(origin.protocol, 'https:', 'Use the HTTPS deployment origin')
assert.equal(origin.pathname, '/', 'Supply an origin without a path')

async function request(path, headers) {
  const response = await fetch(new URL(path, origin), {
    headers,
    redirect: 'manual',
    signal: AbortSignal.timeout(30000),
  })
  return { response, body: await response.text() }
}

for (const path of [
  '/',
  '/concerts',
  '/login',
  '/my/reservations',
  '/concerts/1/seats',
  '/reservations/1/payment',
]) {
  const { response, body } = await request(path)
  assert.equal(response.status, 200, `${path}: HTTP ${response.status}`)
  assert.match(response.headers.get('content-type') || '', /text\/html/)
  assert.match(body, /<div id="root"><\/div>/)
  const entry = body.match(/src="(\/assets\/[^"?#]+\.js)"/)?.[1]
  assert.ok(entry, 'Missing JavaScript entry')
  const asset = await request(entry)
  assert.equal(asset.response.status, 200)
  assert.doesNotMatch(asset.body, /http:\/\/localhost:8080/)
  console.log(`PASS SPA + entry asset: ${path}`)
}

const tokenResponses = []
for (let index = 0; index < 2; index++) {
  const { response, body } = await request('/api/csrf', {
    Origin: origin.origin,
  })
  assert.equal(
    response.status,
    200,
    'CSRF request with the frontend Origin must succeed',
  )
  assert.match(response.headers.get('content-type') || '', /application\/json/)
  assert.match(response.headers.get('set-cookie') || '', /XSRF-TOKEN=/)
  assert.notEqual(
    response.headers.get('x-cache'),
    'Hit from cloudfront',
    'CSRF must not be cached',
  )
  const data = JSON.parse(body)
  assert.equal(data.headerName, 'X-XSRF-TOKEN')
  assert.ok(data.token)
  tokenResponses.push(data.token)
}
assert.notEqual(
  tokenResponses[0],
  tokenResponses[1],
  'Independent clients must receive independent tokens',
)
console.log(
  'PASS CSRF cookies, Origin allow-list and uncached responses (token values omitted)',
)

const concerts = await request('/api/concerts', { Origin: origin.origin })
assert.equal(concerts.response.status, 200)
assert.ok(Array.isArray(JSON.parse(concerts.body)))
console.log('PASS API concert list')

const unauthorized = await request('/api/users/me', { Origin: origin.origin })
assert.equal(unauthorized.response.status, 401)
assert.doesNotMatch(unauthorized.body, /<html|<div id="root"/i)
console.log('PASS API 401 is preserved, without SPA fallback')
