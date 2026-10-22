import assert from 'node:assert/strict'
import test from 'node:test'
import {
  validateDeploymentConfig,
  validateReleaseId,
  verifyArtifact,
} from '../scripts/deploy-frontend.mjs'

test('deployment rejects unresolved or broad targets before running AWS writes', () => {
  for (const env of [{}, { S3_BUCKET: '/' }, { S3_BUCKET: '*' }])
    assert.throws(() => validateDeploymentConfig(env))
  assert.deepEqual(
    validateDeploymentConfig({
      AWS_ACCOUNT_ID: '123456789012',
      AWS_REGION: 'ap-northeast-2',
      S3_BUCKET: 'stt-frontend-example',
      CLOUDFRONT_DISTRIBUTION_ID: 'E123456789ABCD',
    }),
    {
      account: '123456789012',
      region: 'ap-northeast-2',
      bucket: 'stt-frontend-example',
      distribution: 'E123456789ABCD',
    },
  )
  for (const release of ['', '../other-release', 'a/b', '*'])
    assert.throws(() => validateReleaseId(release))
  assert.equal(
    validateReleaseId('manual-20261022T070000Z'),
    'manual-20261022T070000Z',
  )
})

test('missing build fails before publication', async () => {
  await assert.rejects(
    verifyArtifact(new URL('./nonexistent-build', import.meta.url).pathname),
  )
})
