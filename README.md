# Eduhistory LMS

Eduhistory - to'liq o'zbek tilidagi LMS platforma skeleti.

## Stack

- Frontend: Next.js (App Router), TypeScript, TailwindCSS, shadcn-style UI komponentlar
- Backend: Next.js Route Handlers (monolit arxitektura)
- DB: PostgreSQL + Prisma
- Auth: NextAuth (Credentials + optional Google)
- Analytics: Recharts
- Validatsiya: Zod + React Hook Form
- Test: Vitest (minimal unit)
- DevOps: Docker Compose

## Tezkor ishga tushirish (lokal)

1. Env fayl yaratish:

```bash
cp .env.example .env
```

`POSTGRES_PORT` default `5433` ga qo'yilgan (5432 port band bo'lsa xatolik bermasligi uchun).

2. PostgreSQL ni ishga tushirish (Docker orqali):

```bash
docker compose up -d postgres
```

3. Dependency o'rnatish:

```bash
npm install
```

4. Prisma client + schema:

```bash
npm run prisma:generate
npm run db:push
```

5. Seed data:

```bash
npm run prisma:seed
```

6. App ni ishga tushirish:

```bash
npm run dev
```

App: `http://localhost:3000`

## Demo foydalanuvchilar (seed)

- Admin: `admin@eduhistory.uz` / `Eduhistory2026!`
- Ustoz: `ustoz@eduhistory.uz` / `Eduhistory2026!`
- Talaba: `talaba@eduhistory.uz` / `Eduhistory2026!`

## Docker bilan to'liq ishga tushirish

```bash
docker compose up --build
```

## Muhim route'lar

- Public: `/`, `/kurslar`, `/kurslar/[slug]`, `/sertifikat/[uuid]`
- Auth: `/kirish`, `/royxatdan-otish`
- Student: `/dashboard`, `/mening-kurslarim`, `/player/[courseId]`, `/quiz/[attemptId]`, `/natijalar/[attemptId]`, `/sertifikatlar`
- Admin/Ustoz: `/boshqaruv`, `/boshqaruv/kurslar`, `/boshqaruv/analitika`, ...

## Hozirgi bosqich holati

Bu commit birinchi bosqichni qoplaydi:

- Arxitektura va papkalar strukturasi
- Prisma schema (LMS uchun asosiy entitylar)
- Auth/RBAC/rate-limit/storage abstraction poydevori
- Asosiy UI route skeletonlar (100% uzbekcha)
- API skeletonlar (kurslar, quiz urinish, sertifikat verify/generate, analytics export)
- Seed script va docker compose

Keyingi bosqichda CRUD, real gating logikasi, full analytics UI va qo'shimcha testlar chuqurlashtiriladi.
