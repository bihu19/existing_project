# CRM Project

Lightweight CRM for small consulting firms, built with Next.js 16, React 19, Prisma ORM, and PostgreSQL.

## Project Structure

- `crm/` — Main Next.js application

## Deployment

**Platform:** Vercel

### Setup

1. Connect the GitHub repo to Vercel
2. Set the **Root Directory** to `crm` in Vercel project settings
3. Vercel auto-detects Next.js — no build command overrides needed
4. Set the following environment variables in Vercel dashboard:
   - `DATABASE_URL` — PostgreSQL connection string (e.g. from Vercel Postgres, Neon, or Supabase)
   - `SESSION_SECRET` — random secret string for session encryption
   - `APP_DOMAIN` — production URL (e.g. `https://your-app.vercel.app`)
5. Prisma generate runs automatically via the `postinstall` script

### Database

- **Provider:** PostgreSQL (required for serverless — SQLite is not supported on Vercel)
- **ORM:** Prisma 5.22
- Run migrations: `npx prisma migrate deploy`
- Create admin user: `npx tsx scripts/create-admin.ts`

### Local Development

```bash
cd crm
cp .env.example .env    # then edit with your local PostgreSQL URL
npm install
npx prisma migrate dev
npm run dev
```

## Key Commands

- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run db:generate` — Regenerate Prisma client
- `npm run db:push` — Push schema to database
- `npm run db:migrate` — Run migrations
- `npm run db:studio` — Open Prisma Studio
- `npm run create-admin` — Create admin user
