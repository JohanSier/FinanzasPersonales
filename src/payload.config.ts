import path from 'path'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { mcpPlugin } from '@payloadcms/plugin-mcp'
import { en as adminLanguage } from '@payloadcms/translations/languages/en'
import { fileURLToPath } from 'url'
import { Admins } from './collections/Admins'
import { Users } from './collections/Users'
import {
  FinanceWorkspaces,
  RecurringExpenses,
  FinancialGoals,
  Receivables,
  FinanceMonths,
  FinanceMovements,
} from './collections/Finance'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Admins.slug,
    constrainWidth: true,
    dashboard: {
      widgets: [],
      defaultLayout: [
        { widgetSlug: 'activity', width: 'full' },
        { widgetSlug: 'collections', width: 'full' },
      ],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  i18n: {
    fallbackLanguage: 'en',
    supportedLanguages: { en: adminLanguage },
  },
  collections: [
    Admins,
    Users,
    FinanceWorkspaces,
    RecurringExpenses,
    FinancialGoals,
    Receivables,
    FinanceMonths,
    FinanceMovements,
  ],
  db: postgresAdapter({
    // Supabase already provides the database; don't try to create one.
    disableCreateDatabase: true,
    // Auto-sync the schema on boot. This app is small enough that migrations
    // aren't worth the overhead — Payload pushes table changes directly.
    push: true,
    pool: {
      connectionString: process.env.DATABASE_URI,
    },
  }),
  secret: process.env.PAYLOAD_SECRET || '',
  serverURL: process.env.SITE_URL || 'http://localhost:3000',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  localization: {
    locales: [{ code: 'en', label: 'English' }],
    fallback: true,
    defaultLocale: 'en',
  },
  plugins: [mcpPlugin({})],
})
