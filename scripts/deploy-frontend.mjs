import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'

function aws(args, json = false) {
  const output = execFileSync(
    'aws',
    [...args, '--no-cli-pager', ...(json ? ['--output', 'json'] : [])],
    {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
    },
  )
  return json ? JSON.parse(output) : output.trim()
}

export function validateDeploymentConfig(env) {
  const {
    AWS_ACCOUNT_ID: account,
    AWS_REGION: region,
    S3_BUCKET: bucket,
    CLOUDFRONT_DISTRIBUTION_ID: distribution,
  } = env
  if (!/^\d{12}$/.test(account || ''))
    throw new Error('AWS_ACCOUNT_ID must be a 12-digit account ID')
  if (!/^[a-z]{2}-[a-z]+-\d$/.test(region || ''))
    throw new Error('AWS_REGION is required')
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket || ''))
    throw new Error('S3_BUCKET must be an explicit bucket name')
  if (!/^[A-Z0-9]{10,20}$/.test(distribution || ''))
    throw new Error('CLOUDFRONT_DISTRIBUTION_ID is required')
  return { account, region, bucket, distribution }
}

export function validateReleaseId(release) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/.test(release || ''))
    throw new Error('Release ID must not contain paths or wildcards')
  return release
}

export async function verifyArtifact(directory) {
  const html = await readFile(join(directory, 'index.html'), 'utf8')
  const references = [
    ...html.matchAll(/(?:src|href)="\/?(assets\/[^"?#]+\.(?:js|css))"/g),
  ].map((match) => match[1])
  if (!references.some((file) => file.endsWith('.js')))
    throw new Error('Not a Vite build: missing entry asset')
  for (const file of references) {
    if (!/^assets\/[a-zA-Z0-9_-]+\.(js|css)$/.test(file))
      throw new Error('Unexpected asset path')
    await readFile(join(directory, file))
  }
  for (const file of await readdir(join(directory, 'assets'))) {
    if (
      file.endsWith('.js') &&
      (await readFile(join(directory, 'assets', file), 'utf8')).includes(
        'http://localhost:8080',
      )
    ) {
      throw new Error('Production bundle still points to localhost:8080')
    }
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      'build-dir': { type: 'string', default: 'dist' },
      rollback: { type: 'string' },
    },
  })
  const { account, region, bucket, distribution } = validateDeploymentConfig(
    process.env,
  )
  const identity = aws(['sts', 'get-caller-identity'], true)
  if (identity.Account !== account)
    throw new Error('AWS account does not match AWS_ACCOUNT_ID')
  aws([
    's3api',
    'head-bucket',
    '--bucket',
    bucket,
    '--expected-bucket-owner',
    account,
  ])
  const current = aws(
    ['cloudfront', 'get-distribution', '--id', distribution],
    true,
  ).Distribution
  const origin = current.DistributionConfig.Origins.Items.find(
    (item) => item.Id === 'frontend-s3',
  )
  if (origin?.DomainName !== `${bucket}.s3.${region}.amazonaws.com`)
    throw new Error('Distribution is not connected to the specified bucket')
  if (!current.DistributionConfig.Enabled || current.Status !== 'Deployed')
    throw new Error('Wait until CloudFront is enabled and deployed')

  const release = validateReleaseId(
    values.rollback ||
      process.env.RELEASE_ID ||
      `manual-${new Date().toISOString().replace(/[^0-9TZ]/g, '')}`,
  )
  let directory = resolve(values['build-dir'])
  if (values.rollback) {
    directory = await mkdtemp(join(tmpdir(), 'stt-frontend-rollback-'))
    aws([
      's3',
      'sync',
      `s3://${bucket}/releases/${release}/`,
      directory,
      '--only-show-errors',
    ])
  }
  await verifyArtifact(directory)

  // Preserve old hashed assets and releases. Never sync --delete into the bucket.
  if (!values.rollback) {
    const existing = aws(
      [
        's3api',
        'list-objects-v2',
        '--bucket',
        bucket,
        '--prefix',
        `releases/${release}/`,
        '--max-keys',
        '1',
      ],
      true,
    )
    if (existing.KeyCount > 0)
      throw new Error(
        'Release already exists; use a new RELEASE_ID or --rollback',
      )
    aws([
      's3',
      'sync',
      directory,
      `s3://${bucket}/releases/${release}/`,
      '--cache-control',
      'no-store',
      '--exclude',
      'images/README.md',
      '--only-show-errors',
    ])
  }
  aws([
    's3',
    'sync',
    join(directory, 'assets'),
    `s3://${bucket}/assets/`,
    '--cache-control',
    'public,max-age=31536000,immutable',
    '--only-show-errors',
  ])
  aws([
    's3',
    'cp',
    directory,
    `s3://${bucket}/`,
    '--recursive',
    '--exclude',
    'index.html',
    '--exclude',
    'assets/*',
    '--exclude',
    'images/README.md',
    '--cache-control',
    'no-cache,max-age=0,must-revalidate',
    '--only-show-errors',
  ])
  // Publish the entry point last so a partially uploaded release is never referenced.
  aws([
    's3api',
    'put-object',
    '--bucket',
    bucket,
    '--key',
    'index.html',
    '--body',
    join(directory, 'index.html'),
    '--content-type',
    'text/html; charset=utf-8',
    '--cache-control',
    'no-cache,max-age=0,must-revalidate',
  ])
  const invalidation = aws(
    [
      'cloudfront',
      'create-invalidation',
      '--distribution-id',
      distribution,
      '--paths',
      '/',
      '/index.html',
      '/images/*',
    ],
    true,
  ).Invalidation.Id
  console.log(
    `Published ${release}; invalidation ${invalidation}; https://${current.DomainName}`,
  )
  aws([
    'cloudfront',
    'wait',
    'invalidation-completed',
    '--distribution-id',
    distribution,
    '--id',
    invalidation,
  ])
  console.log(`Deployment complete: ${release}`)
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
