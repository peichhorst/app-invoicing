import { config as loadEnv } from 'dotenv'
import { defineConfig } from 'prisma/config'

loadEnv({ path: '.env.local' })
loadEnv()

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL || process.env.DIRECT_URL || '',
  },
})
