import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

const template = JSON.parse(
  await readFile(new URL('./frontend-stack.json', import.meta.url), 'utf8'),
)
const distribution =
  template.Resources.Distribution.Properties.DistributionConfig
const context = vm.createContext({})
vm.runInContext(template.Resources.SpaRouter.Properties.FunctionCode, context)

test('SPA refresh routes rewrite without changing query strings or API/static paths', () => {
  for (const uri of [
    '/',
    '/concerts',
    '/concerts/1/seats',
    '/login',
    '/my/reservations',
    '/reservations/1/payment',
    '/missing-route',
  ]) {
    const request = {
      uri,
      method: 'GET',
      querystring: { page: { value: '2' } },
    }
    const result = context.handler({ request })
    assert.equal(result.uri, '/index.html')
    assert.equal(result.querystring.page.value, '2')
  }
  for (const uri of [
    '/api',
    '/api/concerts',
    '/assets/missing.js',
    '/images/missing',
    '/favicon.ico',
  ]) {
    assert.equal(context.handler({ request: { uri, method: 'GET' } }).uri, uri)
  }
  assert.equal(
    context.handler({ request: { uri: '/concerts', method: 'POST' } }).uri,
    '/concerts',
  )
})

test('API keeps HTTP errors, forwards credentials and never uses static cache or SPA fallback', () => {
  assert.equal(distribution.CustomErrorResponses, undefined)
  assert.deepEqual(
    distribution.CacheBehaviors.map((behavior) => behavior.PathPattern),
    ['/api/*', '/api'],
  )
  for (const behavior of distribution.CacheBehaviors) {
    assert.equal(behavior.TargetOriginId, 'backend-alb')
    assert.equal(behavior.CachePolicyId, '4135ea2d-6df8-44a3-9df3-4b5a84be39ad')
    assert.equal(
      behavior.OriginRequestPolicyId,
      '216adef6-5c7f-47e4-b989-5492eafa07d3',
    )
    assert.equal(behavior.FunctionAssociations, undefined)
    for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])
      assert.ok(behavior.AllowedMethods.includes(method))
  }
})

test('S3 is private, OAC is scoped to one distribution and static HTML can revalidate', () => {
  assert.ok(
    Object.values(
      template.Resources.FrontendBucket.Properties
        .PublicAccessBlockConfiguration,
    ).every((value) => value === true),
  )
  const statement =
    template.Resources.BucketPolicy.Properties.PolicyDocument.Statement[0]
  assert.equal(statement.Principal.Service, 'cloudfront.amazonaws.com')
  assert.ok(statement.Condition.StringEquals['AWS:SourceArn'])
  assert.equal(
    template.Resources.StaticCachePolicy.Properties.CachePolicyConfig.MinTTL,
    0,
  )
})
