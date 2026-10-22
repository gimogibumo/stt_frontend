import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const template = JSON.parse(
  await readFile(new URL('./github-deploy-role.json', import.meta.url), 'utf8'),
)
const role = template.Resources.DeployRole.Properties

test('OIDC trusts only the immutable frontend repository subject on main', () => {
  const trust = role.AssumeRolePolicyDocument.Statement[0]
  assert.equal(trust.Action, 'sts:AssumeRoleWithWebIdentity')
  assert.equal(
    trust.Condition.StringEquals['token.actions.githubusercontent.com:aud'],
    'sts.amazonaws.com',
  )
  assert.deepEqual(template.Parameters.GitHubSubject.AllowedValues, [
    'repo:gimogibumo@149920842/stt_frontend@1425037988:ref:refs/heads/main',
  ])
  assert.equal(trust.Condition.StringLike, undefined)
  assert.equal(
    Object.values(template.Resources).some(
      (resource) => resource.Type === 'AWS::IAM::OIDCProvider',
    ),
    false,
  )
})

test('deploy permissions cannot delete objects, change infrastructure or administer IAM', () => {
  const statements = role.Policies[0].PolicyDocument.Statement
  assert.deepEqual(
    statements.flatMap((statement) => statement.Action).sort(),
    [
      'cloudfront:CreateInvalidation',
      'cloudfront:GetDistribution',
      'cloudfront:GetInvalidation',
      's3:GetBucketLocation',
      's3:GetObject',
      's3:ListBucket',
      's3:PutObject',
    ].sort(),
  )
  assert.ok(statements.every((statement) => statement.Resource !== '*'))
  assert.equal(role.ManagedPolicyArns, undefined)
})
