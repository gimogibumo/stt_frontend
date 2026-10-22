// Requires a dedicated Chrome with --remote-debugging-port=9224.
// Node 20: node --experimental-websocket scripts/browser-e2e.mjs <https-origin>
// Creates one test account and one reservation using the real browser UI.
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const origin = new URL(process.argv[2])
assert.equal(origin.protocol, 'https:')
assert.equal(origin.pathname, '/')
const evidence = await mkdtemp(join(tmpdir(), 'stt-browser-e2e-'))
const target = await (
  await fetch('http://127.0.0.1:9224/json/new?about:blank', { method: 'PUT' })
).json()
const socket = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})
let sequence = 0
const pending = new Map()
const exceptions = []
const requests = []
const responses = new Map()
const queueStates = new Set()

function command(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence
    pending.set(id, { resolve, reject })
    socket.send(JSON.stringify({ id, method, params }))
  })
}
socket.addEventListener('message', async ({ data }) => {
  const message = JSON.parse(data)
  if (message.id) {
    const handler = pending.get(message.id)
    pending.delete(message.id)
    message.error
      ? handler.reject(new Error(JSON.stringify(message.error)))
      : handler.resolve(message.result)
  }
  if (message.method === 'Runtime.exceptionThrown')
    exceptions.push(message.params.exceptionDetails.text)
  if (message.method === 'Network.requestWillBeSent') {
    const request = message.params.request
    if (request.url.startsWith(`${origin.origin}/api/`)) {
      requests.push({
        path: new URL(request.url).pathname,
        method: request.method,
        csrf: Object.keys(request.headers).some(
          (key) => key.toLowerCase() === 'x-xsrf-token',
        ),
      })
    }
  }
  if (message.method === 'Network.responseReceived') {
    const { requestId, response } = message.params
    if (response.url.startsWith(`${origin.origin}/api/`))
      responses.set(requestId, {
        path: new URL(response.url).pathname,
        status: response.status,
      })
  }
  if (message.method === 'Network.loadingFinished') {
    const { requestId } = message.params
    if (responses.get(requestId)?.path.match(/^\/api\/queues\/\d+\/status$/)) {
      try {
        const { body } = await command('Network.getResponseBody', { requestId })
        const status = JSON.parse(body).status
        if (status) queueStates.add(status)
      } catch {
        // Navigation can release an old response body; UI checks remain authoritative.
      }
    }
  }
})
async function evaluate(expression) {
  const result = await command('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  })
  if (result.exceptionDetails)
    throw new Error(JSON.stringify(result.exceptionDetails))
  return result.result.value
}
async function waitFor(expression, seconds = 20) {
  for (let attempt = 0; attempt < seconds * 10; attempt++) {
    if (await evaluate(expression)) return
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(
    `Timeout: ${expression}. Page: ${await evaluate('document.body.innerText')}`,
  )
}
async function screenshot(name) {
  const { data } = await command('Page.captureScreenshot', {
    captureBeyondViewport: true,
  })
  await writeFile(join(evidence, `${name}.png`), Buffer.from(data, 'base64'))
}
async function fill(name, value) {
  await evaluate(
    `(() => { const input = document.querySelector('input[name="${name}"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', { bubbles: true })); })()`,
  )
}
async function run() {
  await command('Page.enable')
  await command('Runtime.enable')
  await command('Network.enable')
  await command('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await command('Page.navigate', { url: `${origin.origin}/signup` })
  await waitFor('Boolean(document.querySelector("#signup-title"))')
  const email = `frontend-e2e-${Date.now()}@example.test`
  const password = randomBytes(9).toString('base64url').slice(0, 12)
  await fill('name', '프론트 배포 검증')
  await fill('email', email)
  await fill('password', password)
  await evaluate('document.querySelector("form button").click()')
  await waitFor(
    'location.pathname === "/login" && Boolean(document.querySelector("#login-title"))',
  )
  console.log('PASS real signup with CSRF')
  await fill('email', email)
  await fill('password', password)
  await evaluate('document.querySelector("form button").click()')
  await waitFor(
    'location.pathname === "/concerts" && document.querySelectorAll(".concert-card").length > 0',
  )
  console.log('PASS real login and authenticated concert list')
  const { cookies } = await command('Network.getCookies', {
    urls: [origin.origin],
  })
  assert.ok(
    cookies.some((cookie) => cookie.name === 'SESSION' && cookie.httpOnly),
  )
  assert.ok(
    cookies.some((cookie) => cookie.name === 'XSRF-TOKEN' && !cookie.httpOnly),
  )
  console.log(
    'Cookie attributes (values omitted):',
    cookies.map(({ name, domain, path, httpOnly, secure, sameSite }) => ({
      name,
      domain,
      path,
      httpOnly,
      secure,
      sameSite,
    })),
  )
  await command('Page.reload')
  await waitFor(
    'location.pathname === "/concerts" && Boolean(document.querySelector(".user-name"))',
  )
  console.log('PASS session restoration after refresh')
  await evaluate('document.querySelector(".artwork-link").click()')
  await waitFor('Boolean(document.querySelector(".booking-button"))')
  const concertId = await evaluate('Number(location.pathname.split("/")[2])')
  await evaluate('document.querySelector(".booking-button").click()')
  await waitFor('Boolean(document.querySelector(".queue-card"))')
  await waitFor('Boolean(document.querySelector(".queue-state button"))')
  await evaluate('document.querySelector(".queue-state button").click()')
  await waitFor(
    'Boolean(document.querySelector(".queue-position, .admitted-state"))',
  )
  if (await evaluate('Boolean(document.querySelector(".queue-position"))')) {
    await screenshot('waiting')
    await command('Page.reload')
    await waitFor(
      'Boolean(document.querySelector(".queue-position, .admitted-state"))',
    )
    console.log('PASS refresh during WAITING')
  }
  await waitFor('Boolean(document.querySelector(".admitted-state"))', 120)
  assert.ok(queueStates.has('WAITING'), 'Must observe a real WAITING response')
  assert.ok(
    queueStates.has('ADMITTED'),
    'Must observe a real ADMITTED response',
  )
  console.log('PASS real queue join, polling and WAITING → ADMITTED')
  await command('Page.reload')
  await waitFor('Boolean(document.querySelector(".admitted-state"))')
  console.log('PASS ADMITTED restoration after refresh')
  await screenshot('admitted')
  await evaluate('document.querySelector(".admitted-state a").click()')
  await waitFor(
    'Boolean(document.querySelector(".seat.available:not(:disabled)"))',
  )
  await evaluate(
    'document.querySelector(".seat.available:not(:disabled)").click()',
  )
  await waitFor('Boolean(document.querySelector(".seat.selected"))')
  await screenshot('seat-selected')
  await evaluate('document.querySelector(".selection-card button").click()')
  // A real conflict is reported; never retry a reservation automatically.
  await waitFor('Boolean(document.querySelector(".payment-card"))')
  const reservationId = await evaluate(
    'Number(location.pathname.split("/")[2])',
  )
  await command('Page.reload')
  await waitFor('Boolean(document.querySelector(".payment-card button"))')
  console.log(`PASS reservation ${reservationId} and payment detail recovery`)
  await screenshot('payment')
  await evaluate('document.querySelector(".payment-card button").click()')
  await waitFor('Boolean(document.querySelector(".success-result"))')
  console.log('PASS real backend payment API')
  await screenshot('payment-complete')
  await evaluate('document.querySelector(".success-result a").click()')
  await waitFor(
    'Boolean(document.querySelector(".reservation-card .confirmed"))',
  )
  await screenshot('my-reservations')
  console.log('PASS My Reservations shows CONFIRMED')
  const admission = await evaluate(
    `fetch('/api/queues/${concertId}/status', { credentials: 'include' }).then(response => response.json()).then(data => data.status)`,
  )
  assert.equal(admission, 'ADMITTED', 'Reservation must not consume admission')
  console.log('PASS admission remains valid after reservation and payment')
  const stateChanges = requests.filter(
    (request) => !['GET', 'HEAD', 'OPTIONS'].includes(request.method),
  )
  assert.ok(stateChanges.length >= 5)
  assert.ok(
    stateChanges.every((request) => request.csrf),
    'Every state-changing request must carry the CSRF header',
  )
  assert.equal(exceptions.length, 0)
  await evaluate('document.querySelector("button.text-button").click()')
  await waitFor(
    'location.pathname === "/login" && Boolean(document.querySelector("#login-title"))',
  )
  console.log('PASS logout')
  console.log(
    JSON.stringify(
      {
        result: 'PASS',
        concertId,
        reservationId,
        queueStates: [...queueStates],
        stateChanges,
        evidence,
      },
      null,
      2,
    ),
  )
}
try {
  await run()
} catch (error) {
  await screenshot('failure').catch(() => {})
  console.error(error.message)
  console.error('HTTP responses:', [...responses.values()])
  console.error(`Evidence: ${evidence}; credentials and token values omitted`)
  process.exitCode = 1
} finally {
  socket.close()
}
