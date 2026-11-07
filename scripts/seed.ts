import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Load .env before importing the Payload config — the db adapter reads
// DATABASE_URI while the config module is evaluated.
try {
  process.loadEnvFile()
} catch {
  // no .env file; rely on real environment variables
}

const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config')

const dirname = path.dirname(fileURLToPath(import.meta.url))

const payload = await getPayload({ config })

// The app requires a 'mi-espacio' workspace before the first account can be
// created (see Users.afterChange). Seed it once with placeholder figures —
// update the real values afterwards in /admin → "Espacios financieros".
const existing = await payload.find({
  collection: 'finance-workspaces',
  where: { key: { equals: 'mi-espacio' } },
  limit: 1,
  overrideAccess: true,
})

if (!existing.docs.length) {
  const history = JSON.parse(
    readFileSync(path.join(dirname, '../src/private/history.json'), 'utf8'),
  )
  await payload.create({
    collection: 'finance-workspaces',
    overrideAccess: true,
    data: {
      name: 'Mi espacio',
      key: 'mi-espacio',
      openingCash: 0,
      balanceConfirmedOn: new Date().toISOString(),
      monthlyIncome: 0,
      motoPrincipal: 13850000,
      motoMarketValue: 13850000,
      motoRate: 0,
      nuAdvance: 2065000,
      operationalStart: '2026-11',
      history,
    },
  })
  console.log('Seeded finance workspace "mi-espacio". Update its figures in /admin.')
} else {
  console.log('Workspace "mi-espacio" already exists, skipping.')
}

// Optionally create the first admin panel user:
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=... pnpm seed
const adminEmail = process.env.ADMIN_EMAIL
const adminPassword = process.env.ADMIN_PASSWORD
if (adminEmail && adminPassword) {
  const admins = await payload.count({ collection: 'admins', overrideAccess: true })
  if (admins.totalDocs === 0) {
    await payload.create({
      collection: 'admins',
      overrideAccess: true,
      data: { email: adminEmail, password: adminPassword },
    })
    console.log(`Created admin user ${adminEmail}.`)
  } else {
    console.log('An admin already exists, skipping.')
  }
} else {
  console.log('Set ADMIN_EMAIL and ADMIN_PASSWORD to also create the first admin.')
}

process.exit(0)
